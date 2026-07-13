import express, { type RequestHandler } from "express";
import { getPaymentDb } from "../postgresCompat.js";

type ListingRow = {
  id: number;
  name: string;
  price: number;
  description: string | null;
  university: string | null;
  photos: string | null;
  quantity: number;
  sold_quantity: number;
  status: string;
};

type CartRow = {
  buyer_uid: string;
  listing_id: number;
  listing_title: string;
  listing_image: string | null;
  listing_description: string | null;
  university: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  available_quantity: number | null;
  added_at: string;
  updated_at: string;
};

function jsonError(error: unknown, fallback: string) {
  return { error: error instanceof Error ? error.message : fallback };
}

function normalizeQuantity(value: unknown) {
  const parsed = Number(value ?? 1);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.max(1, Math.floor(parsed));
}

function toCartItem(row: CartRow) {
  return {
    listingId: String(row.listing_id),
    listingTitle: row.listing_title,
    listingImage: row.listing_image,
    listingDescription: row.listing_description,
    university: row.university,
    quantity: Number(row.quantity ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    totalPrice: Number(row.total_price ?? 0),
    availableQuantity: row.available_quantity ?? null,
    addedAt: row.added_at,
  };
}

function buildUpsertedCartItem(db: any, buyerUid: string, listingId: number, quantity: number) {
  const listing = db.prepare(`
    SELECT id, name, price, description, university, photos, quantity, sold_quantity, status
    FROM listings
    WHERE id = ? AND is_hidden = 0 AND deleted_at IS NULL
  `).get(listingId) as ListingRow | undefined;

  if (!listing) {
    const error = new Error(`Listing ${listingId} not found`);
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  if (listing.status === "sold") {
    const error = new Error(`${listing.name} is no longer available`);
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  const availableQuantity = Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0));
  if (availableQuantity <= 0) {
    const error = new Error(`${listing.name} is out of stock`);
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  if (quantity > availableQuantity) {
    const error = new Error(`Only ${availableQuantity} unit(s) available for ${listing.name}`);
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  const photos = listing.photos ? (() => {
    try {
      const parsed = JSON.parse(listing.photos as unknown as string);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })() : [];

  const listingImage = photos.length > 0 ? String(photos[0]) : null;
  const unitPrice = Number(listing.price ?? 0);
  const totalPrice = unitPrice * quantity;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO buyer_cart_items (
      buyer_uid,
      listing_id,
      listing_title,
      listing_image,
      listing_description,
      university,
      quantity,
      unit_price,
      total_price,
      available_quantity,
      added_at,
      updated_at
    ) VALUES (
      @buyer_uid,
      @listing_id,
      @listing_title,
      @listing_image,
      @listing_description,
      @university,
      @quantity,
      @unit_price,
      @total_price,
      @available_quantity,
      @added_at,
      @updated_at
    )
    ON CONFLICT (buyer_uid, listing_id) DO UPDATE SET
      listing_title = excluded.listing_title,
      listing_image = excluded.listing_image,
      listing_description = excluded.listing_description,
      university = excluded.university,
      quantity = excluded.quantity,
      unit_price = excluded.unit_price,
      total_price = excluded.total_price,
      available_quantity = excluded.available_quantity,
      added_at = buyer_cart_items.added_at,
      updated_at = excluded.updated_at
  `).run({
    buyer_uid: buyerUid,
    listing_id: listing.id,
    listing_title: listing.name,
    listing_image: listingImage,
    listing_description: listing.description ?? null,
    university: listing.university ?? null,
    quantity,
    unit_price: unitPrice,
    total_price: totalPrice,
    available_quantity: availableQuantity,
    added_at: now,
    updated_at: now,
  });

  const row = db.prepare(`
    SELECT buyer_uid, listing_id, listing_title, listing_image, listing_description, university,
           quantity, unit_price, total_price, available_quantity, added_at, updated_at
    FROM buyer_cart_items
    WHERE buyer_uid = ? AND listing_id = ?
  `).get(buyerUid, listing.id) as CartRow | undefined;

  if (!row) {
    const error = new Error("Failed to save cart item");
    (error as Error & { statusCode?: number }).statusCode = 500;
    throw error;
  }

  return toCartItem(row);
}

export function createCartRouter(requireFirebaseUser: RequestHandler): express.Router {
  const router = express.Router();

  router.get("/", requireFirebaseUser, async (req: any, res) => {
    try {
      const db: any = getPaymentDb();
      const rows = db.prepare(`
        SELECT buyer_uid, listing_id, listing_title, listing_image, listing_description, university,
               quantity, unit_price, total_price, available_quantity, added_at, updated_at
        FROM buyer_cart_items
        WHERE buyer_uid = ?
        ORDER BY updated_at DESC, added_at DESC
      `).all(req.user.uid) as CartRow[];

      return res.json({ success: true, items: rows.map(toCartItem) });
    } catch (error) {
      return res.status(500).json(jsonError(error, "Failed to load cart"));
    }
  });

  router.post("/items", requireFirebaseUser, async (req: any, res) => {
    try {
      const listingId = Number(req.body?.listingId);
      const quantity = normalizeQuantity(req.body?.quantity);

      if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({ error: "A valid listingId is required" });
      }

      if (!quantity) {
        return res.status(400).json({ error: "A valid quantity is required" });
      }

      const db: any = getPaymentDb();
      const item = buildUpsertedCartItem(db, req.user.uid, listingId, quantity);
      return res.status(201).json({ success: true, item });
    } catch (error: any) {
      const statusCode = Number(error?.statusCode ?? 500);
      return res.status(statusCode).json(jsonError(error, "Failed to save cart item"));
    }
  });

  router.patch("/items/:listingId", requireFirebaseUser, async (req: any, res) => {
    try {
      const listingId = Number(req.params.listingId);
      const quantity = normalizeQuantity(req.body?.quantity);

      if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({ error: "A valid listingId is required" });
      }

      if (!quantity) {
        return res.status(400).json({ error: "A valid quantity is required" });
      }

      const db: any = getPaymentDb();
      const item = buildUpsertedCartItem(db, req.user.uid, listingId, quantity);
      return res.json({ success: true, item });
    } catch (error: any) {
      const statusCode = Number(error?.statusCode ?? 500);
      return res.status(statusCode).json(jsonError(error, "Failed to update cart item"));
    }
  });

  router.delete("/items/:listingId", requireFirebaseUser, async (req: any, res) => {
    try {
      const listingId = Number(req.params.listingId);
      if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({ error: "A valid listingId is required" });
      }

      const db: any = getPaymentDb();
      db.prepare(`DELETE FROM buyer_cart_items WHERE buyer_uid = ? AND listing_id = ?`).run(req.user.uid, listingId);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json(jsonError(error, "Failed to remove cart item"));
    }
  });

  router.delete("/", requireFirebaseUser, async (req: any, res) => {
    try {
      const db: any = getPaymentDb();
      db.prepare(`DELETE FROM buyer_cart_items WHERE buyer_uid = ?`).run(req.user.uid);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json(jsonError(error, "Failed to clear cart"));
    }
  });

  return router;
}
