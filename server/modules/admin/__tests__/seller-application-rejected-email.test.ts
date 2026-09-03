import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express, { type RequestHandler } from "express";
import { createAdminModerationRouter } from "../admin.moderation.routes.js";
import { notifySellerApplicationRejected } from "../../notifications/seller-application-rejected.notification.js";

test("rejected seller application email includes review notes and uses the transactional sender", async () => {
  const messages: Array<Record<string, unknown>> = [];

  await notifySellerApplicationRejected(
    {
      applicationId: 42,
      applicantEmail: "seller@example.com",
      fullLegalName: "Ada Seller",
      businessName: "Ada's Shop",
      reviewNotes: "Please provide a clearer business description and proof of registration.",
    },
    {
      send: async (message) => {
        messages.push(message);
        return { messageId: "brevo-message-id" };
      },
      claim: () => true,
      markSent: () => undefined,
      release: () => undefined,
    },
  );

  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, "transactional");
  assert.deepEqual(messages[0].to, { email: "seller@example.com", name: "Ada Seller" });
  assert.equal(messages[0].subject, "Update on your BuyMesho seller application");
  assert.match(messages[0].text as string, /clearer business description/);
  assert.match(messages[0].html as string, /clearer business description/);
});

test("rejected seller application notification suppresses duplicates and releases a failed claim for retry", async () => {
  const emailCalls: Array<Record<string, unknown>> = [];
  const claimed = new Set<string>();
  let releaseCount = 0;
  let shouldFail = true;

  const deps: Parameters<typeof notifySellerApplicationRejected>[1] = {
    claim: (key: string) => {
      if (claimed.has(key)) return false;
      claimed.add(key);
      return true;
    },
    markSent: (_key: string) => undefined,
    release: (key: string) => {
      claimed.delete(key);
      releaseCount += 1;
    },
    send: async (message) => {
      emailCalls.push(message);
      if (shouldFail) {
        shouldFail = false;
        throw new Error("provider unavailable");
      }
      return { messageId: "brevo-message-id" };
    },
  };

  await assert.rejects(
    notifySellerApplicationRejected(
      {
        applicationId: 99,
        applicantEmail: "seller@example.com",
        fullLegalName: "Ada Seller",
        businessName: "Ada's Shop",
      },
      deps,
    ),
  );

  assert.equal(releaseCount, 1);
  assert.equal(emailCalls.length, 1);

  const retried = await notifySellerApplicationRejected(
    {
      applicationId: 99,
      applicantEmail: "seller@example.com",
      fullLegalName: "Ada Seller",
      businessName: "Ada's Shop",
    },
    deps,
  );
  assert.equal(retried, true);
  assert.equal(emailCalls.length, 2);

  const duplicate = await notifySellerApplicationRejected(
    {
      applicationId: 99,
      applicantEmail: "seller@example.com",
      fullLegalName: "Ada Seller",
      businessName: "Ada's Shop",
    },
    deps,
  );
  assert.equal(duplicate, false);
  assert.equal(emailCalls.length, 2);
});

test("rejecting a pending seller application invokes the rejection email once", async () => {
  const application = {
    id: 7,
    status: "pending",
    applicant_uid: "seller-uid",
    applicant_email: "seller@example.com",
    full_legal_name: "Ada Seller",
    business_name: "Ada's Shop",
    institution: "University",
  };
  const emailCalls: Array<Record<string, unknown>> = [];
  const db = {
    prepare: (sql: string) => ({
      get: () => {
        if (/SELECT \*\s+FROM seller_applications/i.test(sql)) return application;
        if (/SELECT\s+id,\s+status,/i.test(sql)) return {
          id: application.id,
          status: application.status,
          review_notes: "Please provide clearer information.",
        };
        return undefined;
      },
      run: (...params: unknown[]) => {
        if (/UPDATE seller_applications\s+SET/i.test(sql)) {
          application.status = params[0] as string;
        }
        return undefined;
      },
      all: () => [],
    }),
  } as any;

  const app = express();
  app.use(express.json());
  const requireAuth: RequestHandler = (req, _res, next) => {
    req.user = { uid: "admin-uid", email: "admin@example.com", is_admin: true };
    next();
  };
  app.use(
    "/api/admin",
    createAdminModerationRouter({
      requireAuth,
      db,
      logAdminAction: () => undefined,
      notifySellerApplicationRejected: async (input) => {
        emailCalls.push(input);
        return true;
      },
      syncApprovedSellerToFirestore: async () => undefined,
    }),
  );

  const server = app.listen(0);
  await once(server, "listening");

  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/api/admin/seller-applications/7/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "rejected", review_notes: "Please provide clearer information." }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(emailCalls, [{
      applicationId: 7,
      applicantEmail: "seller@example.com",
      fullLegalName: "Ada Seller",
      businessName: "Ada's Shop",
      reviewNotes: "Please provide clearer information.",
    }]);
  } finally {
    server.close();
  }
});
