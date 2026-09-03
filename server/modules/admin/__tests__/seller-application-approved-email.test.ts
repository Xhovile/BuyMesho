import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express, { type RequestHandler } from "express";
import { createAdminModerationRouter } from "../admin.moderation.routes.js";
import { notifySellerApplicationApproved } from "../../notifications/seller-application-approved.notification.js";

test("approved seller application email uses the applicant, transactional sender, and approval subject", async () => {
  const messages: Array<Record<string, unknown>> = [];

  await notifySellerApplicationApproved(
    {
      applicantEmail: "seller@example.com",
      fullLegalName: "Ada Seller",
      businessName: "Ada's Shop",
    },
    {
      send: async (message) => {
        messages.push(message);
        return { messageId: "brevo-message-id" };
      },
    },
  );

  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, "transactional");
  assert.deepEqual(messages[0].to, { email: "seller@example.com", name: "Ada Seller" });
  assert.equal(messages[0].subject, "Your BuyMesho seller application has been approved");
  assert.match(messages[0].text as string, /Ada's Shop/);
  assert.match(messages[0].html as string, /Ada&#39;s Shop/);
});

test("approval invokes the email once and does not resend after the application is reviewed", async () => {
  const application = {
    id: 9,
    status: "pending",
    applicant_uid: "seller-uid",
    applicant_email: "seller@example.com",
    full_legal_name: "Ada Seller",
    business_name: "Ada's Shop",
    institution: "University",
  };
  const db = {
    prepare: (sql: string) => ({
      get: () => {
        if (/SELECT \*\s+FROM seller_applications/i.test(sql)) return application;
        if (/SELECT\s+id,\s+status,/i.test(sql)) return application;
        return undefined;
      },
      run: (...params: unknown[]) => {
        if (/UPDATE seller_applications\s+SET/i.test(sql)) application.status = params[0] as string;
        return undefined;
      },
      all: () => [],
    }),
  } as any;
  const emailCalls: Array<Record<string, unknown>> = [];
  const app = express();
  app.use(express.json());
  const requireAuth: RequestHandler = (req, _res, next) => {
    req.user = { uid: "admin-uid", email: "admin@example.com", is_admin: true };
    next();
  };
  app.use("/api/admin", createAdminModerationRouter({
    requireAuth,
    db,
    logAdminAction: () => undefined,
    notifySellerApplicationApproved: async (email) => {
      emailCalls.push(email);
    },
    syncApprovedSellerToFirestore: async () => undefined,
  }));
  const server = app.listen(0);
  await once(server, "listening");

  try {
    const { port } = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${port}/api/admin/seller-applications/9/status`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(emailCalls, [{
      applicantEmail: "seller@example.com",
      fullLegalName: "Ada Seller",
      businessName: "Ada's Shop",
    }]);

    const duplicateResponse = await fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    assert.equal(duplicateResponse.status, 409);
    assert.equal(emailCalls.length, 1);
  } finally {
    server.close();
  }
});
