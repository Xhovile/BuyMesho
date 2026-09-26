import type { Express, NextFunction, Request, Response } from "express";
import multer from "multer";
import { postgresDb as db } from "../db.js";
import { attachOptionalAuth, requireAuth } from "../middleware/requireAuth.js";
import { REVIEW_MEDIA_MAX_COUNT, validateReviewMediaFiles } from "../lib/reviewMedia.js";
import { deleteCloudinaryAsset, uploadBufferToCloudinaryReviewMedia } from "../lib/cloudinaryUpload.js";
import { createIdempotencyMiddleware } from "../idempotency/middleware.js";
import { getFirebaseAdmin } from "../auth/firebaseAdmin.js";

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

function getStoredReviewerFallback(profile: {
  reviewer_name?: string | null;
  reviewer_email?: string | null;
}) {
  const stored = typeof profile.reviewer_name === "string" ? profile.reviewer_name.trim() : "";
  if (stored && !stored.includes("@")) return stored;

  const email = typeof profile.reviewer_email === "string" ? profile.reviewer_email.trim() : "";
  return email || stored || "Member";
}

type ReviewerIdentity = {
  name: string;
  avatarUrl: string | null;
};

function buildProfileDisplayName(profile: Record<string, unknown>): string {
  const directName =
    [profile.display_name, profile.displayName, profile.full_name]
      .map((value) => typeof value === "string" ? value.trim() : "")
      .find(Boolean) ?? "";

  if (directName) return directName;

  const composed = [profile.first_name, profile.other_names, profile.surname]
    .map((value) => typeof value === "string" ? value.trim() : "")
    .filter(Boolean)
    .join(" ");

  return composed;
}

async function getReviewerIdentities(rows: ReviewRow[]): Promise<Map<string, ReviewerIdentity>> {
  const uids = [...new Set(
    rows
      .map((row) => String(row.reviewer_uid ?? "").trim())
      .filter(Boolean),
  )];

  const identities = new Map<string, ReviewerIdentity>();
  if (!uids.length) return identities;

  const fallbackByUid = new Map(
    rows.map((row) => [
      String(row.reviewer_uid),
      {
        name: getStoredReviewerFallback(row),
        avatarUrl: null,
      },
    ]),
  );

  for (const [uid, fallback] of fallbackByUid) {
    identities.set(uid, fallback);
  }

  try {
    const firebaseAdmin = getFirebaseAdmin();
    const userRefs = uids.map((uid) =>
      firebaseAdmin.firestore().collection("users").doc(uid),
    );
    const profileSnapshots = await firebaseAdmin.firestore().getAll(...userRefs);
    const profileByUid = new Map<string, Record<string, unknown>>();

    profileSnapshots.forEach((snapshot) => {
      if (snapshot.exists) {
        profileByUid.set(snapshot.id, snapshot.data() ?? {});
      }
    });

    await Promise.all(
      uids.map(async (uid) => {
        const profile = profileByUid.get(uid) ?? {};
        const fallback = identities.get(uid);
        const profileName = buildProfileDisplayName(profile);
        const profileAvatar =
          typeof profile.profile_picture === "string" ? profile.profile_picture.trim() :
          typeof profile.photoURL === "string" ? profile.photoURL.trim() :
          "";

        let authName = "";
        let authAvatar = "";
        if (!profileName || !profileAvatar) {
          try {
            const record = await firebaseAdmin.auth().getUser(uid);
            authName = typeof record.displayName === "string" ? record.displayName.trim() : "";
            authAvatar = typeof record.photoURL === "string" ? record.photoURL.trim() : "";
          } catch {
            // The Firestore profile remains sufficient when an Auth record cannot be read.
          }
        }

        identities.set(uid, {
          name: profileName || authName || fallback?.name || "Member",
          avatarUrl: profileAvatar || authAvatar || null,
        });
      }),
    );
  } catch (error) {
    console.warn("Failed to load reviewer account profiles; using stored review identity", error);
  }

  return identities;
}

