import express, { type RequestHandler } from "express";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";
import { serverPaymentService } from "./payment.service.js";
import { serverOrderService } from "../orders/order.service.js";
import { orderRepository } from "../orders/order.repository.js";
import { paymentRepository } from "./payment.repository.js";
import { escrowRepository } from "../escrow/escrow.repository.js";
import { getPaymentDb } from "../../postgresCompat.js";
import { calculateCustomerCheckoutFees } from "../payouts/payout.policy.js";

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout requests. Please try again in a moment." },
});

const orderLookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many order lookup requests. Please try again in a moment." },
});

type ListingRow = {
  id: number;
  seller_uid: string;
  name: string;
  price: number;
  status: string;
  quantity: number;
  sold_quantity: number;
};

type OrderBundle = {
  order: ReturnType<typeof orderRepository.findById>;
  payment: ReturnType<typeof paymentRepository.findByReference> | null;
  escrow: ReturnType<typeof escrowRepository.findByOrderId> | null;
  dispute: Record<string, unknown> | null;
};

function jsonError(error: unknown, fallback: string) {
  return { error: error instanceof Error ? error.message : fallback };
}

function findOrderByParam(param: string) {
  return orderRepository.findById(param) ?? orderRepository.findByPaymentReference(param);
}

function buildOrderBundle(orderId: string): OrderBundle | null {
  const order = orderRepository.findById(orderId);
  if (!order) return null;

  const db: any = getPaymentDb();
  const payment = order.paymentReference ? paymentRepository.findByReference(order.paymentReference) : null;
  const escrow = escrowRepository.findByOrderId(order.id) ?? null;
  const dispute = db.prepare("SELECT * FROM disputes WHERE order_id = ? ORDER BY created_at DESC LIMIT 1").get(order.id) ?? null;

  return { order, payment, escrow, dispute };
}

export function createPaymentRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.post("/checkout", checkoutLimiter, requireAuth, async (req: any, res) => {
    try {
      const body = req.body ?? {};
      const listingId = body.listingId;
      const quantity = body.quantity ?? 1;
      const items = Array.isArray(body.items) ? body.items : [];
      const method = body.method ?? "mobile_money";
      const settlementRoute = body.settlementRoute ?? "escrow";
      const returnUrl = body.returnUrl;
      const cancelUrl = body.cancelUrl;
      const buyerName = body.buyerName;
      const buyerPhone = body.buyerPhone;
      const requestedItems = items.length > 0 ? items : (listingId ? [{ listingId, quantity }] : []);

      if (requestedItems.length === 0) {
        return res.status(400).json({ error: "listingId or items are required" });
      }

      const db: any = getPaymentDb();
      const currency = "MWK";
      const now = new Date().toISOString();
      const buyerUid = req.user.uid;
      const buyerEmail = req.user.email ?? "";
      const orderId = `ord_${randomUUID()}`;
      const orderItems: any[] = [];
      const listingIds: string[] = [];
      const sellerIds = new Set<string>();
      let total = 0;

      for (const item of requestedItems) {
        const numericListingId = Number(item.listingId);
        if (!Number.isInteger(numericListingId) || numericListingId <= 0) {
          return res.status(400).json({ error: "Each checkout item requires a valid listingId" });
        }

        const listing = db.prepare("SELECT * FROM listings WHERE id = ? AND is_hidden = 0 AND deleted_at IS NULL").get(numericListingId) as ListingRow | undefined;
        if (!listing) {
          return res.status(404).json({ error: `Listing ${numericListingId} not found` });
        }

        if (listing.status === "sold") {
          return res.status(400).json({ error: `${listing.name} is no longer available` });
        }

        const parsedQty = Number(item.quantity ?? 1);
        if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
          return res.status(400).json({ error: `Invalid quantity for ${listing.name}` });
        }

        const safeQty = Math.max(1, Math.floor(parsedQty));
        const availableQty = Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0));
        if (availableQty === 0) return res.status(400).json({ error: `${listing.name} is out of stock` });
        if (safeQty > availableQty) return res.status(400).json({ error: `Only ${availableQty} unit(s) available for ${listing.name}` });

        const unitPrice = Number(listing.price);
        total += unitPrice * safeQty;
        sellerIds.add(listing.seller_uid);
        listingIds.push(String(numericListingId));
        orderItems.push({
          listingId: String(numericListingId),
          title: listing.name,
          quantity: safeQty,
          unitPrice: { amount: unitPrice, currency },
          reference: `${orderId}-ITEM-${String(orderItems.length + 1).padStart(2, "0")}`,
        });
      }

      const primarySellerId = sellerIds.values().next().value ?? "multiple-sellers";
      const feeBreakdown = calculateCustomerCheckoutFees({ itemTotalAmount: total, currency });

      serverOrderService.create({
        id: orderId,
        buyerId: buyerUid,
        sellerId: primarySellerId,
        source: "listing",
        status: "pending_payment",
        currency,
        subtotal: { amount: total, currency },
        total: { amount: feeBreakdown.finalTotalAmount, currency },
        paymentProvider: "paychangu",
        settlementRoute,
        items: orderItems,
        placedAt: now,
        createdAt: now,
        updatedAt: now,
      } as any);

      const paymentResult = await serverPaymentService.createPayment({
        orderId,
        provider: "paychangu",
        method,
        settlementRoute,
        amount: { amount: feeBreakdown.finalTotalAmount, currency },
        customer: {
          id: buyerUid,
          name: buyerName || buyerEmail || buyerUid,
          email: buyerEmail || undefined,
          phoneNumber: buyerPhone,
        },
        metadata: {
          listingIds,
          buyerId: buyerUid,
          buyerEmail: buyerEmail || undefined,
          settlementRoute,
          returnUrl,
          cancelUrl,
        },
        returnUrl,
        cancelUrl,
      } as any);

      orderRepository.update(orderId, (current) => ({
        ...current,
        paymentReference: paymentResult.reference ?? orderId,
        updatedAt: now,
      } as any));

      return res.status(201).json({
        success: true,
        orderId,
        payment: paymentResult,
        order: orderRepository.findById(orderId),
        totals: {
          subtotal: total,
          total: feeBreakdown.finalTotalAmount,
          fees: feeBreakdown.payChanguTransactionFeeAmount,
        },
      });
    } catch (error) {
      return res.status(500).json(jsonError(error, "Failed to initiate checkout"));
    }
  });

  router.get("/transaction/:id", orderLookupLimiter, async (req, res) => {
    const bundle = buildOrderBundle(req.params.id);
    if (!bundle) return res.status(404).json({ error: "Transaction not found" });
    return res.json({ success: true, transaction: bundle });
  });

  return router;
}
