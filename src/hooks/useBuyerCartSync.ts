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
import {
  readEventCart,
  subscribeToEventCartChanges,
  type EventCartItem,
} from "../lib/eventCart";

export type BuyerCartSyncState = {
  items: BuyerCartItem[];
  eventItems: EventCartItem[];
  payments: BuyerPaymentRecord[];
  isAuthenticated: boolean;
  isSyncing: boolean;
};

export function useBuyerCartSync(): BuyerCartSyncState {
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const [items, setItems] = useState<BuyerCartItem[]>(() => readBuyerCart());
  const [eventItems, setEventItems] = useState<EventCartItem[]>(() => readEventCart(firebaseUser?.uid ?? null));
  const [payments, setPayments] = useState<BuyerPaymentRecord[]>(() => readBuyerPayments());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      if (!mounted) return;

      setItems(readBuyerCart());
      setEventItems(readEventCart(firebaseUser?.uid ?? null));
      setPayments(readBuyerPayments());

      if (authLoading || !firebaseUser?.uid) {
        return;
      }

      setIsSyncing(true);
      try {
        const refreshed = await refreshBuyerCartFromServer();
        if (!mounted) return;
        setItems(refreshed);
        setEventItems(readEventCart(firebaseUser.uid));
        setPayments(readBuyerPayments());
      } catch {
        if (!mounted) return;
        setItems(readBuyerCart());
        setEventItems(readEventCart(firebaseUser?.uid ?? null));
        setPayments(readBuyerPayments());
      } finally {
        if (mounted) {
          setIsSyncing(false);
        }
      }
    };

    void sync();
    const unsubscribeListings = subscribeToBuyerCartChanges(() => {
      if (!mounted) return;
      setItems(readBuyerCart());
      setPayments(readBuyerPayments());
    });
    const unsubscribeEvents = subscribeToEventCartChanges(() => {
      if (!mounted) return;
      setEventItems(readEventCart(firebaseUser?.uid ?? null));
    });

    window.addEventListener("storage", sync as unknown as EventListener);
    window.addEventListener("focus", sync as unknown as EventListener);

    return () => {
      mounted = false;
      unsubscribeListings();
      unsubscribeEvents();
      window.removeEventListener("storage", sync as unknown as EventListener);
      window.removeEventListener("focus", sync as unknown as EventListener);
    };
  }, [authLoading, firebaseUser?.uid]);

  return {
    items,
    eventItems,
    payments,
    isAuthenticated: Boolean(firebaseUser?.uid),
    isSyncing,
  };
}
