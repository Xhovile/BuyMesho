import assert from "node:assert/strict";
import test from "node:test";
import { BUYMESHO_EMAIL, renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

test("shared BuyMesho shell renders the official platform logo and wordmark", () => {
  const { html, text } = renderBuyMeshoEmail({
    recipientName: "Jordan Tchen Murray",
    title: "Payment confirmed",
    intro: "Your payment has been confirmed.",
    bodyHtml: renderDetailCard([["Order", "ord_123"], ["Amount", "77.00 MWK"]]),
    bodyText: "Order: ord_123\nAmount: 77.00 MWK",
    action: { label: "View order", url: "https://buymesho.app/orders/ord_123" },
  });

  assert.match(html, /<img\b/i);
  assert.match(html, /src="https:\/\/raw\.githubusercontent\.com\/Xhovile\/BuyMesho\/main\/photos\/Logo\.png"/);
  assert.match(html, /alt="BuyMesho platform logo"/);
  assert.doesNotMatch(html, />B<\/span>/);
  assert.match(html, /Buy<\/span><span[^>]*>Mesho/);
  assert.match(html, new RegExp(BUYMESHO_EMAIL.brandRed.slice(1), "i"));
  assert.match(html, /Secure marketplace notifications/);
  assert.match(text, /BuyMesho/);
  assert.match(text, /Payment confirmed/);
});

test("shared shell escapes untrusted content", () => {
  const { html } = renderBuyMeshoEmail({
    recipientName: "<script>alert(1)</script>",
    title: "<img src=x>",
    intro: "<b>bad</b>",
    bodyHtml: renderDetailCard([["Order", "<123>"]]),
    bodyText: "<123>",
    action: { label: "<Click>", url: "https://buymesho.app/?x=<123>" },
  });

  assert.doesNotMatch(html, /<script>/i);
  assert.doesNotMatch(html, /<img src=x>/i);
  assert.match(html, /&lt;script&gt;/i);
  assert.match(html, /&lt;123&gt;/i);
});

test("detail cards safely render non-string transaction values", () => {
  const html = renderDetailCard([
    ["Amount", 1250],
    ["Completed", new Date("2026-10-01T12:00:00Z")],
    ["Metadata", { provider: "manual" }],
  ]);

  assert.match(html, />1,?250</);
  assert.match(html, /2026-10-01T12:00:00\.000Z/);
  assert.match(html, /\[object Object\]/);
});
