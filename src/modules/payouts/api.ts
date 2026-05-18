import { apiFetch } from "../../lib/api";
import type {
  PayoutDestination,
  PayoutDestinationPayload,
  PayoutPermissions,
  PayoutRecord,
} from "./types";

export async function getPayoutPermissions(sellerUid: string): Promise<PayoutPermissions> {
  const response = await apiFetch(`/api/payouts/permissions/${encodeURIComponent(sellerUid)}`);
  return response?.permissions ?? response;
}

export async function getPayoutDestinations(sellerUid: string): Promise<PayoutDestination[]> {
  const response = await apiFetch(`/api/payouts/destinations?sellerUid=${encodeURIComponent(sellerUid)}`);
  return Array.isArray(response?.destinations) ? response.destinations : [];
}

export async function getPayoutHistory(sellerUid: string): Promise<PayoutRecord[]> {
  const response = await apiFetch(`/api/payouts/history/${encodeURIComponent(sellerUid)}`);
  return Array.isArray(response?.payouts) ? response.payouts : [];
}

export async function createPayoutDestination(payload: PayoutDestinationPayload): Promise<PayoutDestination> {
  const response = await apiFetch("/api/payouts/destinations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response?.destination ?? response;
}

export async function updatePayoutDestination(
  destinationId: string,
  payload: PayoutDestinationPayload
): Promise<PayoutDestination> {
  const response = await apiFetch(`/api/payouts/destinations/${encodeURIComponent(destinationId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response?.destination ?? response;
}

export async function deletePayoutDestination(destinationId: string): Promise<void> {
  await apiFetch(`/api/payouts/destinations/${encodeURIComponent(destinationId)}`, {
    method: "DELETE",
  });
}
