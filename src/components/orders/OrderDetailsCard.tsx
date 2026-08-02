type OrderDetailsCardItem = {
  kind?: "listing" | "event_ticket";
  listingId?: string;
  eventId?: string;
  title?: string;
  quantity?: number;
  unitPrice?: {
    amount?: number;
    currency?: string;
  };
  reference?: string;
};

type OrderDetailsCardProps = {
  reference: string | null;
  firstItemTitle: string;
  items?: OrderDetailsCardItem[];
  paymentStatus: string;
  orderStatus: string;
  escrowState: string;
  orderId: string;
  totalCurrency: string;
  totalAmount: number;
  sellerPayout?: {
    paymentCaptured: boolean;
    escrowState: string;
    releaseEligibility: string;
    payoutStatus: string;
    estimatedPayoutDate?: string | null;
    payoutDestinationMask?: string | null;
  } | null;
};

function formatLabel(value: string): string {
  return value.replace(/_/g, " ");
}

function isEventItem(item: OrderDetailsCardItem) {
  return item.kind === "event_ticket" || !!item.eventId;
}

function isListingItem(item: OrderDetailsCardItem) {
  return item.kind === "listing" || !!item.listingId || (!item.kind && !item.eventId);
}

function getItemSubtotal(item: OrderDetailsCardItem): number | null {
  const amount = item.unitPrice?.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  const quantity = typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
  return amount * quantity;
}

export default function OrderDetailsCard({
  reference,
  firstItemTitle,
  items = [],
  paymentStatus,
  orderStatus,
  escrowState,
  orderId,
  totalCurrency,
  totalAmount,
  sellerPayout = null,
}: OrderDetailsCardProps) {
  const listingItems = items.filter(isListingItem);
  const eventItems = items.filter(isEventItem);
  const listingSubtotal = listingItems.reduce((sum, item) => sum + (getItemSubtotal(item) ?? 0), 0);
  const hasPricedListingItems = listingItems.some((item) => typeof item.unitPrice?.amount === "number");
  const displayTotalAmount = eventItems.length && hasPricedListingItems ? listingSubtotal : totalAmount;
  const totalLabel = eventItems.length ? "Listing total" : "Total";

  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
      <h2 className="text-lg font-black text-zinc-950">Order details</h2>

      <div className="mt-4 space-y-3 text-sm">
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">BuyMesho reference</span>
          <p className="mt-1 break-all font-semibold text-zinc-900">{reference || "—"}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">Item</span>
          <p className="mt-1 font-semibold text-zinc-900">{firstItemTitle}</p>
        </div>

        {listingItems.length ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
            <span className="text-zinc-500">Item references</span>
            <div className="mt-2 space-y-2">
              {listingItems.map((item, index) => {
                const itemReference = item.reference || item.listingId || "Reference pending";
                return (
                  <div key={`${item.reference ?? item.listingId ?? index}`} className="rounded-xl bg-zinc-50 px-3 py-2">
                    <p className="font-semibold text-zinc-900">
                      Listing: {item.title || `Item ${index + 1}`}
                      {item.quantity ? ` × ${item.quantity}` : ""}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-zinc-500">{itemReference}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {eventItems.length ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <p className="font-semibold">This order includes an event ticket.</p>
            <p className="mt-1">Open Tickets for ticket details.</p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">Payment status</span>
          <p className="mt-1 font-semibold capitalize text-zinc-900">{formatLabel(paymentStatus)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">Order status</span>
          <p className="mt-1 font-semibold capitalize text-zinc-900">{formatLabel(orderStatus)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">Escrow state</span>
          <p className="mt-1 font-semibold capitalize text-zinc-900">{formatLabel(escrowState)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">Order ID</span>
          <p className="mt-1 break-all font-semibold text-zinc-900">{orderId}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">{totalLabel}</span>
          <p className="mt-1 font-semibold text-zinc-900">
            {totalCurrency} {displayTotalAmount.toLocaleString()}
          </p>
          {eventItems.length ? (
            <p className="mt-1 text-xs text-zinc-500">Event ticket charges are shown separately in Tickets.</p>
          ) : null}
        </div>

        {sellerPayout ? (
          <>
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <span className="text-zinc-500">Payment captured</span>
              <p className="mt-1 font-semibold text-zinc-900">{sellerPayout.paymentCaptured ? "Yes" : "No"}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <span className="text-zinc-500">Release eligibility</span>
              <p className="mt-1 font-semibold capitalize text-zinc-900">{formatLabel(sellerPayout.releaseEligibility)}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <span className="text-zinc-500">Payout status</span>
              <p className="mt-1 font-semibold capitalize text-zinc-900">{formatLabel(sellerPayout.payoutStatus)}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <span className="text-zinc-500">Estimated payout date</span>
              <p className="mt-1 font-semibold text-zinc-900">{sellerPayout.estimatedPayoutDate || "—"}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <span className="text-zinc-500">Payout destination</span>
              <p className="mt-1 font-semibold text-zinc-900">{sellerPayout.payoutDestinationMask || "Not configured"}</p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}