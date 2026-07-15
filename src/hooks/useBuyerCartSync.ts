import { useEffect, useState } from "react";

import { useAuthUser } from "./useAuthUser";
import {
  readBuyerCart,
  readBuyerPayments,
  refreshBuyerCartFromServer,
  subscribeToBuyerCartChanges,
  type BuyerCartItem,
  type BuyerPaymentRecord,
} from "../lib/buyerState";

export type BuyerCartSyncState = {
  items: BuyerCartItem[];
  payments: BuyerPaymentRecord[];
  isAuthenticated: boolean;
  isSyncing: boolean;
};

export function useBuyerCartSync(): BuyerCartSyncState {
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const [items, setItems] = useState<BuyerCartItem[]>(() => readBuyerCart());
  const [payments, setPayments] = useState<BuyerPaymentRecord[]>(() => readBuyerPayments());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      if (!mounted) return;

      setItems(readBuyerCart());
      setPayments(readBuyerPayments());

      if (authLoading || !firebaseUser?.uid) {
        return;
      }

      setIsSyncing(true);
      try {
        const refreshed = await refreshBuyerCartFromServer();
        if (!mounted) return;
        setItems(refreshed.length ? refreshed : readBuyerCart());
        setPayments(readBuyerPayments());
      } catch {
        if (!mounted) return;
        setItems(readBuyerCart());
        setPayments(readBuyerPayments());
      } finally {
        if (mounted) {
          setIsSyncing(false);
        }
      }
    };

    void sync();
    const unsubscribe = subscribeToBuyerCartChanges(() => {
      if (!mounted) return;
      setItems(readBuyerCart());
      setPayments(readBuyerPayments());
    });

    window.addEventListener("storage", sync as unknown as EventListener);
    window.addEventListener("focus", sync as unknown as EventListener);

    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener("storage", sync as unknown as EventListener);
      window.removeEventListener("focus", sync as unknown as EventListener);
    };
  }, [authLoading, firebaseUser?.uid]);

  return {
    items,
    payments,
    isAuthenticated: Boolean(firebaseUser?.uid),
    isSyncing,
  };
}
