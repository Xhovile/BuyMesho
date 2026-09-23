import type { Request, Response } from "express";
import { serverPaymentService } from "./payment.service.js";
import {
  verifyXhovileStudioServicePayment,
} from "../services/service-payment.service.js";
import { createXhovileStudioReceiptAccessToken } from "../services/studio-receipt-access.js";

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
  const fragmentParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    if (key === "token") {
      fragmentParams.set(key, value);
    } else {
      url.searchParams.set(key, value);
    }
  }

  if (fragmentParams.size > 0) {
    url.hash = fragmentParams.toString();
  }

  res.redirect(303, url.toString());
}

export async function payChanguCallbackHandler(req: Request, res: Response): Promise<void> {
  const txRef = String(req.query.tx_ref ?? req.query.txRef ?? req.query.reference ?? "").trim();

  if (!txRef) {
    redirectToPaymentReturn(res, { status: "failed" });
    return;
  }

  const isStudioReference = /^PAYCHANGU-svc_/i.test(txRef);

  try {
    if (isStudioReference) {
      const verification = await verifyXhovileStudioServicePayment(txRef);
      const receiptToken = createXhovileStudioReceiptAccessToken(txRef);
      redirectToPaymentReturn(
        res,
        {
          tx_ref: txRef,
          reference: txRef,
          token: receiptToken,
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
    if (isStudioReference) {
      try {
        const receiptToken = createXhovileStudioReceiptAccessToken(txRef);
        redirectToPaymentReturn(
          res,
          { tx_ref: txRef, reference: txRef, token: receiptToken, status: "failed" },
          "/Services/XhovileStudio/receipt",
        );
      } catch {
        redirectToPaymentReturn(
          res,
          { tx_ref: txRef, status: "failed" },
          "/Services/XhovileStudio/receipt",
        );
      }
      return;
    }

    redirectToPaymentReturn(res, { tx_ref: txRef, status: "failed" });
  }
}

export async function payChanguReturnHandler(req: Request, res: Response): Promise<void> {
  const txRef = String(req.query.tx_ref ?? req.query.txRef ?? req.query.reference ?? "").trim();
  const status = String(req.query.status ?? "failed").trim().toLowerCase() || "failed";

  if (/^PAYCHANGU-svc_/i.test(txRef)) {
    try {
      const receiptToken = createXhovileStudioReceiptAccessToken(txRef);
      redirectToPaymentReturn(
        res,
        {
          tx_ref: txRef || undefined,
          status,
          token: receiptToken,
        },
        "/Services/XhovileStudio/receipt",
      );
    } catch {
      redirectToPaymentReturn(
        res,
        { tx_ref: txRef || undefined, status },
        "/Services/XhovileStudio/receipt",
      );
    }
    return;
  }

  redirectToPaymentReturn(res, {
    tx_ref: txRef || undefined,
    status,
  });
}
