import assert from "node:assert/strict";
import test from "node:test";

import qrcode from "./qrcode-generator.js";

test("generates a decodable QR matrix for a BuyMesho ticket code", () => {
  const ticketCode = "BM-6513D50ED8";
  const qr = qrcode(0, "H");

  qr.addData(ticketCode, "Byte");
  qr.make();

  const moduleCount = qr.getModuleCount();

  assert.equal(moduleCount % 2, 1);
  assert.ok(moduleCount >= 21 && moduleCount <= 177);

  // Standard QR finder-pattern structure at the top-left corner.
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const expected = row === 0 || row === 6 || col === 0 || col === 6
        ? true
        : row >= 2 && row <= 4 && col >= 2 && col <= 4;
      assert.equal(qr.isDark(row, col), expected, `unexpected finder pattern at ${row},${col}`);
    }
  }

  let darkModules = 0;
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qr.isDark(row, col)) darkModules += 1;
    }
  }

  assert.ok(darkModules > 0);
  assert.ok(darkModules < moduleCount * moduleCount);
});
