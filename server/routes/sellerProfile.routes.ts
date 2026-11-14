import type { Express, Request, Response } from "express";
import { serializeListingRow } from "../lib/listingHelpers.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  getCachedPublicSellerDirectory,
  getCachedPublicSellerListings,
  getCachedPublicSellerProfile,
  getCachedPublicSellerRatingSummary,
  invalidatePublicSellerRatingData,
} from "../lib/publicSellerCache.js";

export type SellerProfileRouteDeps = {
  db: any;
};

function normalizeSellerProfile(row: any) {
  if (!row) return null;

  return {
    uid: row.uid,
    business_name: row.business_name ?? null,
    business_logo: row.business_logo ?? null,
    university: row.university ?? null,
    bio: row.bio ?? null,
    is_verified: !!row.is_verified,
    join_date: row.join_date ?? null,
    profile_views: Number(row.profile_views ?? 0),
  };
}

function getSellerDistribution(db: any, sellerUid: string) {
  const rows = db
    .prepare(
      `
        SELECT stars, COUNT(*) AS count
        FROM seller_ratings
        WHERE seller_uid = ?
        GROUP BY stars
        ORDER BY stars ASC
      `
    )
    .all(sellerUid) as Array<{ stars: number; count: number }>;

  const ratingCount = rows.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
  const totalStars = rows.reduce((sum, row) => sum + Number(row.stars ?? 0) * Number(row.count ?? 0), 0);
  const averageRating = ratingCount > 0 ? totalStars / ratingCount : 0;

  return {
    averageRating,
    ratingCount,
    myRating: null as number | null,
    distribution: [1, 2, 3, 4, 5].map((stars) => {
      const found = rows.find((row) => Number(row.stars) === stars);
      const count = Number(found?.count ?? 0);
      return {
        stars,
        count,
        percentage: ratingCount > 0 ? (count / ratingCount) * 100 : 0,
      };
    }),
  };
}

