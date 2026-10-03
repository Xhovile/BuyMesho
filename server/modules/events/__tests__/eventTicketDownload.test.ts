import assert from "node:assert/strict";
import test from "node:test";
import {
  createEventTicketDownloadToken,
  createEventTicketPdf,
  verifyEventTicketDownloadToken,
} from "../event-ticket-download.js";

const ORIGINAL_SECRET = process.env.EVENT_TICKET_DOWNLOAD_SECRET;

test("event ticket download tokens verify and expire", () => {
  process.env.EVENT_TICKET_DOWNLOAD_SECRET = "event-ticket-download-test-secret";
  try {
    const ticketId = "BM-TEST-123";
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const token = createEventTicketDownloadToken(ticketId, expiresAt);

    assert.equal(verifyEventTicketDownloadToken(ticketId, token), true);
    assert.equal(verifyEventTicketDownloadToken("BM-OTHER-123", token), false);

    const expired = createEventTicketDownloadToken(ticketId, Math.floor(Date.now() / 1000) + 1);
    assert.equal(verifyEventTicketDownloadToken(ticketId, expired), true);
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
    location: "Lilongwe",
    status: "Paid",
    amount: "5000 MWK",
  });

  assert.ok(pdf.length > 1000);
  assert.equal(pdf.subarray(0, 8).toString("ascii"), "%PDF-1.4");
  assert.match(pdf.toString("latin1"), /Campus Concert/);
  assert.match(pdf.toString("latin1"), /BM-4A02AFD21D/);
});
