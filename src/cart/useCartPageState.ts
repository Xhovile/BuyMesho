import { useEffect, useMemo, useRef, useState } from "react";

import {
  readBuyerCart,
  readBuyerPayments,
  refreshBuyerCartFromServer,
  removeBuyerCartItem,
  subscribeToBuyerCartChanges,
  touchBuyerPaymentFromCheckout,
  type BuyerCartItem,
  type BuyerPaymentEventDetail,
  type BuyerPaymentRecord,
} from "../lib/buyerState";
import { apiFetch } from "../lib/api";
import { ENDPOINTS } from "../shared/api/endpoints";
import { useAuthUser } from "../hooks/useAuthUser";
import {
  readEventCart,
  removeEventCartItem,
  subscribeToEventCartChanges,
  type EventCartItem,
} from "../lib/eventCart";
import { getCartItemKey, type CartCheckoutItem, type CartItemViewModel } from "./cartTypes";

export type CartCheckoutEntry = {
  item: CartItemViewModel;
  checkoutQuantity: number;
};

function mapBuyerCartItem(item: BuyerCartItem): CartItemViewModel {
  return {
    kind: "listing",
    cartKey: getCartItemKey("listing", String(item.listingId)),
    itemId: String(item.listingId),
    title: item.listingTitle,
    subtitle: item.university ?? null,
    description: item.listingDescription ?? null,
    image: item.listingImage ?? null,
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    unitPrice: Number(item.unitPrice) || 0,
    totalPrice: Number(item.totalPrice) || 0,
    availableQuantity: item.availableQuantity ?? null,
    addedAt: item.addedAt,
  };
}

function mapEventCartItem(item: EventCartItem): CartItemViewModel {
  return {
    kind: "event_ticket",
    cartKey: getCartItemKey("event_ticket", String(item.eventId)),
    itemId: String(item.eventId),
    title: item.eventTitle,
    subtitle: item.organizerName ?? null,
    description: [item.eventDate, item.startTime, item.venue, item.location].filter(Boolean).join(" • "),
    image: null,
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    unitPrice: Number(item.unitPrice) || 0,
    totalPrice: Number(item.totalPrice) || 0,
    availableQuantity: null,
    addedAt: item.addedAt,
  };
}

function mergeCartItems(listingItems: BuyerCartItem[], eventItems: EventCartItem[]): CartItemViewModel[] {
  return [
    ...listingItems.map(mapBuyerCartItem),
    ...eventItems.map(mapEventCartItem),
  ].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
}

