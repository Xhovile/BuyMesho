import assert from "node:assert/strict";
import test from "node:test";
import {
  toPublicRecord,
  type ServicePaymentRecord,
} from "../service-payment.repository.js";

test("Studio public payment records exclude private and admin-only fields", () => {
  const record: ServicePaymentRecord = {
    id: "svc_test",
    serviceType: "graphic_design",
    customerName: "Customer",
    customerPhone: "+265 999 000 000",
    customerEmail: "customer@example.com",
    description: "Private customer brief",
    amount: 50000,
    currency: "MWK",
    status: "paid",
    paymentMode: "full",
    projectTotal: 50000,
    projectReference: "PROJ-123",
    graphicId: "logo-design",
    referenceMedia: [{
      kind: "image",
      url: "https://example.com/reference.png",
      originalName: "reference.png",
      mimeType: "image/png",
      sizeBytes: 100,
      publicId: "reference",
      resourceType: "image",
    }],
    providerReference: "paychangu-provider-ref",
    paymentReference: "PAYCHANGU-svc_test",
    checkoutUrl: "https://paychangu.example/checkout",
    idempotencyKey: "idem-test",
    idempotencyRequestHash: "hash-test",
    paidAt: "2026-09-23T15:00:00.000Z",
    createdAt: "2026-09-23T14:00:00.000Z",
    updatedAt: "2026-09-23T15:00:00.000Z",
    successNotificationStatus: "sent",
    successNotificationSentAt: "2026-09-23T15:01:00.000Z",
    successNotificationError: null,
  };

  const publicRecord = toPublicRecord(record);

  assert.deepEqual(publicRecord, {
    id: "svc_test",
    serviceType: "graphic_design",
    customerName: "Customer",
    customerEmail: "customer@example.com",
    description: "Private customer brief",
    amount: 50000,
    currency: "MWK",
    status: "paid",
    paymentReference: "PAYCHANGU-svc_test",
    paidAt: "2026-09-23T15:00:00.000Z",
    createdAt: "2026-09-23T14:00:00.000Z",
    updatedAt: "2026-09-23T15:00:00.000Z",
  });

  assert.equal("customerPhone" in (publicRecord ?? {}), false);
  assert.equal("referenceMedia" in (publicRecord ?? {}), false);
  assert.equal("projectReference" in (publicRecord ?? {}), false);
  assert.equal("checkoutUrl" in (publicRecord ?? {}), false);
  assert.equal("idempotencyKey" in (publicRecord ?? {}), false);
});