async function getReviewerIdentity(uid: string, fallback: {
  reviewer_name?: string | null;
  reviewer_email?: string | null;
}): Promise<ReviewerIdentity> {
  const identity = await getReviewerIdentities([{
    reviewer_uid: uid,
    reviewer_name: fallback.reviewer_name ?? null,
    reviewer_email: fallback.reviewer_email ?? null,
  } as ReviewRow]);

  return identity.get(uid) ?? {
    name: getStoredReviewerFallback(fallback),
    avatarUrl: null,
  };
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

function getReviewReactionStatsForIds(reviewIds: number[], viewerUid?: string) {
  const ids = [...new Set(reviewIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const grouped = new Map<number, { likeCount: number; dislikeCount: number; viewerReaction: "like" | "dislike" | null }>();
  if (!ids.length) return grouped;

  const placeholders = ids.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
        SELECT
          review_id,
          COUNT(*) FILTER (WHERE reaction_type = 'like') AS like_count,
          COUNT(*) FILTER (WHERE reaction_type = 'dislike') AS dislike_count,
          MAX(CASE WHEN reviewer_uid = ? THEN reaction_type ELSE NULL END) AS viewer_reaction
        FROM listing_review_reactions
        WHERE review_id IN (${placeholders})
        GROUP BY review_id
      `
    )
    .all(viewerUid ?? "", ...ids) as Array<{
      review_id: number | string;
      like_count: number | string;
      dislike_count: number | string;
      viewer_reaction?: "like" | "dislike" | null;
    }>;

  for (const row of rows) {
    grouped.set(Number(row.review_id), {
      likeCount: Number(row.like_count ?? 0),
      dislikeCount: Number(row.dislike_count ?? 0),
      viewerReaction: row.viewer_reaction ?? null,
    });
  }

  return grouped;
}

function serializeReview(row: ReviewRow, mediaRows?: ReviewMediaRow[], reactionStats?: { likeCount: number; dislikeCount: number; viewerReaction: "like" | "dislike" | null }, identity?: ReviewerIdentity) {
  const media = mediaRows ?? getReviewMedia(row.id);
  return {
    id: row.id,
    listing_id: row.listing_id,
    seller_uid: row.seller_uid,
    reviewer_uid: row.reviewer_uid,
    reviewer_name: identity?.name ?? getStoredReviewerFallback(row),
    reviewer_email: row.reviewer_email,
    reviewer_avatar_url: identity?.avatarUrl ?? null,
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
    like_count: reactionStats?.likeCount ?? 0,
    dislike_count: reactionStats?.dislikeCount ?? 0,
    viewer_reaction: reactionStats?.viewerReaction ?? null,
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

function getListingIdCandidates(listingId: number): [string, string] {
  return [`%"listingId":"${listingId}"%`, `%"listingId":${listingId}%`];
}

function getCapturedPurchaseRowsForListing(listingId: number) {
  const [stringPattern, numericPattern] = getListingIdCandidates(listingId);
  return db.prepare(
    `
      SELECT DISTINCT o.buyer_id, o.items
      FROM orders o
      INNER JOIN payments p ON p.order_id = o.id
      WHERE p.status = 'captured'
        AND (o.items LIKE ? OR o.items LIKE ?)
    `
  ).all(stringPattern, numericPattern) as Array<{
    buyer_id: string;
    items: string | null;
  }>;
}

function orderItemsContainListing(items: string | null, listingId: number): boolean {
  if (!items) return false;

  try {
    const parsed = JSON.parse(items);
    if (!Array.isArray(parsed)) return false;

    return parsed.some((item) => {
      if (!item || typeof item !== "object") return false;
      const record = item as Record<string, unknown>;
      return String(record.listingId ?? record.listing_id ?? "").trim() === String(listingId);
    });
  } catch {
    return false;
  }
}

function getCapturedPurchaseKeysForListing(listingId: number): Set<string> {
  const keys = new Set<string>();

  for (const row of getCapturedPurchaseRowsForListing(listingId)) {
    if (orderItemsContainListing(row.items, listingId)) {
      const buyerId = String(row.buyer_id ?? "").trim();
      if (buyerId) keys.add(buyerId.toLowerCase());
    }
  }

  return keys;
}

function hasCapturedPurchase(listingId: number, user: VerifiedRequestUser): boolean {
  const capturedBuyers = getCapturedPurchaseKeysForListing(listingId);
  if (!capturedBuyers.size) return false;

  if (capturedBuyers.has(user.uid.trim().toLowerCase())) return true;

  const email = String(user.email ?? "").trim().toLowerCase();
  return Boolean(email && capturedBuyers.has(email));
}

function canUserReplyToListing(listing: ListingRow, user: VerifiedRequestUser) {
  return user.is_admin || listing.seller_uid === user.uid;
}

function canUserReviewListing(listing: ListingRow, user?: VerifiedRequestUser | undefined) {
  return !!user && user.uid !== listing.seller_uid && hasCapturedPurchase(listing.id, user);
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
  const requestedKeepIds = new Set(existingMediaIdsToKeep.map(Number));
  const existingIds = new Set(existing.map((media) => Number(media.id)));
  const unknownIds = [...requestedKeepIds].filter((id) => !existingIds.has(id));
  if (unknownIds.length > 0) throw new Error("One or more selected review media items are invalid.");

  const retained = existing.filter((media) => requestedKeepIds.has(Number(media.id)));
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

    const removed = existing.filter((media) => !requestedKeepIds.has(Number(media.id)));

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


async function deleteListingReviewHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) {
    return reviewError(res, 401, "Authentication required");
  }

  const listingId = Number(req.params.listingId);
  const reviewId = Number(req.params.reviewId);
  if (!Number.isInteger(listingId) || !Number.isInteger(reviewId)) {
    return reviewError(res, 400, "Invalid review id");
  }

  const review = getReviewById(listingId, reviewId);
  if (!review) {
    return reviewError(res, 404, "Review not found");
  }

  if (review.reviewer_uid !== user.uid && !user.is_admin) {
    return reviewError(res, 403, "You can only remove your own review");
  }

  const media = getReviewMedia(reviewId);

  try {
    db.prepare(
      `DELETE FROM listing_reviews WHERE id = ? AND listing_id = ?`
    ).run(reviewId, listingId);

    await Promise.all(
      media.map((item) =>
        deleteCloudinaryAsset({
          publicId: item.public_id,
          resourceType: item.resource_type,
        }).catch((error) => {
          console.warn("Failed to delete review media from Cloudinary after review removal", {
            reviewId,
            mediaId: item.id,
            error,
          });
        }),
      ),
    );

    return res.json({ success: true, reviewId });
  } catch (error) {
    console.error("DELETE /api/listings/:listingId/reviews/:reviewId error:", error);
    return reviewError(res, 500, "Failed to remove review");
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
  const user = req.user as VerifiedRequestUser | undefined;
  const reactionsByReviewId = getReviewReactionStatsForIds(
    itemRows.map((row) => Number(row.id)),
    user?.uid,
  );
  const mine = user ? getReviewByListingAndReviewer(listingId, user.uid) : null;
  const identityRows = mine ? [...itemRows, mine] : itemRows;
  const reviewerIdentities = await getReviewerIdentities(identityRows);
  const capturedPurchaseKeys = getCapturedPurchaseKeysForListing(listingId);

  const items = itemRows.map((row) =>
    serializeReview(
      row,
      mediaByReviewId.get(Number(row.id)) ?? [],
      reactionsByReviewId.get(Number(row.id)),
      reviewerIdentities.get(String(row.reviewer_uid)),
    )
  ).map((review) => {
    const verifiedPurchase =
      capturedPurchaseKeys.has(String(review.reviewer_uid ?? "").trim().toLowerCase()) ||
      Boolean(
        String(review.reviewer_email ?? "").trim() &&
        capturedPurchaseKeys.has(String(review.reviewer_email).trim().toLowerCase()),
      );

    return {
      ...review,
      is_verified_purchase: verifiedPurchase,
      reviewer_badge: verifiedPurchase ? "Verified buyer" : null,
    };
  });

  let viewerReview: ReturnType<typeof serializeReview> | null = null;
  if (mine) {
    const mineReactions = getReviewReactionStatsForIds([Number(mine.id)], user?.uid);
    const mineVerifiedPurchase =
      capturedPurchaseKeys.has(String(mine.reviewer_uid ?? "").trim().toLowerCase()) ||
      Boolean(
        String(mine.reviewer_email ?? "").trim() &&
        capturedPurchaseKeys.has(String(mine.reviewer_email).trim().toLowerCase()),
      );

    viewerReview = {
      ...serializeReview(
        mine,
        undefined,
        mineReactions.get(Number(mine.id)),
        reviewerIdentities.get(String(mine.reviewer_uid)),
      ),
      is_verified_purchase: mineVerifiedPurchase,
      reviewer_badge: mineVerifiedPurchase ? "Verified buyer" : null,
    };
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

async function setReviewReactionHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) {
    return reviewError(res, 401, "Authentication required");
  }

  const listingId = Number(req.params.listingId);
  const reviewId = Number(req.params.reviewId);
  if (!Number.isInteger(listingId) || !Number.isInteger(reviewId)) {
    return reviewError(res, 400, "Invalid review id");
  }

  const review = getReviewById(listingId, reviewId);
  if (!review) {
    return reviewError(res, 404, "Review not found");
  }

  if (review.seller_uid === user.uid) {
    return reviewError(res, 403, "Listing sellers cannot react to reviews");
  }

  const reaction = req.body?.reaction;
  if (reaction !== "like" && reaction !== "dislike") {
    return reviewError(res, 400, "Reaction must be like or dislike");
  }

  try {
    db.prepare(
      `
        INSERT INTO listing_review_reactions (review_id, reviewer_uid, reaction_type)
        VALUES (?, ?, ?)
        ON CONFLICT (review_id, reviewer_uid)
        DO UPDATE SET reaction_type = EXCLUDED.reaction_type
      `
    ).run(reviewId, user.uid, reaction);

    const reactions = getReviewReactionStatsForIds([reviewId], user.uid).get(reviewId);
    return res.json({
      success: true,
      review: serializeReview(review, undefined, reactions),
    });
  } catch (error) {
    console.error("PUT /api/listings/:listingId/reviews/:reviewId/reaction error:", error);
    return reviewError(res, 500, "Failed to save review reaction");
  }
}

async function deleteReviewReactionHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) {
    return reviewError(res, 401, "Authentication required");
  }

  const listingId = Number(req.params.listingId);
  const reviewId = Number(req.params.reviewId);
  if (!Number.isInteger(listingId) || !Number.isInteger(reviewId)) {
    return reviewError(res, 400, "Invalid review id");
  }

  const review = getReviewById(listingId, reviewId);
  if (!review) {
    return reviewError(res, 404, "Review not found");
  }

  try {
    db.prepare(
      `
        DELETE FROM listing_review_reactions
        WHERE review_id = ? AND reviewer_uid = ?
      `
    ).run(reviewId, user.uid);

    const reactions = getReviewReactionStatsForIds([reviewId], user.uid).get(reviewId);
    return res.json({
      success: true,
      review: serializeReview(review, undefined, reactions),
    });
  } catch (error) {
    console.error("DELETE /api/listings/:listingId/reviews/:reviewId/reaction error:", error);
    return reviewError(res, 500, "Failed to remove review reaction");
  }
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

  if (user.uid === listing.seller_uid) {
    return reviewError(res, 403, "Listing owners cannot review their own listing");
  }

  if (!hasCapturedPurchase(listingId, user)) {
    return reviewError(res, 403, "You can only review a listing after purchasing it.");
  }

  const reviewerIdentity = await getReviewerIdentity(user.uid, {
    reviewer_name: user.email ?? "Member",
    reviewer_email: user.email ?? null,
  });

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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
      reviewerIdentity.name,
      rating,
      title,
      body
    );

    const updated = getReviewByListingAndReviewer(listingId, user.uid);
    if (updated) {
      await replaceReviewMedia(updated.id, listingId, uploadedFiles, existingMediaIdsToKeep);
    }

    const finalReview = updated ? getReviewByListingAndReviewer(listingId, user.uid) : null;
    return res.status(201).json({
      success: true,
      review: finalReview ? serializeReview(finalReview, undefined, undefined, reviewerIdentity) : null,
    });
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

  if (!hasCapturedPurchase(listingId, user)) {
    return reviewError(res, 403, "You can only review a listing after purchasing it.");
  }

  const reviewerIdentity = await getReviewerIdentity(user.uid, review);
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
        SET reviewer_name = ?, reviewer_email = ?, is_verified_purchase = 1,
            rating = ?, title = ?, body = ?, updated_at = CURRENT_TIMESTAMP
        WHERE listing_id = ? AND reviewer_uid = ?
      `
    ).run(reviewerIdentity.name, user.email ?? review.reviewer_email ?? null, rating, title, body, listingId, user.uid);

    await replaceReviewMedia(review.id, listingId, uploadedFiles, existingMediaIdsToKeep);

    const updated = getReviewByListingAndReviewer(listingId, user.uid);
    return res.json({
      success: true,
      review: updated ? serializeReview(updated, undefined, undefined, reviewerIdentity) : null,
    });
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
  app.post("/api/listings/:listingId/reviews", requireAuth, parseReviewMedia, createIdempotencyMiddleware("reviews.submit"), (req, res) => void createListingReviewHandler(req, res));
  app.put("/api/listings/:listingId/reviews", requireAuth, parseReviewMedia, createIdempotencyMiddleware("reviews.submit"), (req, res) => void updateListingReviewHandler(req, res));
  app.post("/api/listings/:listingId/reviews/reply", requireAuth, (req, res) => void replyToListingReviewHandler(req, res));
  app.patch("/api/listings/:listingId/reviews/:reviewId/reply", requireAuth, (req, res) => void replyToListingReviewByIdHandler(req, res));
  app.put("/api/listings/:listingId/reviews/:reviewId/reaction", requireAuth, (req, res) => void setReviewReactionHandler(req, res));
  app.delete("/api/listings/:listingId/reviews/:reviewId/reaction", requireAuth, (req, res) => void deleteReviewReactionHandler(req, res));
  app.delete("/api/listings/:listingId/reviews/:reviewId", requireAuth, createIdempotencyMiddleware("reviews.delete"), (req, res) => void deleteListingReviewHandler(req, res));

  (app as any)[ROUTES_INSTALLED_FLAG] = true;
}