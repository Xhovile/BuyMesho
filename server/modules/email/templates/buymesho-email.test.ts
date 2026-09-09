import assert from "node:assert/strict";
import test from "node:test";
import { BUYMESHO_EMAIL, renderBuyMeshoEmail, renderDetailCard } from "./buymesho-email.js";

test("shared BuyMesho shell renders branded header and footer", () => {
  const { html, text } = renderBuyMeshoEmail({
    recipientName: "Jordan Tchen Murray",
    title: "Payment confirmed",
    intro: "Your payment has been confirmed.",
    bodyHtml: renderDetailCard([["Order", "ord_123"], ["Amount", "77.00 MWK"]]),
    bodyText: "Order: ord_123\nAmount: 77.00 MWK",
    action: { label: "View order", url: "https://buymesho.app/orders/ord_123" },
  });

  assert.match(html, /alt="BuyMesho logo"/);
  assert.match(html, /https:\/\/buymesho\.app\/icon-192\.png/);
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
