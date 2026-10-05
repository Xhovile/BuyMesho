import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  createEventTicketDownloadToken,
  createEventTicketPdf,
  verifyEventTicketDownloadToken,
} from "../event-ticket-download.js";
import { registerEventTicketDownloadRoutes } from "../event-ticket-download.routes.js";

const ORIGINAL_SECRET = process.env.EVENT_TICKET_DOWNLOAD_SECRET;
const ORIGINAL_KEY_ID = process.env.BUYMESHO_TICKET_SIGNING_KEY_ID;
const ORIGINAL_PRIVATE_KEY = process.env.BUYMESHO_TICKET_SIGNING_PRIVATE_KEY;
const ticketSigningKeys = generateKeyPairSync("ed25519", {
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
process.env.BUYMESHO_TICKET_SIGNING_KEY_ID = "test-ticket-key";
process.env.BUYMESHO_TICKET_SIGNING_PRIVATE_KEY = ticketSigningKeys.privateKey.replace(/\n/g, "\\n");

test("event ticket download tokens verify and expire", () => {
  process.env.EVENT_TICKET_DOWNLOAD_SECRET = "event-ticket-download-test-secret";
  try {
    const ticketId = "BM-TEST-123";
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const token = createEventTicketDownloadToken(ticketId, expiresAt);

    assert.equal(verifyEventTicketDownloadToken(ticketId, token), true);
    assert.equal(verifyEventTicketDownloadToken("BM-OTHER-123", token), false);

    const expiringAt = Math.floor(Date.now() / 1000) + 1;
    const expiring = createEventTicketDownloadToken(ticketId, expiringAt);
    assert.equal(verifyEventTicketDownloadToken(ticketId, expiring), true);

    const originalNow = Date.now;
    Date.now = () => (expiringAt + 1) * 1000;
    try {
      assert.equal(verifyEventTicketDownloadToken(ticketId, expiring), false);
    } finally {
      Date.now = originalNow;
    }
  } finally {
    if (ORIGINAL_SECRET === undefined) delete process.env.EVENT_TICKET_DOWNLOAD_SECRET;
    else process.env.EVENT_TICKET_DOWNLOAD_SECRET = ORIGINAL_SECRET;
  }
});

test("event ticket PDF generator returns a valid PDF document", () => {
  const pdf = createEventTicketPdf({
    eventTitle: "Campus Concert",
    organizer: "Campus Events",
    ticketId: "BM-4A02AFD21D",
    ticketType: "General Admission",
    holderName: "Ada Buyer",
    holderEmail: "buyer@example.com",
    holderPhone: "0994123456",
    eventDate: "2026-10-03",
    startTime: "18:00",
    venue: "Main Hall",
    location: "Area 2 • Pa chigulumwa",
    status: "Paid",
    amount: "5000 MWK",
    orderId: "order-1",
    qrPayload: "BM1.test-payload.invalid-signature",
  });

  assert.ok(pdf.length > 1000);
  assert.equal(pdf.subarray(0, 8).toString("ascii"), "%PDF-1.4");
  assert.match(pdf.toString("latin1"), /Campus Concert/);
  const pdfText = pdf.toString("latin1");
  assert.match(pdfText, /BM-4A02AFD21D/);
  assert.match(pdfText, /AUTHENTICITY CHECK/);
  assert.match(pdfText, /Area 2 \| Pa chigulumwa/);
  assert.doesNotMatch(pdfText, /â|�/);
});

test("cancelled ticket cannot be downloaded even when its order is paid", () => {
  const previousSecret = process.env.EVENT_TICKET_DOWNLOAD_SECRET;
  process.env.EVENT_TICKET_DOWNLOAD_SECRET = "event-ticket-download-test-secret";

  try {
    const ticketId = "BM-CANCELLED-1";
    const token = createEventTicketDownloadToken(ticketId);

    let handler: ((req: any, res: any) => unknown) | undefined;
    const app = {
      get(_path: string, routeHandler: (req: any, res: any) => unknown) {
        handler = routeHandler;
      },
    };

    const db = {
      prepare() {
        return {
          get() {
            return {
              id: "ticket-1",
              code: ticketId,
              ticket_title: "Cancelled Ticket",
              ticket_type: "General Admission",
              holder_name: "Ada Buyer",
              holder_email: "buyer@example.com",
              holder_phone: "0994123456",
              status: "cancelled",
              event_title: "Campus Concert",
              event_date: "2026-10-03",
              start_time: "18:00",
              venue: "Main Hall",
              location: "Lilongwe",
              organizer_name: "Campus Events",
              ticket_price: 5000,
              order_status: "paid",
              event_id: "event-1",
              order_id: "order-1",
              purchase_date: "2026-10-03T12:00:00.000Z",
            };
          },
        };
      },
    };

    registerEventTicketDownloadRoutes(app as any, { db });
    assert.ok(handler);

    let statusCode = 0;
    let body: unknown;
    const res = {
      setHeader() {
        return this;
      },
      status(code: number) {
        statusCode = code;
        return {
          json(value: unknown) {
            body = value;
            return this;
          },
          send(value: Buffer) {
            body = value;
            return this;
          },
        };
      },
    };

    handler!(
      {
        params: { ticketId },
        query: { token },
      },
      res,
    );

    assert.equal(statusCode, 410);
    assert.deepEqual(body, { error: "This ticket is no longer valid." });
  } finally {
    if (previousSecret === undefined) delete process.env.EVENT_TICKET_DOWNLOAD_SECRET;
    else process.env.EVENT_TICKET_DOWNLOAD_SECRET = previousSecret;
  }
});


const restoreTicketSigningEnv = () => {
  if (ORIGINAL_KEY_ID === undefined) delete process.env.BUYMESHO_TICKET_SIGNING_KEY_ID;
  else process.env.BUYMESHO_TICKET_SIGNING_KEY_ID = ORIGINAL_KEY_ID;
  if (ORIGINAL_PRIVATE_KEY === undefined) delete process.env.BUYMESHO_TICKET_SIGNING_PRIVATE_KEY;
  else process.env.BUYMESHO_TICKET_SIGNING_PRIVATE_KEY = ORIGINAL_PRIVATE_KEY;
};
test.after(restoreTicketSigningEnv);
