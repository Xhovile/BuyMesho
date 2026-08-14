import type { RequestHandler } from "express";
import { orderRepository } from "./order.repository.js";

export interface BuyerDeliveryDetails {
  fullName: string;
  phone: string;
  addressLine: string;
  area: string;
  townOrDistrict: string;
  landmark: string;
}

function normalizeBuyerDetails(input: unknown): BuyerDeliveryDetails {
  const value = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    fullName: typeof value.fullName === "string" ? value.fullName.trim() : "",
    phone: typeof value.phone === "string" ? value.phone.trim() : "",
    addressLine: typeof value.addressLine === "string" ? value.addressLine.trim() : "",
    area: typeof value.area === "string" ? value.area.trim() : "",
    townOrDistrict: typeof value.townOrDistrict === "string" ? value.townOrDistrict.trim() : "",
    landmark: typeof value.landmark === "string" ? value.landmark.trim() : "",
  };
}

function containsListingCheckout(body: Record<string, unknown>): boolean {
  const legacyListingId = body.listingId;
  if (legacyListingId !== undefined && legacyListingId !== null && String(legacyListingId).trim() !== "") {
    return true;
  }

  return Array.isArray(body.items)
    && body.items.some((item) => {
      if (!item || typeof item !== "object") return false;
      const listingId = (item as Record<string, unknown>).listingId;
      return listingId !== undefined && listingId !== null && String(listingId).trim() !== "";
    });
}

function validate(details: BuyerDeliveryDetails): string | null {
  if (details.fullName.length < 2) return "Full name is required";
  if (details.phone.length < 7) return "A valid phone number is required";
  if (details.addressLine.length < 3) return "Delivery address is required";
  if (details.area.length < 2) return "Area / location is required";
  if (details.townOrDistrict.length < 2) return "Town / district is required";
  return null;
}

function sameDetails(
  left: BuyerDeliveryDetails | null | undefined,
  right: BuyerDeliveryDetails,
): boolean {
  return Boolean(
    left
      && left.fullName === right.fullName
      && left.phone === right.phone
      && left.addressLine === right.addressLine
      && left.area === right.area
      && left.townOrDistrict === right.townOrDistrict
      && left.landmark === right.landmark,
  );
}

export const requireListingBuyerDetails: RequestHandler = (req: any, res, next) => {
  const body = req.body ?? {};
  if (!containsListingCheckout(body)) {
    return next();
  }

  const buyerDetails = normalizeBuyerDetails(body.buyerDetails);
  const validationError = validate(buyerDetails);
  if (validationError) {
    return res.status(400).json({ error: validationError, code: "BUYER_DETAILS_REQUIRED" });
  }

  const buyerUid = String(req.user?.uid ?? "").trim();
  const idempotencyKey = String(req.headers["idempotency-key"] ?? body.idempotencyKey ?? "").trim();

  if (buyerUid && idempotencyKey) {
    const existingOrder = orderRepository.findByCheckoutIdempotencyKey(buyerUid, idempotencyKey);
    if (existingOrder?.buyerDetails && !sameDetails(existingOrder.buyerDetails, buyerDetails)) {
      return res.status(409).json({
        error: "This checkout has already been started with different delivery details.",
        code: "BUYER_DETAILS_CHANGED",
      });
    }
  }

  const originalJson = res.json.bind(res) as typeof res.json;
  res.json = ((payload: any) => {
    if (payload?.orderId && payload?.success !== false && res.statusCode >= 200 && res.statusCode < 300) {
      try {
        orderRepository.update(String(payload.orderId), (order) => ({
          ...order,
          buyerDetails,
          updatedAt: new Date().toISOString(),
        }));
      } catch (error) {
        console.error("Failed to snapshot buyer delivery details on order", error);
        return res.status(500).json({ error: "Failed to save buyer delivery details for this order" });
      }
    }

    return originalJson(payload);
  }) as typeof res.json;

  next();
};
