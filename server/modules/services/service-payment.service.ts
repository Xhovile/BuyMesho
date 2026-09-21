import { paychanguProvider } from "../payments/paychangu.provider.js";
import {
  createServerPaymentConfigFromEnv,
  serverPaymentService,
} from "../payments/payment.service.js";
import { paymentRepository } from "../payments/payment.repository.js";
import type { PaymentVerificationResult } from "../../../src/modules/payments/types.js";
import {
  servicePaymentRepository,
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
}

export async function createXhovileStudioServicePayment(
  input: CreateServicePaymentInput,
): Promise<{ servicePayment: ServicePaymentRecord; checkoutUrl: string; reference: string }> {
  const servicePayment = servicePaymentRepository.create({
    ...input,
    currency: "MWK",
  });

  try {
    const payment = await serverPaymentService.createPayment({
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
      },
    });

    const checkoutUrl = payment.checkoutUrl?.trim();
    if (!checkoutUrl) {
      throw new Error("PayChangu did not return a checkout URL");
    }

    const updated = servicePaymentRepository.attachPayment({
      id: servicePayment.id,
      paymentId: String(payment.id),
      reference: payment.reference,
      providerReference: payment.providerReference ?? null,
    });

    if (!updated) {
      throw new Error("Service payment record disappeared during checkout setup");
    }

    return {
      servicePayment: updated,
      checkoutUrl,
      reference: payment.reference,
    };
  } catch (error) {
    const failed = servicePaymentRepository.findById(servicePayment.id);
    if (failed?.paymentReference) servicePaymentRepository.markFailed(failed.paymentReference);
    throw error;
  }
}

export async function isXhovileStudioServicePaymentReference(
  reference: string,
): Promise<boolean> {
  return Boolean(servicePaymentRepository.findByReference(reference));
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
  const servicePayment = servicePaymentRepository.findByReference(requestedReference);

  if (!servicePayment) {
    return {
      verified: false,
      provider: "paychangu",
      txRef: requestedReference,
      reference: requestedReference,
      status: "unknown",
      failureReason: "Service payment not found",
    };
  }

  if (servicePayment.status === "paid") {
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
      servicePaymentRepository.markFailed(requestedReference);
    }

    return {
      ...verification,
      verified: false,
      orderId: servicePayment.id,
      failureReason:
        verification.failureReason ??
        "PayChangu payment did not exactly match the requested service payment",
    };
  }

  const payment = await paymentRepository.findByReferenceAsync(requestedReference);
  if (payment) {
    await paymentRepository.updateByReferenceAsync(requestedReference, (current) => ({
      ...current,
      status: "captured",
      verified: true,
      paidAt: new Date().toISOString(),
      verification: {
        ...verification,
        verified: true,
        orderId: servicePayment.id,
      },
      updatedAt: new Date().toISOString(),
    }));
  }

  servicePaymentRepository.markPaid(requestedReference);

  return {
    ...verification,
    verified: true,
    reference: requestedReference,
    txRef: requestedReference,
    orderId: servicePayment.id,
  };
}

