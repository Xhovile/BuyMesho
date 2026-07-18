import type { Express } from "express";
import { CATEGORIES, UNIVERSITIES } from "../../src/constants.js";
import {
  isMeaningfulTitle,
  isValidListingHierarchy,
  normalizeListingPricing,
  serializeListingRow,
} from "../lib/listingHelpers.js";
import { requireAuth } from "../middleware/requireAuth.js";

export type ListingRouteDeps = {
  db: any;
};

function normalizeStringArray(value: unknown, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, maxLength);
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function registerListingRoutes(app: Express, deps: ListingRouteDeps) {
  const { db } = deps;

  app.post("/api/listings", requireAuth, (req, res) => {
    const uid = req.user!.uid;
    const seller = db
      .prepare(
        `
          SELECT uid, is_seller
          FROM sellers
          WHERE uid = ?
          LIMIT 1
        `
      )
      .get(uid) as { uid: string; is_seller: number } | undefined;

    if (!seller || Number(seller.is_seller) !== 1) {
      return res.status(404).json({ error: "Seller profile not found" });
    }

    try {
      const body = req.body ?? {};
      const name = normalizeString(body.name);
      const description = normalizeString(body.description);
      const category = normalizeString(body.category);
      const subcategory = normalizeString(body.subcategory) || null;
      const itemType = normalizeString(body.item_type) || null;
      const university = normalizeString(body.university);
      const status = normalizeString(body.status).toLowerCase() === "sold" ? "sold" : "available";
      const conditionRaw = normalizeString(body.condition).toLowerCase();
      const condition =
        conditionRaw === "new" || conditionRaw === "refurbished" ? conditionRaw : "used";
      const photos = normalizeStringArray(body.photos, 5);
      const videoUrl = normalizeString(body.video_url) || null;
      const quantity = Number(body.quantity);
      const soldQuantity = Number(body.sold_quantity);
      const specValues =
        body.spec_values && typeof body.spec_values === "object" && !Array.isArray(body.spec_values)
          ? body.spec_values
          : {};

      if (!isMeaningfulTitle(name)) {
        return res.status(400).json({
          error: "Please enter a clear listing title with at least 3 letters or numbers.",
        });
      }

      if (description.length < 10) {
        return res.status(400).json({
          error: "Please enter a product description of at least 10 characters.",
        });
      }

      if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
        return res.status(400).json({ error: "Invalid category" });
      }

      if (!UNIVERSITIES.includes(university as (typeof UNIVERSITIES)[number])) {
        return res.status(400).json({ error: "Invalid university" });
      }

      if (!isValidListingHierarchy(category, subcategory, itemType)) {
        return res.status(400).json({ error: "Invalid listing details" });
      }

      if (!Number.isFinite(Number(body.price)) || Number(body.price) <= 0) {
        return res.status(400).json({ error: "Please enter a valid price greater than 0." });
      }

      if (photos.length < 1) {
        return res.status(400).json({ error: "Add at least 1 photo." });
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ error: "Total quantity must be a whole number of at least 1." });
      }

      if (!Number.isInteger(soldQuantity) || soldQuantity < 0) {
        return res.status(400).json({ error: "Sold quantity cannot be negative." });
      }

      if (soldQuantity > quantity) {
        return res.status(400).json({ error: "Sold quantity cannot be greater than total quantity." });
      }

      const pricing = normalizeListingPricing(body);
      if (pricing.listing_mode === "deal" && pricing.original_price === null) {
        return res.status(400).json({ error: "Original price must be higher than current price." });
      }

      if (pricing.listing_mode === "wholesale") {
        if (pricing.pack_size === null || !Number.isInteger(pricing.pack_size) || pricing.pack_size < 1) {
          return res.status(400).json({ error: "Pack size must be a whole number of at least 1." });
        }

        if (!pricing.bulk_units) {
          return res.status(400).json({ error: "Bulk units are required for wholesale listings." });
        }

        if (pricing.can_sell_individually === 1 && (pricing.single_item_price === null || pricing.single_item_price <= 0)) {
          return res.status(400).json({ error: "Single item price must be greater than 0." });
        }
      }

      const insert = db
        .prepare(
          `
            INSERT INTO listings (
              seller_uid,
              name,
              price,
              original_price,
              discount_percent,
              deal_label,
              listing_mode,
              deal_expires_at,
              is_wholesale,
              can_sell_individually,
              description,
              category,
              subcategory,
              item_type,
              spec_values,
              university,
              is_seller,
              photos,
              video_url,
              status,
              condition,
              quantity,
              sold_quantity,
              single_item_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .run(
          uid,
          name,
          pricing.price,
          pricing.original_price,
          pricing.discount_percent,
          pricing.deal_label,
          pricing.listing_mode,
          pricing.deal_expires_at,
          pricing.is_wholesale,
          pricing.can_sell_individually,
          description,
          category,
          subcategory,
          itemType,
          JSON.stringify(specValues),
          university,
          1,
          JSON.stringify(photos),
          videoUrl,
          status,
          condition,
          quantity,
          soldQuantity,
          pricing.single_item_price
        );

      const row = db
        .prepare(
          `
            SELECT l.*, s.business_name, s.business_logo, s.is_verified
            FROM listings l
            JOIN sellers s ON l.seller_uid = s.uid
            WHERE l.id = ?
            LIMIT 1
          `
        )
        .get(insert.lastInsertRowid) as any;

      return res.status(201).json({
        success: true,
        listing: row ? serializeListingRow(row) : null,
      });
    } catch (error) {
      console.error("Failed to create listing", error);
      return res.status(500).json({ error: "Failed to create listing" });
    }
  });
}