export function registerSellerProfileRoutes(app: Express, deps: SellerProfileRouteDeps) {
  const { db } = deps;

  app.get("/api/sellers", async (req, res) => {
    if (req.query.public !== undefined && req.query.public !== "true" && req.query.public !== "1") {
      return res.status(400).json({ error: "Invalid public sellers query" });
    }

    try {
      const payload = await getCachedPublicSellerDirectory(async () => {
        const rows = db
          .prepare(
            `
              SELECT
                s.uid,
                s.business_name,
                s.business_logo,
                s.bio,
                s.university,
                s.is_verified,
                s.join_date,
                s.profile_views,
                COALESCE((
                  SELECT COUNT(*)
                  FROM listings l
                  WHERE l.seller_uid = s.uid
                    AND l.is_hidden = 0
                    AND l.deleted_at IS NULL
                ), 0) AS listing_count,
                COALESCE((
                  SELECT AVG(sr.stars)
                  FROM seller_ratings sr
                  WHERE sr.seller_uid = s.uid
                ), 0) AS average_rating,
                COALESCE((
                  SELECT COUNT(*)
                  FROM seller_ratings sr
                  WHERE sr.seller_uid = s.uid
                ), 0) AS rating_count
              FROM sellers s
              WHERE s.is_seller = 1
              ORDER BY
                s.is_verified DESC,
                average_rating DESC,
                listing_count DESC,
                s.join_date DESC,
                s.uid ASC
            `
          )
          .all();

        return {
          items: rows,
          total: rows.length,
        };
      });

      return res.json(payload);
    } catch (error) {
      console.error("Failed to load public sellers", error);
      return res.status(500).json({ error: "Failed to load sellers" });
    }
  });

  app.get("/api/sellers/:uid", async (req, res) => {
    const uid = String(req.params.uid || "").trim();
    if (!uid) {
      return res.status(400).json({ error: "Invalid seller uid" });
    }

    try {
      const profile = await getCachedPublicSellerProfile(uid, async () => {
        const row = db
          .prepare(
            `
              SELECT uid, business_name, business_logo, university, bio, is_verified, join_date, profile_views
              FROM sellers
              WHERE uid = ? AND is_seller = 1
              LIMIT 1
            `
          )
          .get(uid);

        return normalizeSellerProfile(row);
      });

      if (!profile) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      return res.json(profile);
    } catch (error) {
      console.error("Failed to load seller profile", error);
      return res.status(500).json({ error: "Failed to load seller profile" });
    }
  });

  app.get("/api/sellers/:uid/listings", async (req, res) => {
    const uid = String(req.params.uid || "").trim();
    if (!uid) {
      return res.status(400).json({ error: "Invalid seller uid" });
    }

    try {
      const listings = await getCachedPublicSellerListings(uid, async () => {
        const rows = db
          .prepare(
            `
              SELECT l.*, s.business_name, s.business_logo, s.is_verified
              FROM listings l
              JOIN sellers s ON l.seller_uid = s.uid
              WHERE l.seller_uid = ?
                AND l.deleted_at IS NULL
                AND l.is_hidden = 0
              ORDER BY l.created_at DESC
            `
          )
          .all(uid);

        return rows.map((row: any) => serializeListingRow(row));
      });

      return res.json(listings);
    } catch (error) {
      console.error("Failed to load seller listings", error);
      return res.status(500).json({ error: "Failed to load seller listings" });
    }
  });

  app.get("/api/sellers/:uid/rating-summary", async (req, res) => {
    const uid = String(req.params.uid || "").trim();
    if (!uid) {
      return res.status(400).json({ error: "Invalid seller uid" });
    }

    try {
      const summary = await getCachedPublicSellerRatingSummary(uid, async () => {
        const distributionRows = db
          .prepare(
            `
              SELECT stars, COUNT(*) AS count
              FROM seller_ratings
              WHERE seller_uid = ?
              GROUP BY stars
              ORDER BY stars ASC
            `
          )
          .all(uid) as Array<{ stars: number; count: number }>;

        const ratingCount = distributionRows.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
        const totalStars = distributionRows.reduce((sum, row) => sum + Number(row.stars ?? 0) * Number(row.count ?? 0), 0);
        const averageRating = ratingCount > 0 ? totalStars / ratingCount : 0;

        return {
          averageRating,
          ratingCount,
          myRating: null,
          distribution: [1, 2, 3, 4, 5].map((stars) => {
            const found = distributionRows.find((row) => Number(row.stars) === stars);
            const count = Number(found?.count ?? 0);
            return {
              stars,
              count,
              percentage: ratingCount > 0 ? (count / ratingCount) * 100 : 0,
            };
          }),
        };
      });

      return res.json(summary);
    } catch (error) {
      console.error("Failed to load seller rating summary", error);
      return res.status(500).json({ error: "Failed to load seller rating summary" });
    }
  });

  app.post("/api/sellers/:uid/profile-view", (req, res) => {
    const uid = String(req.params.uid || "").trim();
    const viewerUid = typeof req.body?.viewer_uid === "string" ? req.body.viewer_uid.trim() : "";

    if (!uid) {
      return res.status(400).json({ error: "Invalid seller uid" });
    }

    if (viewerUid && viewerUid === uid) {
      return res.json({ skipped: true });
    }

    try {
      db.prepare(
        `
          UPDATE sellers
          SET profile_views = COALESCE(profile_views, 0) + 1
          WHERE uid = ?
        `
      ).run(uid);

      return res.json({ skipped: false });
    } catch (error) {
      console.error("Failed to track seller profile view", error);
      return res.status(500).json({ error: "Failed to track seller profile view" });
    }
  });

  app.post("/api/sellers/:uid/rating", requireAuth, (req, res) => {
    const uid = String(req.params.uid || "").trim();
    const stars = Number(req.body?.stars);
    const raterUid = req.user!.uid;

    if (!uid) {
      return res.status(400).json({ error: "Invalid seller uid" });
    }

    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ error: "Invalid rating" });
    }

    try {
      db.prepare(
        `
          INSERT INTO seller_ratings (seller_uid, rater_uid, stars)
          VALUES (?, ?, ?)
          ON CONFLICT(seller_uid, rater_uid) DO UPDATE SET
            stars = excluded.stars,
            updated_at = CURRENT_TIMESTAMP
        `
      ).run(uid, raterUid, stars);

      void invalidatePublicSellerRatingData(uid);
      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to save seller rating", error);
      return res.status(500).json({ error: "Failed to save seller rating" });
    }
  });

  app.delete("/api/sellers/:uid/rating", requireAuth, (req, res) => {
    const uid = String(req.params.uid || "").trim();
    const raterUid = req.user!.uid;

    if (!uid) {
      return res.status(400).json({ error: "Invalid seller uid" });
    }

    try {
      db.prepare(
        `
          DELETE FROM seller_ratings
          WHERE seller_uid = ? AND rater_uid = ?
        `
      ).run(uid, raterUid);

      void invalidatePublicSellerRatingData(uid);
      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to remove seller rating", error);
      return res.status(500).json({ error: "Failed to remove seller rating" });
    }
  });
}
