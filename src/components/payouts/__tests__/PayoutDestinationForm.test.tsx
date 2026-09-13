import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PayoutDestinationCard from "../PayoutDestinationCard";
import PayoutDestinationForm, { type PayoutDestinationFormValue } from "../PayoutDestinationForm";

const baseValue: PayoutDestinationFormValue = {
  destinationType: "mobile_money",
  providerName: "Airtel Money",
  providerRefId: "airtel-money",
  currency: "MWK",
  accountName: "Test Seller",
  accountNumber: "",
  mobile: "0999123456",
  isDefault: true,
};

test("PayoutDestinationForm keeps the payout setup flow compact", () => {
  const html = renderToStaticMarkup(
    <PayoutDestinationForm value={baseValue} onChange={() => undefined} onSave={() => undefined} onCancel={() => undefined} />,
  );

  assert.match(html, /Destination type/);
  assert.match(html, /Mobile operator/);
  assert.match(html, /Account holder name/);
  assert.match(html, /Mobile number/);
  assert.match(html, /Save account/);
  assert.doesNotMatch(html, /Provider identifier/);
  assert.doesNotMatch(html, /Currency/);
});

test("PayoutDestinationForm renders bank account fields when bank is selected", () => {
  const html = renderToStaticMarkup(
    <PayoutDestinationForm
      value={{ ...baseValue, destinationType: "bank", providerName: "NBS", accountNumber: "1234567890", mobile: "" }}
      onChange={() => undefined}
      onSave={() => undefined}
      onCancel={() => undefined}
    />,
  );

  assert.match(html, /Bank/);
  assert.match(html, /Bank account number/);
  assert.doesNotMatch(html, /Mobile number/);
});

test("PayoutDestinationForm disables save controls while loading or disabled", () => {
  const html = renderToStaticMarkup(
    <PayoutDestinationForm value={baseValue} onChange={() => undefined} onSave={() => undefined} loading disabled />,
  );

  assert.match(html, /disabled=""/);
  assert.match(html, /Save account/);
});

test("PayoutDestinationCard renders the destination with only the middle digits masked", () => {
  const html = renderToStaticMarkup(
    <PayoutDestinationCard
      destination={{
        id: "dest_1",
        sellerId: "seller_1",
        destinationType: "mobile_money",
        providerName: "TNM Mpamba",
        providerRefId: "tnm-mpamba",
        currency: "MWK",
        accountName: "Isaac Mtsiriza",
        maskedAccount: "****0000",
        accountDisplay: "099***0000",
        isDefault: true,
        verificationStatus: "verified",
        verificationAttempts: 1,
        lastError: null,
        verifiedAt: "2026-05-18T00:00:00.000Z",
        replacedFromId: null,
        replacedById: null,
        isActive: true,
        createdAt: "2026-05-18T00:00:00.000Z",
        updatedAt: "2026-05-18T00:00:00.000Z",
      }}
    />,
  );

  assert.match(html, /Mobile Money/);
  assert.match(html, /TNM Mpamba/);
  assert.match(html, /Isaac Mtsiriza/);
  assert.match(html, /099\*\*\*0000/);
  assert.match(html, /Default/);
  assert.match(html, /Destination actions/);
  assert.doesNotMatch(html, /Verified/);
  assert.doesNotMatch(html, /Active/);
});
