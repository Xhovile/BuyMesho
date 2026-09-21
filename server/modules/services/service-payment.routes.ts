import express, { type Request, type RequestHandler, type Router } from "express";
import {
  createXhovileStudioServicePayment,
  verifyXhovileStudioServicePayment,
} from "./service-payment.service.js";
import {
  servicePaymentRepository,
  type ServicePaymentType,
} from "./service-payment.repository.js";

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidEmail(value: string): boolean {
  return !value || /^\S+@\S+\.\S+$/.test(value);
}

function isValidPhone(value: string): boolean {
  return /^\+?[0-9][0-9\s-]{6,30}$/.test(value);
}

function isServiceType(value: string): value is ServicePaymentType {
  return value === "graphic_design" || value === "website_development" || value === "both";
}

const GRAPHIC_SERVICE_PRICES: Record<string, number> = {
  music_artwork: 5500,
  flyer: 6500,
  wedding_card: 7500,
  business_card: 7500,
  birthday_card: 7500,
  poster: 9500,
  logo_design: 9500,
  tshirt_design: 9500,
  sticker_design: 9500,
  album_cover: 9500,
  book_cover: 9500,
  banner_design: 10500,
};

function publicRecord(record: ReturnType<typeof servicePaymentRepository.findById>) {
  if (!record) return null;

  return {
    id: record.id,
    serviceType: record.serviceType,
    customerName: record.customerName,
    customerEmail: record.customerEmail,
    description: record.description,
    amount: record.amount,
    currency: record.currency,
    status: record.status,
    paymentReference: record.paymentReference,
    paidAt: record.paidAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function createServicePaymentRouter(
  createRateLimit: RequestHandler,
): Router {
  const router = express.Router();

  router.post("/", createRateLimit, async (req: Request, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const serviceType = cleanString(req.body?.serviceType, 40);
      const customerName = cleanString(req.body?.customerName, 120);
      const customerPhone = cleanString(req.body?.customerPhone, 32);
      const customerEmail = cleanString(req.body?.customerEmail, 160);
      const description = cleanString(req.body?.description, 1000);
      const amount = Number(req.body?.amount);
      const graphicId = cleanString(req.body?.graphicId, 80);
      const graphicTotal = Number(req.body?.graphicTotal);
      const websiteTotal = Number(req.body?.websiteTotal);
      const paymentMode = cleanString(req.body?.paymentMode, 20);
      const projectReference = cleanString(req.body?.projectReference, 120);

      if (!isServiceType(serviceType)) {
        return res.status(400).json({ error: "Choose Graphic Design, Web Development, or Both." });
      }

      if (!["deposit", "full", "balance"].includes(paymentMode)) {
        return res.status(400).json({ error: "Choose a valid payment option." });
      }

      if (customerName.length < 2) {
        return res.status(400).json({ error: "Your name is required." });
      }

      if (!isValidPhone(customerPhone)) {
        return res.status(400).json({ error: "Enter a valid phone number." });
      }

      if (!isValidEmail(customerEmail)) {
        return res.status(400).json({ error: "Enter a valid email address." });
      }

      if (description.length < 3) {
        return res.status(400).json({ error: "Please provide a brief description." });
      }

      if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
        return res.status(400).json({ error: "Enter a valid amount between MWK 1 and MWK 100,000,000." });
      }

      if (!Number.isInteger(amount * 100)) {
        return res.status(400).json({ error: "Amount can have at most two decimal places." });
      }

      const needsGraphic = serviceType === "graphic_design" || serviceType === "both";
      const needsWebsite = serviceType === "website_development" || serviceType === "both";

      if (paymentMode === "balance") {
        if (projectReference.length < 3) {
          return res.status(400).json({ error: "Enter your existing project reference." });
        }

        let expectedBalance = 0;

        if (needsGraphic) {
          let graphicProjectTotal = 0;

          if (graphicId === "custom") {
            if (!Number.isFinite(graphicTotal) || graphicTotal <= 0) {
              return res.status(400).json({ error: "Enter the agreed graphic design price." });
            }
            graphicProjectTotal = graphicTotal;
          } else if (graphicId && Object.prototype.hasOwnProperty.call(GRAPHIC_SERVICE_PRICES, graphicId)) {
            graphicProjectTotal = GRAPHIC_SERVICE_PRICES[graphicId];
          } else {
            return res.status(400).json({ error: "Choose a valid graphic design service." });
          }

          expectedBalance += Math.round((graphicProjectTotal / 2) * 100) / 100;
        }

        if (needsWebsite) {
          if (!Number.isFinite(websiteTotal) || websiteTotal < 80_000) {
            return res.status(400).json({ error: "Enter the agreed website project price." });
          }
          if (!Number.isFinite(amount) || amount <= expectedBalance || amount > websiteTotal + expectedBalance) {
            return res.status(400).json({ error: "Enter a valid remaining website balance." });
          }
        } else if (Math.abs(amount - expectedBalance) > 0.01) {
          return res.status(400).json({
            error: "The graphic design final balance must be 50% of the listed project price.",
          });
        }
      } else {
        let expectedProjectTotal = 0;

        if (needsGraphic) {
          if (!graphicId) {
            return res.status(400).json({ error: "Choose the graphic design service." });
          }

          if (graphicId === "custom") {
            if (!Number.isFinite(graphicTotal) || graphicTotal <= 0) {
              return res.status(400).json({ error: "Enter the agreed graphic design price." });
            }
            expectedProjectTotal += graphicTotal;
          } else {
            const expectedGraphicPrice = GRAPHIC_SERVICE_PRICES[graphicId];
            if (!expectedGraphicPrice) {
              return res.status(400).json({ error: "Choose a valid graphic design service." });
            }
            expectedProjectTotal += expectedGraphicPrice;
          }
        }

        if (needsWebsite) {
          if (!Number.isFinite(websiteTotal) || websiteTotal < 80_000) {
            return res.status(400).json({ error: "Website projects start at MWK 80,000." });
          }
          expectedProjectTotal += websiteTotal;
        }

        const expectedAmount =
          paymentMode === "full"
            ? expectedProjectTotal
            : Math.round((expectedProjectTotal / 2) * 100) / 100;

        if (Math.abs(amount - expectedAmount) > 0.01) {
          return res.status(400).json({
            error: paymentMode === "deposit"
              ? "The deposit must be exactly 50% of the project price."
              : "The payment amount must match the project price.",
          });
        }
      }

      const result = await createXhovileStudioServicePayment({
        serviceType,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        description,
        amount,
      });

      return res.status(201).json({
        success: true,
        servicePayment: publicRecord(result.servicePayment),
        reference: result.reference,
        checkoutUrl: result.checkoutUrl,
      });
    } catch (error) {
      console.error("[ServicePayments] Failed to create Xhovile Studio payment:", error);
      return res.status(502).json({
        error: error instanceof Error ? error.message : "Unable to start payment checkout.",
      });
    }
  });

  router.get("/:reference", async (req: Request, res) => {
    res.setHeader("Cache-Control", "no-store");
    const reference = cleanString(req.params.reference, 180);

    if (!reference) {
      return res.status(400).json({ error: "Payment reference is required." });
    }

    const servicePayment = servicePaymentRepository.findByReference(reference);
    if (!servicePayment) {
      return res.status(404).json({ error: "Service payment not found." });
    }

    if (servicePayment.status === "pending") {
      try {
        await verifyXhovileStudioServicePayment(reference);
      } catch (error) {
        console.warn("[ServicePayments] Public status verification failed:", error);
      }
    }

    const refreshed = servicePaymentRepository.findByReference(reference);
    return res.json({
      success: true,
      servicePayment: publicRecord(refreshed),
    });
  });

  return router;
}
