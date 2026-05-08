import { useEffect, useState } from "react";
import { ArrowLeft, CreditCard } from "lucide-react";
import { navigateBackOrPath, navigateToPath, EXPLORE_PATH, CART_PATH } from "./lib/appNavigation";
import { readBuyerPayments } from "./lib/buyerState";

export default function BuyerPaymentsPage() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(readBuyerPayments().length);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 p-4">
      <button type="button" onClick={() => navigateBackOrPath(EXPLORE_PATH)}><ArrowLeft className="h-4 w-4" />Back</button>
      <button type="button" onClick={() => navigateToPath(CART_PATH)}><CreditCard className="h-4 w-4" />Cart</button>
      <h1>Buyer payments</h1>
      <p>Saved payment records: {count}</p>
    </div>
  );
}
