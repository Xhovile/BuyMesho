import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { payChanguReturnHandler } from "./paychangu.callback.js";

test("PayChangu return handler redirects failed transactions to the frontend return page", async () => {
  const app = express();
  app.get("/api/payments/paychangu/return", payChanguReturnHandler);
  const server = createServer(app).listen(0);

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/payments/paychangu/return?tx_ref=PAYCHANGU-test&status=failed`, {
      redirect: "manual",
    });

    assert.equal(response.status, 303);
    const location = response.headers.get("location");
    assert.match(location ?? "", /\/payment\/return\?tx_ref=PAYCHANGU-test&status=failed/);
  } finally {
    server.close();
  }
});
