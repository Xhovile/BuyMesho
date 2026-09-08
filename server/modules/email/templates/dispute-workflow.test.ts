import assert from "node:assert/strict";
import test from "node:test";
import { renderDisputeWorkflowEmail } from "./dispute-workflow.js";

test("dispute email uses structured transaction details and BuyMesho branding", () => {
  const { text, html } = renderDisputeWorkflowEmail({
    recipientName: "Jordan Tchen Murray",
    title: "Seller refund recorded",
    intro: "The seller has submitted refund details for your disputed order.",
    orderId: "ord_123",
    eventLabel: "Seller refund recorded",
    actionUrl: "https://buymesho.app/disputes?reference=ord_123",
    amount: 69,
    currency: "MWK",
    refundMethod: "bank_transfer",
    transactionId: "J97689GTHJ",
    refundDate: "2026-09-08",
    destination: "0992948283",
    note: "Refund processed by seller.",
  });

  assert.match(text, /Dispute details/);
  assert.match(text, /Refund amount|Amount/);
  assert.match(text, /Seller note/);
  assert.match(html, /alt="BuyMesho logo"/);
  assert.match(html, /https:\/\/buymesho\.app\/icon-192\.png/);
  assert.match(html, /#e00106/);
  assert.match(html, /Secure marketplace notifications/);
  assert.match(html, /background:#f8fafc/);
  assert.match(html, /border-collapse:collapse/);
  assert.match(html, /View dispute/);
});

test("dispute email escapes user-controlled content", () => {
  const { html } = renderDisputeWorkflowEmail({
    recipientName: "<script>alert(1)</script>",
    title: "Seller refund recorded",
    intro: "<img src=x onerror=alert(1)>",
    orderId: "ord_<123>",
    eventLabel: "Seller refund recorded",
    actionUrl: "https://buymesho.app/disputes?reference=ord_123",
    note: "<b>raw</b>",
  });

  assert.doesNotMatch(html, /<script>/i);
  assert.doesNotMatch(html, /<img /i);
  assert.match(html, /&lt;script&gt;/i);
  assert.match(html, /&lt;b&gt;raw&lt;\/b&gt;/i);
});
