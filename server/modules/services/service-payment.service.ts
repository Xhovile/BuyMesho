import { createHash } from "node:crypto";
import { paychanguProvider } from "../payments/paychangu.provider.js";
import {
  deleteCloudinaryAsset,
  uploadBufferToCloudinaryAsset,
  type CloudinaryUploadAsset,
} from "../../lib/cloudinaryUpload.js";
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

export class ServicePaymentIdempotencyConflictError extends Error {
  readonly code = "STUDIO_IDEMPOTENCY_KEY_REUSED";

  constructor() {
    super("This payment attempt has already been used for different Studio checkout data.");
    this.name = "ServicePaymentIdempotencyConflictError";
  }
}

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

function hashServicePaymentRequest(input: CreateServicePaymentInput): string {
  const files = (input.referenceFiles ?? []).map((reference) => ({
    kind: reference.kind,
    originalName: reference.file.originalname,
    mimeType: reference.file.mimetype,
    sizeBytes: reference.file.size,
    sha256: createHash("sha256").update(reference.file.buffer).digest("hex"),
  }));

  const payload = {
    serviceType: input.serviceType,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail ?? null,
    description: input.description,
    amount: input.amount,
    paymentMode: input.paymentMode ?? null,
    projectTotal: input.projectTotal ?? null,
    projectReference: input.projectReference ?? null,
    graphicId: input.graphicId ?? null,
    files,
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function isSameRequest(
  payment: ServicePaymentRecord,
  requestHash: string,
): boolean {
  return payment.idempotencyRequestHash === requestHash;
}

export async function createXhovileStudioServicePayment(
  input: CreateServicePaymentInput & { idempotencyKey: string },
): Promise<{
  servicePayment: ServicePaymentRecord;
  checkoutUrl: string;
  reference: string;
}> {
  const requestHash = hashServicePaymentRequest(input);
  const existing = await servicePaymentRepository.findByIdempotencyKey(input.idempotencyKey);

  if (existing) {
    if (!isSameRequest(existing, requestHash)) {
      throw new ServicePaymentIdempotencyConflictError();
    }

    if (existing.checkoutUrl && existing.paymentReference) {
      return {
        servicePayment: existing,
        checkoutUrl: existing.checkoutUrl,
        reference: existing.paymentReference,
      };
    }
  }

  const servicePayment = existing ?? await servicePaymentRepository.create({
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
    idempotencyKey: input.idempotencyKey,
    idempotencyRequestHash: requestHash,
  });

  const uploadedAssets: CloudinaryUploadAsset[] = [];
  let mediaPersisted = false;

  try {
    if (!servicePayment.referenceMedia.length && (input.referenceFiles ?? []).length) {
      const referenceMedia = [];

      for (const reference of input.referenceFiles ?? []) {
        const asset = await uploadBufferToCloudinaryAsset(
          {
            buffer: reference.file.buffer,
            mimetype: reference.file.mimetype,
          },
          { folder: "xhovile-studio/references" },
        );

        uploadedAssets.push(asset);
        referenceMedia.push({
          kind: reference.kind,
          url: asset.secureUrl,
          originalName: reference.file.originalname,
          mimeType: reference.file.mimetype,
          sizeBytes: reference.file.size,
          publicId: asset.publicId,
          resourceType: asset.resourceType,
        });
      }

      if (referenceMedia.length) {
        await servicePaymentRepository.updateReferenceMedia(
          servicePayment.id,
          referenceMedia,
        );
        mediaPersisted = true;
      }
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
      checkoutUrl,
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
    if (mediaPersisted && uploadedAssets.length) {
      await servicePaymentRepository.updateReferenceMedia(servicePayment.id, []);
    }

    for (const asset of [...uploadedAssets].reverse()) {
      try {
        await deleteCloudinaryAsset(asset);
      } catch (cleanupError) {
        console.error(
          "[XhovileStudio] Failed to clean up Cloudinary reference:",
          cleanupError instanceof Error ? cleanupError.message : cleanupError,
        );
      }
    }

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

  const expectedAmountCents = Number.isFinite(payment.amount)
    ? Math.round(payment.amount * 100)
    : NaN;
  const actualAmountCents = Number.isFinite(actualAmount)
    ? Math.round(actualAmount * 100)
    : NaN;

  return (
    verification.verified === true &&
    Number.isSafeInteger(actualAmountCents) &&
    Number.isSafeInteger(expectedAmountCents) &&
    actualAmountCents === expectedAmountCents &&
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
