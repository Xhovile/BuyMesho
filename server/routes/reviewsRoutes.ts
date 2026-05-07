import type { Express, NextFunction, Request, Response } from "express";
import Database from "better-sqlite3";
import { attachOptionalAuth, requireAuth } from "../middleware/requireAuth.js";

type VerifiedRequestUser = {
  uid: string;
  email: string | null;
  email_verified: boolean;
  is_admin: boolean;
};

type ListingRow = {
  id: number;
  seller_uid: string;
  is_hidden?: number;
};

type ReviewRow = {
  id: number;
  listing_id: number;
  seller_uid: string;
  reviewer_uid: string;
  reviewer_email: string | null;
  reviewer_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: number;
  seller_reply: string | null;
  seller_reply_at: string | null;
  is_hidden: number;
  created_at: string;
  updated_at: string | null;
  reviewer_business_name?: string | null;
  reviewer_profile_picture?: string | null;
  reviewer_logo?: string | null;
  reviewer_is_verified?: number | null;
};

const ROUTES_INSTALLED_FLAG = Symbol.for("buymesho.reviewsRoutesInstalled");
const db = new Database("market.db");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS listing_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    seller_uid TEXT NOT NULL,
    reviewer_uid TEXT NOT NULL,
    reviewer_email TEXT,
    reviewer_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    body TEXT,
    is_verified_purchase INTEGER NOT NULL DEFAULT 0,
    seller_reply TEXT,
    seller_reply_at DATETIME,
    is_hidden INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (listing_id, reviewer_uid)
  );

  CREATE INDEX IF NOT EXISTS idx_listing_reviews_listing_id
  ON listing_reviews (listing_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_listing_reviews_seller_uid
  ON listing_reviews (seller_uid, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_listing_reviews_reviewer_uid
  ON listing_reviews (reviewer_uid, created_at DESC);
`);

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function normalizeText(input: unknown, maxLength: number): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function getReviewerDisplayName(profile: {
  reviewer_name?: string | null;
  reviewer_business_name?: string | null;
  reviewer_email?: string | null;
}) {
  const stored = typeof profile.reviewer_name === "string" ? profile.reviewer_name.trim() : "";
  if (stored) return stored;

  const businessName = typeof profile.reviewer_business_name === "string" ? profile.reviewer_business_name.trim() : "";
  if (businessName) return businessName;

  const email = typeof profile.reviewer_email === "string" ? profile.reviewer_email.trim() : "";
  if (email && email.includes("@")) return email.split("@")[0] || "Member";

  return "Member";
}

function serializeReview(row: ReviewRow) {
  return {
    id: row.id,
    listing_id: row.listing_id,
    seller_uid: row.seller_uid,
    reviewer_uid: row.reviewer_uid,
    reviewer_name: getReviewerDisplayName(row),
    reviewer_email: row.reviewer_email,
    reviewer_avatar_url: row.reviewer_profile_picture || row.reviewer_logo || null,
    reviewer_badge: row.is_verified_purchase ? "Verified buyer" : null,
    rating: row.rating,
    title: row.title,
    body: row.body,
    seller_reply: row.seller_reply,
    seller_reply_at: row.seller_reply_at,
    is_verified_purchase: !!row.is_verified_purchase,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getListingReviewSummary(listingId: number) {
  const summaryRow = db
    .prepare(
      `
        SELECT
          COUNT(*) AS ratingCount,
          AVG(rating) AS averageRating,
          MAX(created_at) AS latestReviewAt
        FROM listing_reviews
        WHERE listing_id = ? AND is_hidden = 0
      `
    )
    .get(listingId) as { ratingCount?: number; averageRating?: number; latestReviewAt?: string | null } | undefined;

  const distributionRows = db
    .prepare(
      `
        SELECT rating AS stars, COUNT(*) AS count
        FROM listing_reviews
        WHERE listing_id = ? AND is_hidden = 0
        GROUP BY rating
      `
    )
    .all(listingId) as Array<{ stars: number; count: number }>;

  const ratingCount = Number(summaryRow?.ratingCount ?? 0);
  const averageRating = ratingCount > 0 ? Number((Number(summaryRow?.averageRating ?? 0)).toFixed(1)) : 0;
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const matched = distributionRows.find((row) => Number(row.stars) === stars);
    const count = Number(matched?.count ?? 0);
    return {
      stars,
      count,
      percentage: ratingCount > 0 ? Number(((count / ratingCount) * 100).toFixed(1)) : 0,
    };
  });

  return {
    averageRating,
    ratingCount,
    latestReviewAt: summaryRow?.latestReviewAt ?? null,
    distribution,
  };
}

function getListingById(listingId: number): ListingRow | undefined {
  return db
    .prepare(`SELECT id, seller_uid, is_hidden FROM listings WHERE id = ? LIMIT 1`)
    .get(listingId) as ListingRow | undefined;
}

function getViewerReview(listingId: number, reviewerUid: string) {
  return db
    .prepare(
      `
        SELECT
          lr.*,
          s.business_name AS reviewer_business_name,
          s.business_logo AS reviewer_logo,
          s.profile_picture AS reviewer_profile_picture,
          s.is_verified AS reviewer_is_verified
        FROM listing_reviews lr
        LEFT JOIN sellers s ON s.uid = lr.reviewer_uid
        WHERE lr.listing_id = ? AND lr.reviewer_uid = ? AND lr.is_hidden = 0
        LIMIT 1
      `
    )
    .get(listingId, reviewerUid) as ReviewRow | undefined;
}

function getListingReviews(listingId: number, limit: number, offset: number) {
  return db
    .prepare(
      `
        SELECT
          lr.*,
          s.business_name AS reviewer_business_name,
          s.business_logo AS reviewer_logo,
          s.profile_picture AS reviewer_profile_picture,
          s.is_verified AS reviewer_is_verified
        FROM listing_reviews lr
        LEFT JOIN sellers s ON s.uid = lr.reviewer_uid
        WHERE lr.listing_id = ? AND lr.is_hidden = 0
        ORDER BY lr.created_at DESC, lr.id DESC
        LIMIT ? OFFSET ?
      `
    )
    .all(listingId, limit, offset) as ReviewRow[];
}

function getReviewsTotal(listingId: number) {
  const row = db
    .prepare(`SELECT COUNT(*) AS total FROM listing_reviews WHERE listing_id = ? AND is_hidden = 0`)
    .get(listingId) as { total?: number } | undefined;
  return Number(row?.total ?? 0);
}

function canUserReplyToListing(listing: ListingRow, user: VerifiedRequestUser) {
  return user.is_admin || listing.seller_uid === user.uid;
}

function reviewError(res: Response, status: number, error: string) {
  return res.status(status).json({ error });
}

async function listListingReviewsHandler(req: Request, res: Response) {
  const listingId = Number(req.params.listingId);
  if (!Number.isInteger(listingId)) {
    return reviewError(res, 400, "Invalid listing id");
  }

  const listing = getListingById(listingId);
  if (!listing || listing.is_hidden) {
    return reviewError(res, 404, "Listing not found");
  }

  const limit = clampInt(req.query.limit, 3, 1, 20);
  const offset = clampInt(req.query.offset, 0, 0, 100000);
  const total = getReviewsTotal(listingId);
  const summary = getListingReviewSummary(listingId);
  const reviews = getListingReviews(listingId, limit, offset).map(serializeReview);

  const viewer = req.user as VerifiedRequestUser | undefined;
  const viewerReview = viewer ? getViewerReview(listingId, viewer.uid) : undefined;

  return res.json({
    summary,
    items: reviews,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + reviews.length < total,
    },
    viewerReview: viewerReview ? serializeReview(viewerReview) : null,
    canReview: !!viewer && viewer.uid !== listing.seller_uid,
  });
}

async function upsertListingReviewHandler(req: Request, res: Response) {
  const listingId = Number(req.params.listingId);
  if (!Number.isInteger(listingId)) {
    return reviewError(res, 400, "Invalid listing id");
  }

  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) {
    return reviewError(res, 401, "Authentication required");
  }

  const listing = getListingById(listingId);
  if (!listing || listing.is_hidden) {
    return reviewError(res, 404, "Listing not found");
  }

  if (listing.seller_uid === user.uid) {
    return reviewError(res, 403, "You cannot review your own listing");
  }

  const rating = Number((req.body as any)?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return reviewError(res, 400, "Rating must be between 1 and 5");
  }

  const title = normalizeText((req.body as any)?.title, 80);
  const body = normalizeText((req.body as any)?.body, 500);

  const reviewerProfile = db
    .prepare(`SELECT business_name, email FROM sellers WHERE uid = ? LIMIT 1`)
    .get(user.uid) as { business_name?: string | null; email?: string | null } | undefined;

  const reviewerName = getReviewerDisplayName({
    reviewer_name: reviewerProfile?.business_name ?? null,
    reviewer_business_name: reviewerProfile?.business_name ?? null,
    reviewer_email: reviewerProfile?.email ?? null,
  });

  db.prepare(
    `
      INSERT INTO listing_reviews (
        listing_id,
        seller_uid,
        reviewer_uid,
        reviewer_email,
        reviewer_name,
        rating,
        title,
        body,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(listing_id, reviewer_uid) DO UPDATE SET
        seller_uid = excluded.seller_uid,
        reviewer_email = excluded.reviewer_email,
        reviewer_name = excluded.reviewer_name,
        rating = excluded.rating,
        title = excluded.title,
        body = excluded.body,
        updated_at = CURRENT_TIMESTAMP
    `
  ).run(listingId, listing.seller_uid, user.uid, user.email, reviewerName, rating, title, body);

  const review = getViewerReview(listingId, user.uid);
  if (!review) {
    return reviewError(res, 500, "Failed to save review");
  }

  return res.status(201).json({
    success: true,
    review: serializeReview(review),
    summary: getListingReviewSummary(listingId),
  });
}

async function deleteMyListingReviewHandler(req: Request, res: Response) {
  const listingId = Number(req.params.listingId);
  if (!Number.isInteger(listingId)) {
    return reviewError(res, 400, "Invalid listing id");
  }

  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) {
    return reviewError(res, 401, "Authentication required");
  }

  const result = db
    .prepare(`DELETE FROM listing_reviews WHERE listing_id = ? AND reviewer_uid = ?`)
    .run(listingId, user.uid);

  if (!result.changes) {
    return reviewError(res, 404, "Review not found");
  }

  return res.json({
    success: true,
    summary: getListingReviewSummary(listingId),
  });
}

async function replyToListingReviewHandler(req: Request, res: Response) {
  const listingId = Number(req.params.listingId);
  const reviewId = Number(req.params.reviewId);

  if (!Number.isInteger(listingId) || !Number.isInteger(reviewId)) {
    return reviewError(res, 400, "Invalid review id");
  }

  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) {
    return reviewError(res, 401, "Authentication required");
  }

  const listing = getListingById(listingId);
  if (!listing || listing.is_hidden) {
    return reviewError(res, 404, "Listing not found");
  }

  if (!canUserReplyToListing(listing, user)) {
    return reviewError(res, 403, "Only the seller or an admin can reply to reviews");
  }

  const reply = normalizeText((req.body as any)?.reply, 500);

  const reviewExists = db
    .prepare(`SELECT id FROM listing_reviews WHERE id = ? AND listing_id = ? LIMIT 1`)
    .get(reviewId, listingId) as { id: number } | undefined;

  if (!reviewExists) {
    return reviewError(res, 404, "Review not found");
  }

  db.prepare(
    `
      UPDATE listing_reviews
      SET seller_reply = ?,
          seller_reply_at = CASE WHEN ? IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND listing_id = ?
    `
  ).run(reply, reply, reviewId, listingId);

  const updated = db
    .prepare(
      `
        SELECT
          lr.*,
          s.business_name AS reviewer_business_name,
          s.business_logo AS reviewer_logo,
          s.profile_picture AS reviewer_profile_picture,
          s.is_verified AS reviewer_is_verified
        FROM listing_reviews lr
        LEFT JOIN sellers s ON s.uid = lr.reviewer_uid
        WHERE lr.id = ? AND lr.listing_id = ?
        LIMIT 1
      `
    )
    .get(reviewId, listingId) as ReviewRow | undefined;

  if (!updated) {
    return reviewError(res, 500, "Failed to update review reply");
  }

  return res.json({
    success: true,
    review: serializeReview(updated),
    summary: getListingReviewSummary(listingId),
  });
}

export function registerReviewsRoutes(app: Express) {
  if ((app as any)[ROUTES_INSTALLED_FLAG]) return;

  app.get("/api/listings/:listingId/reviews", attachOptionalAuth, (req, res) => {
    void listListingReviewsHandler(req, res);
  });

  app.post("/api/listings/:listingId/reviews", requireAuth, (req, res) => {
    void upsertListingReviewHandler(req, res);
  });

  app.delete("/api/listings/:listingId/reviews/me", requireAuth, (req, res) => {
    void deleteMyListingReviewHandler(req, res);
  });

  app.patch("/api/listings/:listingId/reviews/:reviewId/reply", requireAuth, (req, res) => {
    void replyToListingReviewHandler(req, res);
  });

  (app as any)[ROUTES_INSTALLED_FLAG] = true;
}
