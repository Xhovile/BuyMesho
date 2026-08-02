import { TICKETS_PATH, ORDER_TRACKING_BASE_PATH } from "./appNavigation.paths";
import { fetchOrderByReference, type OrderBundle } from "./orderApi";
import { resolveOrderIdentifier } from "./orderIdentifier";

export type OrderFlowType = "listing_only" | "mixed_checkout" | "event_only" | "unknown";

export type TrackingTarget = {
  reference: string;
  flowType: OrderFlowType;
  destinationPath: string;
};

function hasListingItems(order: OrderBundle | null | undefined) {
  return (order?.order?.items ?? []).some((item) => item?.kind === "listing" || !!item?.listingId);
}

function hasEventItems(order: OrderBundle | null | undefined) {
  return (order?.order?.items ?? []).some((item) => item?.kind === "event_ticket" || !!item?.eventId);
}

export function getOrderFlowType(order: OrderBundle | null | undefined): OrderFlowType {
  const hasListing = hasListingItems(order);
  const hasEvent = hasEventItems(order);

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
