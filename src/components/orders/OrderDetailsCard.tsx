type OrderDetailsCardItem = {
  listingId?: string;
  title?: string;
  quantity?: number;
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
};

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ');
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
}: OrderDetailsCardProps) {
  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
      <h2 className="text-lg font-black text-zinc-950">Order details</h2>

      <div className="mt-4 space-y-3 text-sm">
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">BuyMesho reference</span>
          <p className="mt-1 font-semibold text-zinc-900 break-all">
            {reference || '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">Item</span>
          <p className="mt-1 font-semibold text-zinc-900">
            {firstItemTitle}
          </p>
        </div>

        {items.length ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
            <span className="text-zinc-500">Item references</span>
            <div className="mt-2 space-y-2">
              {items.map((item, index) => (
                <div key={`${item.reference ?? item.listingId ?? index}`} className="rounded-xl bg-zinc-50 px-3 py-2">
                  <p className="font-semibold text-zinc-900">
                    {item.title || `Item ${index + 1}`}
                    {item.quantity ? ` × ${item.quantity}` : ''}
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-zinc-500">
                    {item.reference || 'Reference pending'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">Payment status</span>
          <p className="mt-1 font-semibold capitalize text-zinc-900">
            {formatLabel(paymentStatus)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">Order status</span>
          <p className="mt-1 font-semibold capitalize text-zinc-900">
            {formatLabel(orderStatus)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">Escrow state</span>
          <p className="mt-1 font-semibold capitalize text-zinc-900">
            {formatLabel(escrowState)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">Order ID</span>
          <p className="mt-1 font-semibold text-zinc-900 break-all">
            {orderId}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <span className="text-zinc-500">Total</span>
          <p className="mt-1 font-semibold text-zinc-900">
            {totalCurrency} {totalAmount.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
