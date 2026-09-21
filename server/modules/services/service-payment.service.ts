import { paychanguProvider } from "../payments/paychangu.provider.js";
import { uploadBufferToCloudinary } from "../../lib/cloudinaryUpload.js";
import { createServerPaymentConfigFromEnv } from "../payments/payment.service.js";
import type { PaymentVerificationResult } from "../../../src/modules/payments/types.js";
import { sendEmail } from "../email/email.service.js";
import { renderXhovileStudioPaymentSuccessEmail } from "../email/templates/xhovile-studio-payment-success.js";
import {
  servicePaymentRepository,
  type ServicePaymentMode,
  type ServicePaymentRecord,
  type ServicePaymentType,
} from "./service-payment.repository.js";

export interface CreateServicePaymentInput {
  serviceType: ServicePaymentType;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  description: string;
  amount: number;
  paymentMode?: ServicePaymentMode | null;
  projectTotal?: number | null;
  projectReference?: string | null;
  graphicId?: string | null;
  referenceFiles?: Array<{
    file: Express.Multer.File;
    kind: "image" | "video";
  }>;
}

export async function notifyXhovileStudioSuccessfulPayment(
  reference: string,
): Promise<void> {
  const claimed = await servicePaymentRepository.claimSuccessNotification(reference);
  if (!claimed) return;

  try {
    const { text, html } = renderXhovileStudioPaymentSuccessEmail(claimed);

    const notificationEmail =
      process.env.XHOVILE_STUDIO_NOTIFICATION_EMAIL?.trim() ||
      "xhovilepublications@gmail.com";

    await sendEmail({
      sender: "notifications",
      to: {
        email: notificationEmail,
        name: "Xhovilé Studio",
      },
      subject: `Xhovilé Studio payment received — ${claimed.customerName}`,
      text,
      html,
    });

    await servicePaymentRepository.markSuccessNotificationSent(reference);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await servicePaymentRepository.markSuccessNotificationFailed(reference, message);
    console.error(
      "[XhovileStudio] Successful payment email failed:",
      message,
    );
  }
}

export async function createXhovileStudioServicePayment(
  input: CreateServicePaymentInput,
): Promise<{
  servicePayment: ServicePaymentRecord;
  checkoutUrl: string;
  reference: string;
}> {
  const servicePayment = await servicePaymentRepository.create({
    serviceType: input.serviceType,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    description: input.description,
    amount: input.amount,
    currency: "MWK",
    paymentMode: input.paymentMode,
    projectTotal: input.projectTotal,
    projectReference: input.projectReference,
    graphicId: input.graphicId,
  });

  try {
    const referenceMedia = [];
    for (const reference of input.referenceFiles ?? []) {
      const url = await uploadBufferToCloudinary(
        {
          buffer: reference.file.buffer,
          mimetype: reference.file.mimetype,
        },
        { folder: "xhovile-studio/references" },
      );
      referenceMedia.push({
        kind: reference.kind,
        url,
        originalName: reference.file.originalname,
        mimeType: reference.file.mimetype,
        sizeBytes: reference.file.size,
      });
    }

    if (referenceMedia.length) {
      await servicePaymentRepository.updateReferenceMedia(servicePayment.id, referenceMedia);
    }

    const payment = await paychanguProvider.createPayment(
      {
        orderId: servicePayment.id,
        provider: "paychangu",
        method: "mobile_money",
        amount: { amount: input.amount, currency: "MWK" },
        customer: {
          name: input.customerName,
          email: input.customerEmail || undefined,
          phoneNumber: input.customerPhone,
        },
        metadata: {
          paymentType: "xhovile_studio_service",
          servicePaymentId: servicePayment.id,
          serviceType: input.serviceType,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail || undefined,
          description: input.description,
          paymentMode: input.paymentMode || undefined,
          projectTotal: input.projectTotal ?? undefined,
          projectReference: input.projectReference || undefined,
          graphicId: input.graphicId || undefined,
        },
      },
      createServerPaymentConfigFromEnv(),
    );

    const checkoutUrl = payment.checkoutUrl?.trim();
    if (!checkoutUrl) {
      throw new Error("PayChangu did not return a checkout URL");
    }

    const updated = await servicePaymentRepository.attachPayment({
      id: servicePayment.id,
      reference: payment.reference,
      providerReference: payment.providerReference ?? null,
    });

    if (!updated) {
      throw new Error("Studio payment record disappeared during checkout setup");
    }

    return {
      servicePayment: updated,
      checkoutUrl,
      reference: payment.reference,
    };
  } catch (error) {
    await servicePaymentRepository.markFailedById(servicePayment.id);
    throw error;
  }
}

export async function isXhovileStudioServicePaymentReference(
  reference: string,
): Promise<boolean> {
  return Boolean(await servicePaymentRepository.findByReference(reference));
}

function paymentVerificationMatchesService(
  payment: ServicePaymentRecord,
  verification: PaymentVerificationResult,
): boolean {
  const actualAmount = verification.amount?.amount;
  const actualCurrency = String(
    verification.amount?.currency ?? verification.currency ?? "",
  ).trim().toUpperCase();

  return (
    verification.verified === true &&
    Number.isFinite(actualAmount) &&
    actualAmount === payment.amount &&
    actualCurrency === payment.currency.toUpperCase()
  );
}

export async function verifyXhovileStudioServicePayment(
  reference: string,
): Promise<PaymentVerificationResult> {
  const requestedReference = reference.trim();
  const servicePayment =
    await servicePaymentRepository.findByReference(requestedReference);

  if (!servicePayment) {
    return {
      verified: false,
      provider: "paychangu",
      txRef: requestedReference,
      reference: requestedReference,
      status: "unknown",
      failureReason: "Studio payment not found",
    };
  }

  if (servicePayment.status === "paid") {
    await notifyXhovileStudioSuccessfulPayment(requestedReference);

    return {
      verified: true,
      provider: "paychangu",
      txRef: requestedReference,
      reference: requestedReference,
      status: "paid",
      currency: servicePayment.currency,
      amount: {
        amount: servicePayment.amount,
        currency: servicePayment.currency,
      },
      orderId: servicePayment.id,
    };
  }

  const verification = await paychanguProvider.verifyPayment(
    requestedReference,
    createServerPaymentConfigFromEnv(),
  );

  if (!paymentVerificationMatchesService(servicePayment, verification)) {
    if (
      verification.verified === false &&
      ["failed", "cancelled", "canceled", "expired", "declined"].includes(
        String(verification.status ?? "").toLowerCase(),
      )
    ) {
      await servicePaymentRepository.markFailed(requestedReference);
    }

    return {
      ...verification,
      verified: false,
      orderId: servicePayment.id,
      failureReason:
        verification.failureReason ??
        "PayChangu payment did not exactly match the requested Studio payment",
    };
  }

  await servicePaymentRepository.markPaid(requestedReference);
  await notifyXhovileStudioSuccessfulPayment(requestedReference);

  return {
    ...verification,
    verified: true,
    reference: requestedReference,
    txRef: requestedReference,
    orderId: servicePayment.id,
  };
}
