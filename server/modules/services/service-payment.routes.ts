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

      if (!isServiceType(serviceType)) {
        return res.status(400).json({ error: "Choose Graphic Design or Website Development." });
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
