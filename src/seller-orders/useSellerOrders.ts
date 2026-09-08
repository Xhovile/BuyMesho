import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { navigateToPath } from "../lib/appNavigation";
import { SELLER_HUB_PATH, SELLER_ORDERS_PATH } from "../lib/appNavigation.paths";
import { useAccountProfile } from "../hooks/useAccountProfile";
import { getSellerCache, setSellerCache } from "../lib/sellerWorkspaceCache";
import type { DisputedFilter, FilterKey, OrderBundle, SellerResolution } from "./types";
import { isPendingDispute, isSettledDispute, matchesFilter, normalize } from "./utils";

const today = () => new Date().toISOString().slice(0, 10);

export function useSellerOrders() {
  const { profileLoading, profile } = useAccountProfile();
  const [orders, setOrders] = useState<OrderBundle[]>(() => getSellerCache<OrderBundle[]>("orders") ?? []);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [disputedFilter, setDisputedFilter] = useState<DisputedFilter>("all");
  const [selected, setSelected] = useState<OrderBundle | null>(null);
  const [loading, setLoading] = useState(() => getSellerCache<OrderBundle[]>("orders") === null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [sellerResolution, setSellerResolution] = useState<SellerResolution>(null);
  const [resolutionReason, setResolutionReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("mobile_money");
  const [refundTransactionId, setRefundTransactionId] = useState("");
  const [refundDate, setRefundDate] = useState(today);
  const [refundDestination, setRefundDestination] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [refundEvidence, setRefundEvidence] = useState<string[]>([]);
  const [refundEvidenceInput, setRefundEvidenceInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async (force = false) => {
    if (!force) {
      const cached = getSellerCache<OrderBundle[]>("orders");
      if (cached !== null) {
        setOrders(cached);
        setLoading(false);
        return;
      }
    }

    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await apiFetch("/api/seller/orders", force ? { cache: "no-store" } : undefined);
      const next = Array.isArray(data) ? (data as OrderBundle[]) : [];
      setOrders(next);
      setSellerCache("orders", next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load seller orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const cachedOrders = getSellerCache<OrderBundle[]>("orders");
    if (!profileLoading && profile?.is_seller && cachedOrders === null) void loadOrders();
  }, [profileLoading, profile?.is_seller]);

  const selectedOrderId = new URLSearchParams(window.location.search).get("order");

  useEffect(() => {
    if (!selectedOrderId) {
      setSelected(null);
      return;
    }

    setSelected(orders.find((entry) => entry.order.id === selectedOrderId) ?? null);
  }, [orders, selectedOrderId]);

  const resetResolutionFields = () => {
    setSellerResolution(null);
    setResolutionReason("");
    setRefundAmount("");
    setRefundMethod("mobile_money");
    setRefundTransactionId("");
    setRefundDestination("");
    setRefundNote("");
    setRefundEvidence([]);
    setRefundEvidenceInput("");
    setRefundDate(today());
    setError(null);
  };

  useEffect(() => {
    resetResolutionFields();
  }, [selectedOrderId]);

  const filteredOrders = useMemo(
    () => orders.filter((bundle) => matchesFilter(bundle, filter, disputedFilter)),
    [orders, filter, disputedFilter],
  );
  const pendingDisputes = useMemo(() => orders.filter(isPendingDispute), [orders]);

  const openOrder = (bundle: OrderBundle) => {
    setSelected(bundle);
    navigateToPath(`${SELLER_ORDERS_PATH}&order=${encodeURIComponent(bundle.order.id)}`);
  };

  const closeOrder = () => {
    setSelected(null);
    navigateToPath(SELLER_ORDERS_PATH);
  };

  const updateSelectedBundle = (nextBundle: OrderBundle) => {
    setOrders((current) => {
      const next = current.map((entry) =>
        entry.order.id === nextBundle.order.id ? nextBundle : entry,
      );
      setSellerCache("orders", next);
      return next;
    });
    setSelected(nextBundle);
  };

  const markAsPendingDelivery = async (bundle: OrderBundle) => {
    try {
      setActionLoading(true);
      const updated = await apiFetch(
        `/api/seller/orders/${encodeURIComponent(bundle.order.id)}/mark-pending-delivery`,
        { method: "POST" },
      );
      updateSelectedBundle(updated as OrderBundle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update delivery status");
    } finally {
      setActionLoading(false);
    }
  };

  const contactBuyer = async (bundle: OrderBundle) => {
    try {
      setResolutionLoading(true);
      setError(null);
      const result = await apiFetch(
        `/api/seller/disputes/${encodeURIComponent(bundle.order.id)}/dispute/contact-buyer`,
        { method: "POST" },
      );
      if (result?.conversationTarget) {
        navigateToPath(String(result.conversationTarget));
        return;
      }
      setError("Buyer conversation could not be opened.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open buyer conversation");
    } finally {
      setResolutionLoading(false);
    }
  };

  const chooseSellerResolution = (resolution: Exclude<SellerResolution, null>) => {
    resetResolutionFields();
    setSellerResolution(resolution);
  };

  const addEvidence = () => {
    const value = refundEvidenceInput.trim();
    if (!value || refundEvidence.includes(value)) {
      setRefundEvidenceInput("");
      return;
    }
    setRefundEvidence((current) => [...current, value].slice(0, 20));
    setRefundEvidenceInput("");
  };

  const payoutPaid = normalize(selected?.payoutStatus) === "paid";

  const submitSellerRefund = async () => {
    if (!selected) return;

    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid refund amount.");
      return;
    }
    if (amount > Number(selected.order.total.amount)) {
      setError("Refund amount cannot exceed the order total.");
      return;
    }
    if (!payoutPaid) {
      setError("Seller payout must be paid before recording a seller refund.");
      return;
    }
    if (!refundTransactionId.trim()) {
      setError("Transaction ID is required.");
      return;
    }
    if (!refundDate) {
      setError("Refund date is required.");
      return;
    }

    try {
      setResolutionLoading(true);
      setError(null);
      await apiFetch(
        `/api/seller/disputes/${encodeURIComponent(selected.order.id)}/dispute/confirm-refunded`,
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            refundMethod,
            transactionId: refundTransactionId.trim(),
            refundDate,
            destination: refundDestination.trim() || undefined,
            note: refundNote.trim() || undefined,
            evidence: refundEvidence,
          }),
        },
      );
      resetResolutionFields();
      await loadOrders(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record seller refund");
    } finally {
      setResolutionLoading(false);
    }
  };

  const submitSellerNonRefund = async () => {
    if (!selected || (sellerResolution !== "replacement" && sellerResolution !== "rejected")) return;

    const explanation = resolutionReason.trim();
    if (explanation.length < 10) {
      setError("Please provide at least 10 characters explaining this resolution.");
      return;
    }

    try {
      setResolutionLoading(true);
      setError(null);
      await apiFetch(
        `/api/seller/disputes/${encodeURIComponent(selected.order.id)}/dispute/resolve`,
        {
          method: "POST",
          body: JSON.stringify({
            resolution: sellerResolution,
            reason: explanation,
            paymentStatus: normalize(selected.order.status),
          }),
        },
      );
      resetResolutionFields();
      await loadOrders(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit seller resolution");
    } finally {
      setResolutionLoading(false);
    }
  };

  return {
    profileLoading,
    profile,
    selectedOrderId,
    orders,
    filter,
    disputedFilter,
    selected,
    loading,
    refreshing,
    actionLoading,
    resolutionLoading,
    sellerResolution,
    resolutionReason,
    refundAmount,
    refundMethod,
    refundTransactionId,
    refundDate,
    refundDestination,
    refundNote,
    refundEvidence,
    refundEvidenceInput,
    error,
    filteredOrders,
    pendingDisputes,
    payoutPaid,
    setFilter,
    setDisputedFilter,
    setResolutionReason,
    setRefundAmount,
    setRefundMethod,
    setRefundTransactionId,
    setRefundDate,
    setRefundDestination,
    setRefundNote,
    setRefundEvidenceInput,
    loadOrders,
    openOrder,
    closeOrder,
    markAsPendingDelivery,
    contactBuyer,
    chooseSellerResolution,
    addEvidence,
    submitSellerRefund,
    submitSellerNonRefund,
    navigateToSellerHub: () => navigateToPath(SELLER_HUB_PATH),
    resetResolutionFields,
    isSettledDispute,
  };
}
