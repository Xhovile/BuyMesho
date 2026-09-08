export type SellerResolution = "refund" | "replacement" | "rejected";

const SELLER_RESOLUTION_OUTCOMES = {
  refund: new Set(["seller_refund_confirmed", "seller_refund_accepted"]),
  replacement: new Set(["seller_replacement_confirmed", "seller_replacement_committed"]),
  rejected: new Set(["seller_rejected", "seller_dispute_rejected"]),
} as const;

export function sellerResolutionFromOutcome(value: unknown): SellerResolution | null {
  const outcome = String(value ?? "").trim().toLowerCase();
  for (const [resolution, outcomes] of Object.entries(SELLER_RESOLUTION_OUTCOMES) as Array<[SellerResolution, Set<string>]>) {
    if (outcomes.has(outcome)) return resolution;
  }
  return null;
}

export function isSettledSellerOutcome(value: unknown): boolean {
  return sellerResolutionFromOutcome(value) !== null;
}
