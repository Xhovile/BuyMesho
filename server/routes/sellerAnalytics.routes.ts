import type { Express } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { createSellerDisputeResolutionRouter } from "./sellerDisputeResolution.routes.js";

export type SellerAnalyticsRouteDeps = {
  db: any;
};

export function registerSellerAnalyticsRoutes(
  app: Express,
  deps: SellerAnalyticsRouteDeps,
) {
  const { db } = deps;

  app.use("/api/seller/disputes", createSellerDisputeResolutionRouter(requireAuth));

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
        .get(uid) as
        | {
            uid: string;
            business_name: string | null;
            profile_views: number | string | null;
            is_seller: number | string;
            is_suspended: number | string;
          }
        | undefined;

      if (!seller) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      if (Number(seller.is_seller) !== 1) {
        return res.status(403).json({ error: "Seller access required" });
      }

      if (Number(seller.is_suspended) === 1) {
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
              quantity,
              sold_quantity,
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
        id: number | string;
        name: string | null;
        views_count: number | string | null;
        status: string | null;
        quantity: number | string | null;
        sold_quantity: number | string | null;
        university: string | null;
        created_at: string | null;
      }>;

      const isSoldOut = (listing: (typeof listings)[number]) =>
        String(listing.status ?? "").toLowerCase() === "sold" ||
        Number(listing.sold_quantity ?? 0) >= Number(listing.quantity ?? 0);

      const totalListings = listings.length;
      const soldListings = listings.filter(isSoldOut).length;
      const activeListings = totalListings - soldListings;
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

  app.post("/api/listings/:id/view", (req, res) => {
    const listingId = Number(req.params.id);
    if (!Number.isInteger(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    try {
      const result = db
        .prepare(
          `
            UPDATE listings
            SET views_count = COALESCE(views_count, 0) + 1
            WHERE id = ?
              AND deleted_at IS NULL
              AND COALESCE(is_hidden, 0) = 0
          `,
        )
        .run(listingId);

      const changed = Number(result?.changes ?? result?.rowCount ?? 0);
      if (changed < 1) {
        return res.status(404).json({ error: "Listing not found" });
      }

      const row = db
        .prepare(
          `
            SELECT views_count
            FROM listings
            WHERE id = ?
            LIMIT 1
          `,
        )
        .get(listingId) as { views_count?: number | string | null } | undefined;

      return res.json({
        success: true,
        views_count: Number(row?.views_count ?? 0),
      });
    } catch (error) {
      console.error("Failed to track listing view", error);
      return res.status(500).json({ error: "Failed to track listing view" });
    }
  });
}
