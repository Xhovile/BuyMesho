import express, { type Request, type RequestHandler, type Router } from "express";
import { createHash } from "node:crypto";
import multer from "multer";
import {
  GRAPHIC_SERVICE_PRICE_MAP,
  MIN_WEBSITE_PROJECT_TOTAL,
} from "../../../src/shared/studioPricing.js";
import {
  createXhovileStudioServicePayment,
  ServicePaymentIdempotencyConflictError,
  verifyXhovileStudioServicePayment,
} from "./service-payment.service.js";
import {
  servicePaymentRepository,
  type ServicePaymentType,
} from "./service-payment.repository.js";
import { buildXhovileStudioReceiptPdf } from "./service-payment.receipt.js";

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidEmail(value: string): boolean {
  return !value || /^\S+@\S+\.\S+$/.test(value);
}

function isValidPhone(value: string): boolean {
  return /^\+?[0-9][0-9\s-]{6,30}$/.test(value);
}

function getIdempotencyKey(req: Request): string {
  const headerValue = req.headers["idempotency-key"];
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return cleanString(raw ?? req.body?.idempotencyKey, 200);
}

function buildCheckoutRequestHash(input: {
  serviceType: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  description: string;
  amount: number;
  graphicId: string;
  graphicTotal: number;
  websiteTotal: number;
  paymentMode: string;
  projectReference: string;
  referenceFiles: Array<{
    kind: "image" | "video";
    originalName: string;
    mimeType: string;
    size: number;
  }>;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        ...input,
        referenceFiles: input.referenceFiles.map((file) => ({
          kind: file.kind,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
        })),
      }),
    )
    .digest("hex");
}

function isServiceType(value: string): value is ServicePaymentType {
  return value === "graphic_design" || value === "website_development" || value === "both";
}

