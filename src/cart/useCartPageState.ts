import { useEffect, useMemo, useRef, useState } from "react";

import {
  readBuyerCart,
  readBuyerPayments,
  refreshBuyerCartFromServer,
  removeBuyerCartItem,
  subscribeToBuyerCartChanges,
  touchBuyerPaymentFromCheckout,
  type BuyerCartItem,
  type BuyerPaymentRecord,
} from "../lib/buyerState";
import { apiFetch } from "../lib/api";
import { ENDPOINTS } from "../shared/api/endpoints";
import { useAuthUser } from "../hooks/useAuthUser";

export type CartCheckoutEntry = {
  item: BuyerCartItem;
  checkoutQuantity: number;
};

export function useCartPageState() {
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const [items, setItems] = useState<BuyerCartItem[]>(() => readBuyerCart());
  const [payments, setPayments] = useState<BuyerPaymentRecord[]>(() => readBuyerPayments());
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const previousCartIdsRef = useRef<string[]>([]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      if (!mounted) return;
      setItems(readBuyerCart());
      setPayments(readBuyerPayments());

      const refreshed = await refreshBuyerCartFromServer();
      if (!mounted) return;
      setItems(refreshed.length ? refreshed : readBuyerCart());
      setPayments(readBuyerPayments());
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
  }, [firebaseUser?.uid, authLoading]);

  useEffect(() => {
    const nextCartIds = items.map((item) => String(item.listingId));
    const previousCartIdSet = new Set(previousCartIdsRef.current);

    setSelectedQuantities((current) => {
      const next: Record<string, number> = {};

      for (const item of items) {
        const listingId = String(item.listingId);
        const previousValue = current[listingId];
        const isExistingItem = previousCartIdSet.has(listingId);
        const maxSelectable = Math.max(0, Number(item.availableQuantity ?? item.quantity) || 0);
        const fallbackQuantity = isExistingItem ? previousValue ?? 0 : 1;

        next[listingId] = Math.max(0, Math.min(maxSelectable, Math.floor(Number(fallbackQuantity) || 0)));
      }

      return next;
    });

    previousCartIdsRef.current = nextCartIds;
  }, [items]);

  const latestPendingCheckoutUrl = useMemo(
    () =>
      payments.find((record) => record.status === "pending" && record.checkoutUrl)?.checkoutUrl ?? null,
    [payments],
  );

  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);

  const selectedItems = useMemo<CartCheckoutEntry[]>(
    () =>
      items
        .map((item) => {
          const maxSelectable = Math.max(0, Number(item.availableQuantity ?? item.quantity) || 0);
          return {
            item,
            checkoutQuantity: Math.max(0, Math.min(maxSelectable, selectedQuantities[String(item.listingId)] ?? 0)),
          };
        })
        .filter(({ checkoutQuantity }) => checkoutQuantity > 0),
    [items, selectedQuantities],
  );

  const selectedCount = selectedItems.length;
  const selectedUnits = selectedItems.reduce((total, entry) => total + entry.checkoutQuantity, 0);
  const selectedSubtotal = selectedItems.reduce(
    (total, entry) => total + entry.checkoutQuantity * entry.item.unitPrice,
    0,
  );
  const allSelected = items.length > 0 && selectedCount === items.length;
  const someSelected = selectedCount > 0 && selectedCount < items.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const setSelectedQuantity = (listingId: string, quantity: number, maxQuantity: number) => {
    setSelectedQuantities((current) => ({
      ...current,
      [listingId]: Math.max(0, Math.min(maxQuantity, Math.floor(quantity))),
    }));
  };

  const toggleItemSelection = (listingId: string, maxQuantity: number) => {
    setSelectedQuantities((current) => {
      const currentQuantity = current[listingId] ?? 0;
      const nextQuantity = currentQuantity > 0 ? 0 : Math.min(1, maxQuantity);
      return { ...current, [listingId]: nextQuantity };
    });
  };

  const setAllSelected = (checked: boolean) => {
    setSelectedQuantities((current) => {
      const next = { ...current };
      for (const item of items) {
        const maxSelectable = Math.max(0, Number(item.availableQuantity ?? item.quantity) || 0);
        next[String(item.listingId)] = checked ? maxSelectable : 0;
      }
      return next;
    });
  };

  const handleRemoveItem = async (listingId: string) => {
    await removeBuyerCartItem(listingId);
    setItems((current) => current.filter((item) => String(item.listingId) !== String(listingId)));
    setSelectedQuantities((current) => {
      const next = { ...current };
      delete next[listingId];
      return next;
    });
  };

  const handleCheckout = async (checkoutItems: CartCheckoutEntry[]) => {
    if (!checkoutItems.length || checkoutLoading) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const listingIds = checkoutItems.map(({ item }) => String(item.listingId));
      const listingIdQuery = encodeURIComponent(listingIds.join(","));
      const returnUrl = `${window.location.origin}/payment/return?listingIds=${listingIdQuery}`;
      const cancelUrl = `${window.location.origin}/payment/return?cancelled=1&listingIds=${listingIdQuery}`;
      const idempotencyKey = crypto.randomUUID();

      const result = (await apiFetch(ENDPOINTS.payments.checkout, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          items: checkoutItems.map(({ item, checkoutQuantity }) => ({
            listingId: item.listingId,
            quantity: checkoutQuantity,
          })),
          method: "mobile_money",
          returnUrl,
          cancelUrl,
        }),
      })) as {
        orderId: string;
        paymentId?: string;
        reference?: string;
        checkoutUrl?: string | null;
        payment?: {
          id?: string;
          reference?: string;
          checkoutUrl?: string | null;
        };
      };

      const checkoutUrl = result.checkoutUrl ?? result.payment?.checkoutUrl ?? null;
      const paymentId = result.paymentId ?? result.payment?.id ?? "";
      const reference = result.reference ?? result.payment?.reference ?? "";

      touchBuyerPaymentFromCheckout({
        reference,
        orderId: result.orderId,
        paymentId,
        listingId: listingIds[0] ?? "",
        listingIds,
        checkoutItems: checkoutItems.map(({ item, checkoutQuantity }) => ({
          listingId: String(item.listingId),
          quantity: checkoutQuantity,
        })),
        listingTitle:
          checkoutItems.length === 1
            ? checkoutItems[0].item.listingTitle
            : `${checkoutItems[0].item.listingTitle} + ${checkoutItems.length - 1} more`,
        quantity: checkoutItems.reduce((total, entry) => total + entry.checkoutQuantity, 0),
        totalPrice: checkoutItems.reduce(
          (total, entry) => total + entry.checkoutQuantity * entry.item.unitPrice,
          0,
        ),
        checkoutUrl,
        txRef: reference,
      });

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      throw new Error("Payment gateway did not return a checkout URL.");
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCheckoutSelected = () => {
    void handleCheckout(selectedItems);
  };

  return {
    items,
    itemCount,
    selectedItems,
    selectedQuantities,
    selectedCount,
    selectedUnits,
    selectedSubtotal,
    latestPendingCheckoutUrl,
    checkoutError,
    checkoutLoading,
    selectAllRef,
    allSelected,
    setAllSelected,
    setSelectedQuantity,
    toggleItemSelection,
    handleRemoveItem,
    handleCheckoutSelected,
  };
}
