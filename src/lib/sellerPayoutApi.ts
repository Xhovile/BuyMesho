import { apiFetch } from "./api";

export type SellerPayoutDestinationType = "mobile_money" | "bank";

export type SellerPayoutDestinationPayload = {
  sellerUid?: string;
  destinationType: SellerPayoutDestinationType;
  providerName: string;
  providerRefId?: string | null;
  currency?: string;
  accountName: string;
  accountNumber?: string;
  mobile?: string;
  isDefault?: boolean;
};

const SELLER_PAYOUT_BASE_PATH = "/api/escrow/payouts";

export async function fetchSellerPayoutDestinations(sellerUid?: string) {
  const query = sellerUid ? `?sellerUid=${encodeURIComponent(sellerUid)}` : "";
  return apiFetch(`${SELLER_PAYOUT_BASE_PATH}/destinations${query}`);
}

export async function createSellerPayoutDestination(payload: SellerPayoutDestinationPayload) {
  return apiFetch(`${SELLER_PAYOUT_BASE_PATH}/destinations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSellerPayoutDestination(destinationId: string, payload: Partial<SellerPayoutDestinationPayload>) {
  return apiFetch(`${SELLER_PAYOUT_BASE_PATH}/destinations/${encodeURIComponent(destinationId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function replaceSellerPayoutDestination(destinationId: string, payload: Partial<SellerPayoutDestinationPayload>) {
  return apiFetch(`${SELLER_PAYOUT_BASE_PATH}/destinations/${encodeURIComponent(destinationId)}/replace`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
