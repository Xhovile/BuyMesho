import type { Request, Response } from "express";
import { serverPaymentService } from "./payment.service.js";
import {
  verifyXhovileStudioServicePayment,
} from "../services/service-payment.service.js";
import { servicePaymentRepository } from "../services/service-payment.repository.js";

function getFrontendReturnBaseUrl(): string {
  return (
    process.env.PAYCHANGU_FRONTEND_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://buymesho.app"
  ).replace(/\/$/, "");
}

function redirectToPaymentReturn(
  res: Response,
  params: Record<string, string | null | undefined>,
  pathname = "/payment/return",
): void {
  const url = new URL(pathname, getFrontendReturnBaseUrl());
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  res.redirect(303, url.toString());
}

export async function payChanguCallbackHandler(req: Request, res: Response): Promise<void> {
  const txRef = String(req.query.tx_ref ?? req.query.txRef ?? req.query.reference ?? "").trim();

  if (!txRef) {
    redirectToPaymentReturn(res, { status: "failed" });
    return;
  }

  try {
    if (/^PAYCHANGU-svc_/i.test(txRef) && await servicePaymentRepository.findByReference(txRef)) {
      const verification = await verifyXhovileStudioServicePayment(txRef);
      redirectToPaymentReturn(
        res,
        {
          tx_ref: txRef,
          reference: txRef,
          status: verification.verified ? "success" : "failed",
        },
        "/Services/XhovileStudio/receipt",
      );
      return;
    }

    const verification = await serverPaymentService.verifyPaychanguPayment(txRef);
    redirectToPaymentReturn(res, {
      tx_ref: txRef,
      status: verification.verified ? "success" : "failed",
    });
  } catch (error) {
    console.error("[PayChangu] Callback verification failed:", error);
    redirectToPaymentReturn(
      res,
      { tx_ref: txRef, status: "failed" },
      /^PAYCHANGU-svc_/i.test(txRef) && (await servicePaymentRepository.findByReference(txRef))
        ? "/Services/XhovileStudio/receipt"
        : "/payment/return",
    );
  }
}

export async function payChanguReturnHandler(req: Request, res: Response): Promise<void> {
  const txRef = String(req.query.tx_ref ?? req.query.txRef ?? req.query.reference ?? "").trim();
  const status = String(req.query.status ?? "failed").trim().toLowerCase() || "failed";

  redirectToPaymentReturn(
    res,
    {
      tx_ref: txRef || undefined,
      status,
    },
    /^PAYCHANGU-svc_/i.test(txRef) && await servicePaymentRepository.findByReference(txRef)
      ? "/Services/XhovileStudio/receipt"
      : "/payment/return",
  );
}
