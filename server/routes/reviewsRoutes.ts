import type { Express, NextFunction, Request, Response } from "express";
import multer from "multer";
import { postgresDb as db } from "../db.js";
import { attachOptionalAuth, requireAuth } from "../middleware/requireAuth.js";
import { REVIEW_MEDIA_MAX_COUNT, validateReviewMediaFiles } from "../lib/reviewMedia.js";
import { deleteCloudinaryAsset, uploadBufferToCloudinaryReviewMedia } from "../lib/cloudinaryUpload.js";

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
  deleted_at?: string | null;
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
  reviewer_logo?: string | null;
  reviewer_is_verified?: number | null;
};

type ReviewMediaRow = {
  id: number;
  review_id: number;
  listing_id: number;
  media_type: "image" | "video";
  url: string;
  public_id: string;
  resource_type: "image" | "video";
  created_at: string;
};

const MAX_REVIEW_MEDIA = REVIEW_MEDIA_MAX_COUNT;
const MAX_REVIEW_IMAGES = 3;
const MAX_REVIEW_VIDEOS = 1;
const MAX_REVIEW_MEDIA_FILE_SIZE = 10 * 1024 * 1024;

const reviewMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_REVIEW_MEDIA,
    fileSize: MAX_REVIEW_MEDIA_FILE_SIZE,
  },
}).array("media", MAX_REVIEW_MEDIA);

const ROUTES_INSTALLED_FLAG = Symbol.for("buymesho.reviewsRoutesInstalled");
let reviewsSchemaEnsured = false;

