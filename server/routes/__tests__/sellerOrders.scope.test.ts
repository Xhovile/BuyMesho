import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

const source = readFileSync(
  resolve(process.cwd(), "server/routes/sellerOrders.routes.ts"),
  "utf8",
);

test("seller orders query projects dispute evidence from its lateral source", () => {
  assert.match(
    source,
    /SELECT id, status, reason, resolution_note, requested_resolution, evidence FROM dispute_attempts/,
  );
  assert.match(source, /da\.evidence AS latest_attempt_evidence/);
});

test("seller orders exclude event and mixed orders from every seller-order entry point", () => {
  assert.match(
    source,
    /WHERE o\.seller_id = \$1 AND o\.status NOT IN \('draft', 'pending_payment'\)[\s\S]*?AND o\.source NOT IN \('event', 'mixed'\)/,
  );
  assert.match(
    source,
    /WHERE o\.seller_id = \$1[\s\S]*?o\.source NOT IN \('event', 'mixed'\)[\s\S]*?o\.status NOT IN \('draft', 'pending_payment', 'fulfilled', 'closed'\)/,
  );
  assert.match(
    source,
    /if \(!isSellerWorkspaceOrderSource\(order\.source\)\) return null;/,
  );
  assert.match(
    source,
    /if \(!current \|\| !isSellerWorkspaceOrderSource\(current\.source\) \|\| String\(current\.sellerId\) !== sellerUid\)/,
  );
  assert.match(
    source,
    /if \(!order \|\| !isSellerWorkspaceOrderSource\(order\.source\) \|\| String\(order\.sellerId\) !== sellerUid\)/,
  );
});

test("seller workspace source guard permits marketplace order sources", () => {
  assert.match(
    source,
    /function isSellerWorkspaceOrderSource\(source: unknown\): boolean \{[\s\S]*?return !\['event', 'mixed'\]\.includes\(String\(source \?\? ''\)\.trim\(\)\.toLowerCase\(\)\);[\s\S]*?\}/,
  );
});
