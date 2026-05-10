import { useEffect, useState } from "react";
import { ArrowLeft, CreditCard } from "lucide-react";
import { navigateBackOrPath, navigateToPath, EXPLORE_PATH, CART_PATH } from "./lib/appNavigation";
import { fetchMyOrders, type OrderBundle } from "./lib/orderApi";

export default function BuyerPaymentsPage() {
  const [orders, setOrders] = useState<OrderBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const data = await fetchMyOrders();
        if (!mounted) return;
        setOrders(data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load buyer orders.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 p-4">
      <button type="button" onClick={() => navigateBackOrPath(EXPLORE_PATH)}><ArrowLeft className="h-4 w-4" />Back</button>
      <button type="button" onClick={() => navigateToPath(CART_PATH)}><CreditCard className="h-4 w-4" />Cart</button>
      <h1>Buyer payments</h1>
      {loading ? <p>Loading orders...</p> : null}
      {error ? <p>{error}</p> : null}
      {!loading && !error ? <p>Orders: {orders.length}</p> : null}
      {!loading && !error ? (
        <ul>
          {orders.map((entry) => {
            const title = entry.order.items?.[0]?.title ?? "Untitled";
            const total = Number(entry.order.total?.amount ?? 0);
            const currency = String(entry.order.total?.currency ?? "MWK");
            return (
              <li key={entry.order.id}>
                <button type="button" onClick={() => navigateToPath(`/orders/${encodeURIComponent(String(entry.order.paymentReference ?? entry.order.id))}`)}>
                  {title} · {currency} {total.toLocaleString()} · {entry.order.status}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