function ensureReviewsSchema() {
  if (reviewsSchemaEnsured) return;

  try {
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

      CREATE TABLE IF NOT EXISTS listing_review_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id INTEGER NOT NULL,
        listing_id INTEGER NOT NULL,
        media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
        url TEXT NOT NULL,
        public_id TEXT NOT NULL,
        resource_type TEXT NOT NULL CHECK (resource_type IN ('image', 'video')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(review_id) REFERENCES listing_reviews(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_listing_review_media_review_id
      ON listing_review_media (review_id, created_at ASC);
    `);

    reviewsSchemaEnsured = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Review schema init skipped because the database is unavailable: ${message}`);
    reviewsSchemaEnsured = true;
  }
}

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

function getReviewMedia(reviewId: number) {
  return db
    .prepare(
      `
        SELECT id, review_id, listing_id, media_type, url, public_id, resource_type, created_at
        FROM listing_review_media
        WHERE review_id = ?
        ORDER BY created_at ASC, id ASC
      `
    )
    .all(reviewId) as ReviewMediaRow[];
}

function getReviewMediaForIds(reviewIds: number[]) {
  const ids = [...new Set(reviewIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const grouped = new Map<number, ReviewMediaRow[]>();
  if (!ids.length) return grouped;

  const placeholders = ids.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
        SELECT id, review_id, listing_id, media_type, url, public_id, resource_type, created_at
        FROM listing_review_media
        WHERE review_id IN (${placeholders})
        ORDER BY created_at ASC, id ASC
      `
    )
    .all(...ids) as ReviewMediaRow[];

  for (const row of rows) {
    const key = Number(row.review_id);
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  return grouped;
}

function serializeReview(row: ReviewRow, mediaRows?: ReviewMediaRow[]) {
  const media = mediaRows ?? getReviewMedia(row.id);
  return {
    id: row.id,
    listing_id: row.listing_id,
    seller_uid: row.seller_uid,
    reviewer_uid: row.reviewer_uid,
    reviewer_name: getReviewerDisplayName(row),
    reviewer_email: row.reviewer_email,
    reviewer_avatar_url: row.reviewer_logo || null,
    reviewer_badge: row.is_verified_purchase ? "Verified buyer" : null,
    rating: row.rating,
    title: row.title,
    body: row.body,
    media: media.map((item) => ({
      id: Number(item.id),
      review_id: Number(item.review_id),
      media_type: item.media_type,
      url: item.url,
    })),
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
    .get(listingId) as { ratingCount?: number | string; averageRating?: number | string; latestReviewAt?: string | null } | undefined;

  const distributionRows = db
    .prepare(
      `
        SELECT rating AS stars, COUNT(*) AS count
        FROM listing_reviews
        WHERE listing_id = ? AND is_hidden = 0
        GROUP BY rating
      `
    )
    .all(listingId) as Array<{ stars: number; count: number | string }>;

  const ratingCount = Number(summaryRow?.ratingCount ?? 0);
  const averageRating = ratingCount > 0 ? Number(Number(summaryRow?.averageRating ?? 0).toFixed(1)) : 0;
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
    .prepare(`SELECT id, seller_uid, is_hidden, deleted_at FROM listings WHERE id = ? LIMIT 1`)
    .get(listingId) as ListingRow | undefined;
}

function getReviewByListingAndReviewer(listingId: number, reviewerUid: string) {
  return db
    .prepare(
      `
        SELECT
          lr.*,
          s.business_name AS reviewer_business_name,
          s.business_logo AS reviewer_logo,
          s.is_verified AS reviewer_is_verified
        FROM listing_reviews lr
        LEFT JOIN sellers s ON s.uid = lr.reviewer_uid
        WHERE lr.listing_id = ? AND lr.reviewer_uid = ? AND lr.is_hidden = 0
        LIMIT 1
      `
    )
    .get(listingId, reviewerUid) as ReviewRow | undefined;
}

function getReviewById(listingId: number, reviewId: number) {
  return db
    .prepare(
      `
        SELECT
          lr.*,
          s.business_name AS reviewer_business_name,
          s.business_logo AS reviewer_logo,
          s.is_verified AS reviewer_is_verified
        FROM listing_reviews lr
        LEFT JOIN sellers s ON s.uid = lr.reviewer_uid
        WHERE lr.listing_id = ? AND lr.id = ? AND lr.is_hidden = 0
        LIMIT 1
      `
    )
    .get(listingId, reviewId) as ReviewRow | undefined;
}

function getListingReviews(listingId: number, limit: number, offset: number) {
  return db
    .prepare(
      `
        SELECT
          lr.*,
          s.business_name AS reviewer_business_name,
          s.business_logo AS reviewer_logo,
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
    .get(listingId) as { total?: number | string } | undefined;
  return Number(row?.total ?? 0);
}

function canUserReplyToListing(listing: ListingRow, user: VerifiedRequestUser) {
  return user.is_admin || listing.seller_uid === user.uid;
}

function canUserReviewListing(listing: ListingRow, user?: VerifiedRequestUser | undefined) {
  return !!user && user.uid !== listing.seller_uid;
}

function reviewError(res: Response, status: number, error: string) {
  return res.status(status).json({ error });
}

function parseReviewMediaIds(value: unknown): number[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(
      parsed
        .map((id) => Number(id))
        .filter((id): id is number => Number.isInteger(id) && id > 0)
    )];
  } catch {
    throw new Error("Invalid existing media selection");
  }
}

function parseUploadedReviewMedia(req: Request) {
  const files = Array.isArray(req.files) ? req.files : [];
  const validationError = validateReviewMediaFiles(
    files.map((file) => ({ mimetype: file.mimetype, size: file.size })),
  );
  if (validationError) throw new Error(validationError);

  const imageCount = files.filter((file) => String(file.mimetype || "").toLowerCase().startsWith("image/")).length;
  const videoCount = files.filter((file) => String(file.mimetype || "").toLowerCase().startsWith("video/")).length;

  if (imageCount > MAX_REVIEW_IMAGES) throw new Error("A review can contain up to 3 images.");
  if (videoCount > MAX_REVIEW_VIDEOS) throw new Error("A review can contain only 1 video.");

  return files;
}

async function replaceReviewMedia(reviewId: number, listingId: number, files: Express.Multer.File[], existingMediaIdsToKeep: number[]) {
  const existing = getReviewMedia(reviewId);
  const existingIds = new Set(existing.map((media) => media.id));
  const unknownIds = existingMediaIdsToKeep.filter((id) => !existingIds.has(id));
  if (unknownIds.length > 0) throw new Error("One or more selected review media items are invalid.");

  const retained = existing.filter((media) => existingMediaIdsToKeep.includes(media.id));
  const newImageCount = files.filter((file) => String(file.mimetype || "").toLowerCase().startsWith("image/")).length;
  const newVideoCount = files.filter((file) => String(file.mimetype || "").toLowerCase().startsWith("video/")).length;

  if (retained.length + files.length > MAX_REVIEW_MEDIA) throw new Error("A review can contain up to 3 media items.");
  if (retained.filter((media) => media.media_type === "image").length + newImageCount > MAX_REVIEW_IMAGES) {
    throw new Error("A review can contain up to 3 images.");
  }
  if (retained.filter((media) => media.media_type === "video").length + newVideoCount > MAX_REVIEW_VIDEOS) {
    throw new Error("A review can contain only 1 video.");
  }

  const uploaded: Array<ReviewMediaRow> = [];

  try {
    for (const file of files) {
      const asset = await uploadBufferToCloudinaryReviewMedia(
        { buffer: file.buffer, mimetype: String(file.mimetype || "").toLowerCase() },
        { folder: "buymesho/reviews" },
      );
      uploaded.push({
        id: 0,
        review_id: reviewId,
        listing_id: listingId,
        media_type: asset.resourceType === "video" ? "video" : "image",
        url: asset.secureUrl,
        public_id: asset.publicId,
        resource_type: asset.resourceType === "video" ? "video" : "image",
        created_at: new Date().toISOString(),
      });
    }

    const removed = existing.filter((media) => !existingMediaIdsToKeep.includes(media.id));

    db.exec("BEGIN");
    try {
      db.prepare(
        `DELETE FROM listing_review_media WHERE review_id = ?`
      ).run(reviewId);

      for (const media of retained.concat(uploaded)) {
        db.prepare(
          `
            INSERT INTO listing_review_media (
              review_id, listing_id, media_type, url, public_id, resource_type, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `
        ).run(
          media.review_id,
          media.listing_id,
          media.media_type,
          media.url,
          media.public_id,
          media.resource_type,
        );
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    for (const media of removed) {
      try {
        await deleteCloudinaryAsset({
          publicId: media.public_id,
          resourceType: media.resource_type,
        });
      } catch (error) {
        console.warn("Failed to delete replaced review media from Cloudinary", {
          reviewId,
          mediaId: media.id,
          error,
        });
      }
    }

    return getReviewMedia(reviewId);
  } catch (error) {
    await Promise.all(
      uploaded.map((media) =>
        deleteCloudinaryAsset({
          publicId: media.public_id,
          resourceType: media.resource_type,
        }).catch((cleanupError) => {
          console.warn("Failed to clean up uploaded review media", cleanupError);
        })
      )
    );
    throw error;
  }
}


async function listListingReviewsHandler(req: Request, res: Response) {
  const listingId = Number(req.params.listingId);
  if (!Number.isInteger(listingId)) {
    return reviewError(res, 400, "Invalid listing id");
  }

  const listing = getListingById(listingId);
  if (!listing || listing.is_hidden || listing.deleted_at) {
    return reviewError(res, 404, "Listing not found");
  }

  const limit = clampInt(req.query.limit, 3, 1, 20);
  const offset = clampInt(req.query.offset, 0, 0, 100000);
  const total = getReviewsTotal(listingId);
  const summary = getListingReviewSummary(listingId);
  const itemRows = getListingReviews(listingId, limit, offset);
  const mediaByReviewId = getReviewMediaForIds(itemRows.map((row) => Number(row.id)));
  const items = itemRows.map((row) => serializeReview(row, mediaByReviewId.get(Number(row.id)) ?? []));

  let viewerReview: ReturnType<typeof serializeReview> | null = null;
  const user = req.user as VerifiedRequestUser | undefined;
  if (user) {
    const mine = getReviewByListingAndReviewer(listingId, user.uid);
    viewerReview = mine ? serializeReview(mine) : null;
  }

  return res.json({
    listing: {
      id: listing.id,
      seller_uid: listing.seller_uid,
      is_hidden: !!listing.is_hidden,
      deleted_at: listing.deleted_at ?? null,
    },
    summary,
    items,
    reviews: items,
    viewerReview,
    canReview: canUserReviewListing(listing, user),
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + items.length < total,
    },
  });
}

async function createListingReviewHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) {
    return reviewError(res, 401, "Authentication required");
  }

  const listingId = Number(req.params.listingId);
  if (!Number.isInteger(listingId)) {
    return reviewError(res, 400, "Invalid listing id");
  }

  const listing = getListingById(listingId);
  if (!listing || listing.is_hidden || listing.deleted_at) {
    return reviewError(res, 404, "Listing not found");
  }

  if (!canUserReviewListing(listing, user)) {
    return reviewError(res, 403, "You cannot review your own listing");
  }

  const rating = clampInt(req.body?.rating, 0, 1, 5);
  if (!rating) {
    return reviewError(res, 400, "Rating must be between 1 and 5");
  }

  const title = normalizeText(req.body?.title, 120);
  const body = normalizeText(req.body?.body, 2000);

  let existingMediaIdsToKeep: number[] = [];
  let uploadedFiles: Express.Multer.File[] = [];

  try {
    existingMediaIdsToKeep = parseReviewMediaIds(req.body?.existingMediaIds);
    uploadedFiles = parseUploadedReviewMedia(req);

    if (existingMediaIdsToKeep.length + uploadedFiles.length > MAX_REVIEW_MEDIA) {
      return reviewError(res, 400, "A review can contain up to 3 media items.");
    }

    const existingReview = getReviewByListingAndReviewer(listingId, user.uid);

    if (existingReview && req.body?.existingMediaIds === undefined && uploadedFiles.length === 0) {
      existingMediaIdsToKeep = getReviewMedia(existingReview.id).map((media) => media.id);
    }

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
          is_verified_purchase,
          seller_reply,
          seller_reply_at,
          is_hidden,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(listing_id, reviewer_uid) DO UPDATE SET
          rating = excluded.rating,
          title = excluded.title,
          body = excluded.body,
          updated_at = CURRENT_TIMESTAMP
      `
    ).run(
      listingId,
      listing.seller_uid,
      user.uid,
      user.email ?? null,
      user.email || "Member",
      rating,
      title,
      body
    );

    const updated = getReviewByListingAndReviewer(listingId, user.uid);
    if (updated) {
      await replaceReviewMedia(updated.id, listingId, uploadedFiles, existingMediaIdsToKeep);
    }

    const finalReview = updated ? getReviewByListingAndReviewer(listingId, user.uid) : null;
    return res.status(201).json({ success: true, review: finalReview ? serializeReview(finalReview) : null });
  } catch (error) {
    console.error("POST /api/listings/:listingId/reviews error:", error);
    return reviewError(res, 400, error instanceof Error ? error.message : "Failed to save review");
  }
}

async function updateListingReviewHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) {
    return reviewError(res, 401, "Authentication required");
  }

  const listingId = Number(req.params.listingId);
  if (!Number.isInteger(listingId)) {
    return reviewError(res, 400, "Invalid listing id");
  }

  const review = getReviewByListingAndReviewer(listingId, user.uid);
  if (!review) {
    return reviewError(res, 404, "Review not found");
  }

  const rating = clampInt(req.body?.rating, review.rating, 1, 5);
  const title = normalizeText(req.body?.title, 120);
  const body = normalizeText(req.body?.body, 2000);

  try {
    let existingMediaIdsToKeep = parseReviewMediaIds(req.body?.existingMediaIds);
    const uploadedFiles = parseUploadedReviewMedia(req);

    if (req.body?.existingMediaIds === undefined && uploadedFiles.length === 0) {
      existingMediaIdsToKeep = getReviewMedia(review.id).map((media) => media.id);
    }

    if (existingMediaIdsToKeep.length + uploadedFiles.length > MAX_REVIEW_MEDIA) {
      return reviewError(res, 400, "A review can contain up to 3 media items.");
    }

    db.prepare(
      `
        UPDATE listing_reviews
        SET rating = ?, title = ?, body = ?, updated_at = CURRENT_TIMESTAMP
        WHERE listing_id = ? AND reviewer_uid = ?
      `
    ).run(rating, title, body, listingId, user.uid);

    await replaceReviewMedia(review.id, listingId, uploadedFiles, existingMediaIdsToKeep);

    const updated = getReviewByListingAndReviewer(listingId, user.uid);
    return res.json({ success: true, review: updated ? serializeReview(updated) : null });
  } catch (error) {
    console.error("PUT /api/listings/:listingId/reviews error:", error);
    return reviewError(res, 400, error instanceof Error ? error.message : "Failed to update review");
  }
}

async function saveSellerReplyHandler(req: Request, res: Response, review: ReviewRow, listingId: number) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) {
    return reviewError(res, 401, "Authentication required");
  }

  const listing = getListingById(listingId);
  if (!listing) {
    return reviewError(res, 404, "Listing not found");
  }

  if (!canUserReplyToListing(listing, user)) {
    return reviewError(res, 403, "You cannot reply to this review");
  }

  const rawReply = typeof req.body?.reply === "string" ? req.body.reply : "";
  const trimmedReply = rawReply.trim();
  const normalizedReply = trimmedReply ? trimmedReply.slice(0, 2000) : null;

  try {
    db.prepare(
      `
        UPDATE listing_reviews
        SET seller_reply = ?, seller_reply_at = CASE WHEN COALESCE(?, '') = '' THEN NULL ELSE CURRENT_TIMESTAMP END, updated_at = CURRENT_TIMESTAMP
        WHERE listing_id = ? AND reviewer_uid = ?
      `
    ).run(normalizedReply, normalizedReply, listingId, review.reviewer_uid);

    const updated = getReviewByListingAndReviewer(listingId, review.reviewer_uid);
    return res.json({ success: true, review: updated ? serializeReview(updated) : null });
  } catch (error) {
    console.error("POST /api/listings/:listingId/reviews/reply error:", error);
    return reviewError(res, 500, "Failed to save seller reply");
  }
}

async function replyToListingReviewHandler(req: Request, res: Response) {
  const listingId = Number(req.params.listingId);
  if (!Number.isInteger(listingId)) {
    return reviewError(res, 400, "Invalid listing id");
  }

  const listing = getListingById(listingId);
  if (!listing) {
    return reviewError(res, 404, "Listing not found");
  }

  const reviewerUid = typeof req.body?.reviewerUid === "string" ? req.body.reviewerUid : "";
  const review = getReviewByListingAndReviewer(listingId, reviewerUid);
  if (!review) {
    return reviewError(res, 404, "Review not found");
  }

  return saveSellerReplyHandler(req, res, review, listingId);
}

async function replyToListingReviewByIdHandler(req: Request, res: Response) {
  const listingId = Number(req.params.listingId);
  const reviewId = Number(req.params.reviewId);

  if (!Number.isInteger(listingId) || !Number.isInteger(reviewId)) {
    return reviewError(res, 400, "Invalid review id");
  }

  const review = getReviewById(listingId, reviewId);
  if (!review) {
    return reviewError(res, 404, "Review not found");
  }

  return saveSellerReplyHandler(req, res, review, listingId);
}

export function registerReviewsRoutes(app: Express) {
  if ((app as any)[ROUTES_INSTALLED_FLAG]) return;

  ensureReviewsSchema();

  const parseReviewMedia = (req: Request, res: Response, next: NextFunction) => {
    reviewMediaUpload(req, res, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return reviewError(res, 400, "Each review media file must be 10 MB or smaller.");
        }
        if (error.code === "LIMIT_FILE_COUNT") {
          return reviewError(res, 400, "A review can contain up to 3 media items.");
        }
        return reviewError(res, 400, error.message);
      }
      return reviewError(res, 400, error instanceof Error ? error.message : "Invalid review media upload");
    });
  };

  app.get("/api/listings/:listingId/reviews", attachOptionalAuth, (req, res) => void listListingReviewsHandler(req, res));
  app.post("/api/listings/:listingId/reviews", requireAuth, parseReviewMedia, (req, res) => void createListingReviewHandler(req, res));
  app.put("/api/listings/:listingId/reviews", requireAuth, parseReviewMedia, (req, res) => void updateListingReviewHandler(req, res));
  app.post("/api/listings/:listingId/reviews/reply", requireAuth, (req, res) => void replyToListingReviewHandler(req, res));
  app.patch("/api/listings/:listingId/reviews/:reviewId/reply", requireAuth, (req, res) => void replyToListingReviewByIdHandler(req, res));

  (app as any)[ROUTES_INSTALLED_FLAG] = true;
}