export function useCartPageState() {
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const [items, setItems] = useState<CartItemViewModel[]>(() =>
    mergeCartItems(readBuyerCart(), readEventCart(firebaseUser?.uid ?? null)),
  );
  const [payments, setPayments] = useState<BuyerPaymentRecord[]>(() => readBuyerPayments());
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const previousCartKeysRef = useRef<string[]>([]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      if (!mounted) return;
      setPayments(readBuyerPayments());

      const localListingItems = readBuyerCart();
      const localEventItems = readEventCart(firebaseUser?.uid ?? null);
      setItems(mergeCartItems(localListingItems, localEventItems));

      if (authLoading || !firebaseUser?.uid) {
        return;
      }

      try {
        const refreshedListings = await refreshBuyerCartFromServer();
        if (!mounted) return;
        const refreshedEventItems = readEventCart(firebaseUser.uid);
        setItems(mergeCartItems(refreshedListings, refreshedEventItems));
        setPayments(readBuyerPayments());
      } catch {
        if (!mounted) return;
        setItems(mergeCartItems(readBuyerCart(), readEventCart(firebaseUser.uid)));
        setPayments(readBuyerPayments());
      }
    };

    void sync();
    const unsubscribeListings = subscribeToBuyerCartChanges(() => {
      if (!mounted) return;
      setItems(mergeCartItems(readBuyerCart(), readEventCart(firebaseUser?.uid ?? null)));
      setPayments(readBuyerPayments());
    });
    const unsubscribeEvents = subscribeToEventCartChanges(() => {
      if (!mounted) return;
      setItems(mergeCartItems(readBuyerCart(), readEventCart(firebaseUser?.uid ?? null)));
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
  }, [firebaseUser?.uid, authLoading]);

  useEffect(() => {
    const nextCartKeys = items.map((item) => item.cartKey);
    const previousCartKeySet = new Set(previousCartKeysRef.current);

    setSelectedQuantities((current) => {
      const next: Record<string, number> = {};

      for (const item of items) {
        const previousValue = current[item.cartKey];
        const isExistingItem = previousCartKeySet.has(item.cartKey);
        const maxSelectable = Math.max(0, Number(item.availableQuantity ?? item.quantity) || 0);
        const fallbackQuantity = isExistingItem ? previousValue ?? 0 : item.quantity;

        next[item.cartKey] = Math.max(0, Math.min(maxSelectable, Math.floor(Number(fallbackQuantity) || 0)));
      }

      return next;
    });

    previousCartKeysRef.current = nextCartKeys;
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
            checkoutQuantity: Math.max(0, Math.min(maxSelectable, selectedQuantities[item.cartKey] ?? 0)),
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

  const setSelectedQuantity = (cartKey: string, quantity: number, maxQuantity: number) => {
    setSelectedQuantities((current) => ({
      ...current,
      [cartKey]: Math.max(0, Math.min(maxQuantity, Math.floor(quantity))),
    }));
  };

  const toggleItemSelection = (cartKey: string, maxQuantity: number) => {
    setSelectedQuantities((current) => {
      const currentQuantity = current[cartKey] ?? 0;
      const nextQuantity = currentQuantity > 0 ? 0 : Math.min(1, maxQuantity);
      return { ...current, [cartKey]: nextQuantity };
    });
  };

  const setAllSelected = (checked: boolean) => {
    setSelectedQuantities((current) => {
      const next = { ...current };
      for (const item of items) {
        const maxSelectable = Math.max(0, Number(item.availableQuantity ?? item.quantity) || 0);
        next[item.cartKey] = checked ? maxSelectable : 0;
      }
      return next;
    });
  };

  const handleRemoveItem = async (cartKey: string) => {
    const item = items.find((entry) => entry.cartKey === cartKey);
    if (!item) return;

    if (item.kind === "listing") {
      await removeBuyerCartItem(item.itemId);
    } else {
      const uid = firebaseUser?.uid;
      if (uid) {
        removeEventCartItem(uid, item.itemId);
      }
    }

    setItems((current) => current.filter((entry) => entry.cartKey !== cartKey));
    setSelectedQuantities((current) => {
      const next = { ...current };
      delete next[cartKey];
      return next;
    });
  };

  const handleCheckout = async (checkoutItems: CartCheckoutEntry[]) => {
    if (!checkoutItems.length || checkoutLoading) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const listingIds = checkoutItems
        .filter(({ item }) => item.kind === "listing")
        .map(({ item }) => item.itemId);
      const eventIds = checkoutItems
        .filter(({ item }) => item.kind === "event_ticket")
        .map(({ item }) => item.itemId);
      const eventCartById = new Map((readEventCart(firebaseUser?.uid ?? null) || []).map((event) => [String(event.eventId), event]));
      const returnUrl = `${window.location.origin}/payment/return`;
      const cancelUrl = `${window.location.origin}/payment/return?cancelled=1`;
      const idempotencyKey = crypto.randomUUID();
      const payloadItems: CartCheckoutItem[] = checkoutItems.map(({ item, checkoutQuantity }) =>
        item.kind === "listing"
          ? { listingId: item.itemId, quantity: checkoutQuantity }
          : { eventId: item.itemId, quantity: checkoutQuantity },
      );
      const eventDetails: BuyerPaymentEventDetail[] = checkoutItems
        .filter(({ item }) => item.kind === "event_ticket")
        .map(({ item, checkoutQuantity }) => {
          const event = eventCartById.get(item.itemId);
          const title = event?.eventTitle ?? item.title;
          const organizerName = event?.organizerName ?? item.subtitle ?? "Event organizer";
          const eventDate = event?.eventDate ?? "";
          const startTime = event?.startTime ?? "";
          const venue = event?.venue ?? "";
          const location = event?.location ?? "";
          const ticketPrice = event?.ticketPrice ?? item.unitPrice;
          const ticketLink = event?.ticketLink ?? null;

          return {
            eventId: item.itemId,
            title,
            organizerName,
            eventDate,
            startTime,
            venue,
            location,
            ticketPrice,
            ticketLink,
            quantity: checkoutQuantity,
          };
        });

      const result = (await apiFetch(ENDPOINTS.payments.checkout, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          items: payloadItems,
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
      const totalQuantity = checkoutItems.reduce((total, entry) => total + entry.checkoutQuantity, 0);
      const totalPrice = checkoutItems.reduce(
        (total, entry) => total + entry.checkoutQuantity * entry.item.unitPrice,
        0,
      );
      const displayTitle =
        checkoutItems.length === 1
          ? checkoutItems[0].item.title
          : `${checkoutItems[0].item.title} + ${checkoutItems.length - 1} more`;

      touchBuyerPaymentFromCheckout({
        reference,
        orderId: result.orderId,
        paymentId,
        listingId: listingIds[0] ?? eventIds[0] ?? "",
        listingIds: listingIds.length ? listingIds : undefined,
        eventIds: eventIds.length ? eventIds : undefined,
        eventDetails: eventDetails.length ? eventDetails : undefined,
        checkoutItems: payloadItems,
        listingTitle: displayTitle,
        quantity: totalQuantity,
        totalPrice,
        checkoutUrl,
        txRef: reference,
      } as any);

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
