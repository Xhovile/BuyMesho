import assert from "node:assert/strict";
import test from "node:test";

function buildRedirect(baseUrl: string, txRef: string, status: string): string {
  const url = new URL("/payment/return", baseUrl.replace(/\/$/, ""));
  if (txRef) url.searchParams.set("tx_ref", txRef);
  url.searchParams.set("status", status);
  return url.toString();
}

test("PayChangu frontend return URL keeps tx_ref and status", () => {
  assert.equal(
    buildRedirect("https://buymesho.app", "PAYCHANGU-test", "failed"),
    "https://buymesho.app/payment/return?tx_ref=PAYCHANGU-test&status=failed",
  );
});