function publicRecord(record: Awaited<ReturnType<typeof servicePaymentRepository.findById>>) {
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
  statusRateLimit: RequestHandler,
): Router {
  const router = express.Router();
  const referenceUpload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 5, fileSize: 10 * 1024 * 1024, fields: 30 },
    fileFilter: (_req, file, callback) => {
      if (file.fieldname === "referenceImages" && file.mimetype.startsWith("image/")) {
        callback(null, true);
        return;
      }
      if (file.fieldname === "referenceVideo" && file.mimetype.startsWith("video/")) {
        callback(null, true);
        return;
      }
      callback(new Error(
        file.fieldname === "referenceImages"
          ? "Only image files can be added as image references."
          : "Only one video reference is supported.",
      ));
    },
  }).fields([
    { name: "referenceImages", maxCount: 4 },
    { name: "referenceVideo", maxCount: 1 },
  ]);

  router.post(
    "/",
    createRateLimit,
    (req: Request, res, next) => {
      referenceUpload(req, res, (error) => {
        if (error instanceof multer.MulterError) {
          const message =
            error.code === "LIMIT_FILE_SIZE"
              ? "Each reference file must be 10 MB or smaller."
              : error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE"
                ? "You can attach up to 4 images and 1 video."
                : "Reference upload could not be processed.";
          return res.status(400).json({ error: message });
        }
        if (error) {
          return res.status(400).json({
            error: error instanceof Error ? error.message : "Reference upload could not be processed.",
          });
        }
        next();
      });
    },
    async (req: Request, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const idempotencyKey = cleanString(req.headers["idempotency-key"], 200);

      if (!idempotencyKey) {
        return res.status(400).json({
          error: "Idempotency-Key header is required for Studio payments.",
          code: "IDEMPOTENCY_KEY_REQUIRED",
        });
      }

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
      const uploadedFiles = (req.files ?? {}) as {
        referenceImages?: Express.Multer.File[];
        referenceVideo?: Express.Multer.File[];
      };
      const referenceFiles = [
        ...(uploadedFiles.referenceImages ?? []).map((file) => ({ file, kind: "image" as const })),
        ...(uploadedFiles.referenceVideo ?? []).map((file) => ({ file, kind: "video" as const })),
      ];

      if (referenceFiles.length > 5) {
        return res.status(400).json({ error: "You can attach up to 4 images and 1 video." });
      }

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

      if (Number(amount.toFixed(2)) !== amount) {
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
          } else if (graphicId && Object.prototype.hasOwnProperty.call(GRAPHIC_SERVICE_PRICE_MAP, graphicId)) {
            graphicProjectTotal = GRAPHIC_SERVICE_PRICE_MAP[graphicId];
          } else {
            return res.status(400).json({ error: "Choose a valid graphic design service." });
          }

          expectedBalance += Math.round((graphicProjectTotal / 2) * 100) / 100;
        }

        if (needsWebsite) {
          if (!Number.isFinite(websiteTotal) || websiteTotal < MIN_WEBSITE_PROJECT_TOTAL) {
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
            const expectedGraphicPrice = GRAPHIC_SERVICE_PRICE_MAP[graphicId];
            if (!expectedGraphicPrice) {
              return res.status(400).json({ error: "Choose a valid graphic design service." });
            }
            expectedProjectTotal += expectedGraphicPrice;
          }
        }

        if (needsWebsite) {
          if (!Number.isFinite(websiteTotal) || websiteTotal < MIN_WEBSITE_PROJECT_TOTAL) {
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

      const idempotencyKey = getIdempotencyKey(req);
      if (!idempotencyKey) {
        return res.status(400).json({
          error: "Idempotency-Key header is required to start a payment checkout.",
          code: "IDEMPOTENCY_KEY_REQUIRED",
        });
      }

      const requestHash = buildCheckoutRequestHash({
        serviceType,
        customerName,
        customerPhone,
        customerEmail,
        description,
        amount,
        graphicId,
        graphicTotal,
        websiteTotal,
        paymentMode,
        projectReference,
        referenceFiles: referenceFiles.map(({ file, kind }) => ({
          kind,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        })),
      });

      const existing = await servicePaymentRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        if (
          existing.checkoutRequestHash &&
          existing.checkoutRequestHash !== requestHash
        ) {
          return res.status(409).json({
            error: "This Idempotency-Key was already used for a different checkout request.",
            code: "IDEMPOTENCY_KEY_REUSED",
          });
        }

        if (existing.checkoutUrl && existing.paymentReference) {
          return res.status(200).json({
            success: true,
            idempotentReplay: true,
            servicePayment: publicRecord(existing),
            reference: existing.paymentReference,
            checkoutUrl: existing.checkoutUrl,
          });
        }

        if (existing.status === "failed") {
          return res.status(409).json({
            error: "The previous checkout attempt failed. Start a new checkout.",
            code: "CHECKOUT_FAILED_RETRY",
          });
        }

        return res.status(409).json({
          error: "This checkout is still being initialized. Please try again shortly.",
          code: "CHECKOUT_IN_PROGRESS",
        });
      }

      const result = await createXhovileStudioServicePayment({
        serviceType,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        description,
        amount,
        paymentMode: paymentMode as "deposit" | "full" | "balance",
        projectTotal: paymentMode === "balance" ? null : (
          (needsGraphic ? graphicTotal : 0) +
          (needsWebsite ? websiteTotal : 0)
        ),
        projectReference: paymentMode === "balance" ? projectReference : null,
        graphicId: needsGraphic ? graphicId : null,
        idempotencyKey,
        requestHash,
        referenceFiles,
        idempotencyKey,
      });

      return res.status(201).json({
        success: true,
        servicePayment: publicRecord(result.servicePayment),
        reference: result.reference,
        checkoutUrl: result.checkoutUrl,
      });
    } catch (error) {
      if (error instanceof ServicePaymentIdempotencyConflictError) {
        return res.status(409).json({
          error: error.message,
          code: error.code,
        });
      }

      console.error("[ServicePayments] Failed to create Xhovile Studio payment:", error);
      return res.status(502).json({
        error: error instanceof Error ? error.message : "Unable to start payment checkout.",
      });
    }
  });

  router.get("/:reference/receipt.pdf", statusRateLimit, async (req: Request, res) => {
    res.setHeader("Cache-Control", "no-store");
    const reference = cleanString(req.params.reference, 180);

    if (!reference) {
      return res.status(400).json({ error: "Payment reference is required." });
    }

    let servicePayment = await servicePaymentRepository.findByReference(reference);
    if (!servicePayment) {
      return res.status(404).json({ error: "Service payment not found." });
    }

    if (servicePayment.status === "pending") {
      try {
        await verifyXhovileStudioServicePayment(reference);
      } catch (error) {
        console.warn("[ServicePayments] Receipt verification failed:", error);
      }
      servicePayment = await servicePaymentRepository.findByReference(reference);
    }

    if (!servicePayment) {
      return res.status(404).json({ error: "Service payment not found." });
    }

    if (servicePayment.status !== "paid") {
      return res.status(409).json({
        error: "This payment has not been confirmed as paid yet.",
        status: servicePayment.status,
      });
    }

    const pdf = buildXhovileStudioReceiptPdf(servicePayment);
    const safeReference = reference.replace(/[^a-zA-Z0-9._-]/g, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="xhovile-studio-receipt-${safeReference}.pdf"`);
    res.setHeader("Content-Length", String(pdf.length));
    return res.status(200).send(pdf);
  });

  router.get("/:reference", statusRateLimit, async (req: Request, res) => {
    res.setHeader("Cache-Control", "no-store");
    const reference = cleanString(req.params.reference, 180);

    if (!reference) {
      return res.status(400).json({ error: "Payment reference is required." });
    }

    const servicePayment = await servicePaymentRepository.findByReference(reference);
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

    const refreshed = await servicePaymentRepository.findByReference(reference);
    return res.json({
      success: true,
      servicePayment: publicRecord(refreshed),
    });
  });

  return router;
}
