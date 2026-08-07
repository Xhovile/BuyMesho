import { TICKETS_PATH, ORDER_TRACKING_BASE_PATH } from "./appNavigation.paths";
import { fetchOrderByReference, type OrderBundle } from "./orderApi";
import { resolveOrderIdentifier } from "./orderIdentifier";

export type OrderFlowType = "listing_only" | "mixed_checkout" | "event_only" | "unknown";

export type TrackingTarget = {
  reference: string;
  flowType: OrderFlowType;
  destinationPath: string;
};

type MaybeRecord = Record<string, unknown> | null | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasArraySignal(source: MaybeRecord, key: string, predicate: (entry: unknown) => boolean) {
  const value = source?.[key];
  return Array.isArray(value) && value.some(predicate);
}

function hasEventSignals(source: MaybeRecord): boolean {
  if (!source) return false;
  if (typeof source.eventId === "string" && source.eventId.trim()) return true;
  if (typeof source.eventIds === "string" && source.eventIds.trim()) return true;
  if (Array.isArray(source.eventIds) && source.eventIds.some((value) => typeof value === "string" && value.trim())) return true;
  if (hasArraySignal(source, "eventDetails", (entry) => isRecord(entry) && typeof entry.eventId === "string" && Boolean(entry.eventId.trim()))) return true;
  if (hasArraySignal(source, "checkoutItems", (entry) => isRecord(entry) && (entry.kind === "event_ticket" || (typeof entry.eventId === "string" && Boolean(entry.eventId.trim()))))) return true;
  if (hasArraySignal(source, "items", (entry) => isRecord(entry) && (entry.kind === "event_ticket" || (typeof entry.eventId === "string" && Boolean(entry.eventId.trim()))))) return true;
  return false;
}

function hasListingSignals(source: MaybeRecord): boolean {
  if (!source) return false;
  if (typeof source.listingId === "string" && source.listingId.trim()) return true;
  if (Array.isArray(source.listingIds) && source.listingIds.some((value) => typeof value === "string" && value.trim())) return true;
  if (hasArraySignal(source, "items", (entry) => isRecord(entry) && (entry.kind === "listing" || (typeof entry.listingId === "string" && Boolean(entry.listingId.trim()))))) return true;
  if (hasArraySignal(source, "checkoutItems", (entry) => isRecord(entry) && (entry.kind === "listing" || (typeof entry.listingId === "string" && Boolean(entry.listingId.trim()))))) return true;
  return false;
}

export function getOrderFlowType(order: OrderBundle | null | undefined): OrderFlowType {
  const orderListing = hasListingSignals(order?.order);
  const orderEvent = hasEventSignals(order?.order);
  const paymentListing = hasListingSignals(order?.payment);
  const paymentEvent = hasEventSignals(order?.payment);
  const escrowEvent = hasEventSignals(order?.escrow);

  const hasListing = orderListing || paymentListing;
  const hasEvent = orderEvent || paymentEvent || escrowEvent;

  if (hasListing && hasEvent) return "mixed_checkout";
  if (hasEvent) return "event_only";
  if (hasListing) return "listing_only";
  return "unknown";
}

export function buildTrackingTarget(reference: string, flowType: OrderFlowType): TrackingTarget {
  const normalizedReference = reference.trim();
  if (flowType === "event_only") {
    return {
      reference: normalizedReference,
      flowType,
      destinationPath: `${TICKETS_PATH}?reference=${encodeURIComponent(normalizedReference)}`,
    };
  }

  return {
    reference: normalizedReference,
    flowType,
    destinationPath: `${ORDER_TRACKING_BASE_PATH}/${encodeURIComponent(normalizedReference)}`,
  };
}

export async function resolveTrackingTarget(input: string): Promise<TrackingTarget> {
  const reference = await resolveOrderIdentifier(input);

  try {
    const bundle = await fetchOrderByReference(reference);
    return buildTrackingTarget(reference, getOrderFlowType(bundle));
  } catch {
    return buildTrackingTarget(reference, "unknown");
  }
}
