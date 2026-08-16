import type { Express, Request, Response } from "express";
import { serializeListingRow } from "../lib/listingHelpers.js";
import { requireAuth } from "../middleware/requireAuth.js";

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

  app.get("/api/seller/dashboard", requireAuth, (req, res) => {
    const uid = String(req.user?.uid ?? "").trim();
    if (!uid) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const seller = db
        .prepare(
          `
            SELECT uid, business_name, profile_views, is_seller, is_suspended
            FROM sellers
            WHERE uid = ?
            LIMIT 1
          `,
        )
        .get(uid);

      if (!seller) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      if (!Number(seller.is_seller)) {
        return res.status(403).json({ error: "Seller access required" });
      }

      if (Number(seller.is_suspended)) {
        return res.status(403).json({ error: "Seller account is suspended" });
      }

      const listings = db
        .prepare(
          `
            SELECT
              id,
              name,
              views_count,
              status,
              university,
              created_at
            FROM listings
            WHERE seller_uid = ?
              AND deleted_at IS NULL
              AND COALESCE(is_hidden, 0) = 0
            ORDER BY views_count DESC, created_at DESC
          `,
        )
        .all(uid) as Array<{
        id: number;
        name: string;
        views_count: number | string | null;
        status: string;
        university: string | null;
        created_at: string;
      }>;

      const totalListings = listings.length;
      const activeListings = listings.filter(
        (listing) => String(listing.status ?? "").toLowerCase() !== "sold",
      ).length;
      const soldListings = listings.filter(
        (listing) => String(listing.status ?? "").toLowerCase() === "sold",
      ).length;
      const totalViews = listings.reduce(
        (sum, listing) => sum + Number(listing.views_count ?? 0),
        0,
      );

      const byCampusMap = new Map<string, number>();
      for (const listing of listings) {
        const campus =
          typeof listing.university === "string" && listing.university.trim()
            ? listing.university.trim()
            : "Unknown campus";
        byCampusMap.set(campus, (byCampusMap.get(campus) ?? 0) + 1);
      }

      const byCampus = Array.from(byCampusMap.entries())
        .map(([university, count]) => ({ university, count }))
        .sort(
          (a, b) =>
            b.count - a.count || a.university.localeCompare(b.university),
        );

      const topListing = listings[0]
        ? {
            id: Number(listings[0].id),
            name: listings[0].name || "Untitled listing",
            views_count: Number(listings[0].views_count ?? 0),
            status: String(listings[0].status ?? "available"),
            created_at: String(listings[0].created_at ?? ""),
          }
        : null;

      return res.json({
        seller: {
          uid: seller.uid,
          business_name: seller.business_name ?? null,
          profile_views: Number(seller.profile_views ?? 0),
        },
        stats: {
          total_listings: totalListings,
          active_listings: activeListings,
          sold_listings: soldListings,
          total_views: totalViews,
          repeat_seller_activity: totalListings > 1 || soldListings > 0,
        },
        byCampus,
        top_listing: topListing,
      });
    } catch (error) {
      console.error("Failed to load seller dashboard", error);
      return res.status(500).json({ error: "Failed to load seller dashboard" });
    }
  });

  app.get("/api/sellers/:uid", (req, res) => {
    const uid = String(req.params.uid || "").trim();
    if (!uid) {
      return res.status(400).json({ error: "Invalid seller uid" });
    }

    try {
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

      const profile = normalizeSellerProfile(row);
      if (!profile) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      return res.json(profile);
    } catch (error) {
      console.error("Failed to load seller profile", error);
      return res.status(500).json({ error: "Failed to load seller profile" });
    }
  });

  app.get("/api/sellers/:uid/listings", (req, res) => {
    const uid = String(req.params.uid || "").trim();
    if (!uid) {
      return res.status(400).json({ error: "Invalid seller uid" });
    }

    try {
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

      return res.json(rows.map((row: any) => serializeListingRow(row)));
    } catch (error) {
      console.error("Failed to load seller listings", error);
      return res.status(500).json({ error: "Failed to load seller listings" });
    }
  });

  app.get("/api/sellers/:uid/rating-summary", (req, res) => {
    const uid = String(req.params.uid || "").trim();
    if (!uid) {
      return res.status(400).json({ error: "Invalid seller uid" });
    }

    try {
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

      return res.json({
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
      });
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

      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to remove seller rating", error);
      return res.status(500).json({ error: "Failed to remove seller rating" });
    }
  });
}
