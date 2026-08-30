import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { apiFetch } from "./lib/api";
import PayoutDetailDrawer from "./PayoutDetailDrawer";

type Props = ComponentProps<typeof PayoutDetailDrawer>;
type Banner = { type: "success" | "error"; message: string };

function pickReason(...values: Array<string | null | undefined>) {
  return values.map((value) => String(value ?? "").trim()).find((value) => value.length > 0) ?? "Admin action";
}

function extractProviderMessage(value: unknown): string | null {
  if (!value) return null;
  const extract = (input: unknown): string | null => {
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) return null;
      try {
        const parsed = JSON.parse(trimmed);
        return extract(parsed) ?? trimmed;
      } catch {
        return trimmed;
      }
    }
    if (!input || typeof input !== "object") return null;
    const record = input as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "reason"]) {
      const candidate = extract(record[key]);
      if (candidate) return candidate;
    }
    if (record.response) return extract(record.response);
    return null;
  };
  return extract(value);
}

function mergeDefined<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const merged = { ...base } as T;
  for (const [key, value] of Object.entries(override)) {
    if (value !== null && value !== undefined && value !== "") {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

export default function AdminPayoutDetailDrawer(props: Props) {
  const inputSelected = props.selected;
  const [detailSelected, setDetailSelected] = useState<Props["selected"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Banner | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetailSelected(null);
    void apiFetch(`/api/admin/payouts/detail/${encodeURIComponent(inputSelected.id)}`)
      .then((data) => {
        if (!cancelled && data && typeof data === "object") {
          setDetailSelected(data as Props["selected"]);
        }
      })
      .catch(() => {
        if (!cancelled) setDetailSelected(null);
      });
    return () => {
      cancelled = true;
    };
  }, [inputSelected.id]);

  const selected = useMemo(
    () =>
      mergeDefined(
        inputSelected as unknown as Record<string, unknown>,
        (detailSelected ?? {}) as unknown as Record<string, unknown>,
      ) as Props["selected"],
    [detailSelected, inputSelected],
  );

  const safeVisibleActions = useMemo(
    () => props.visibleActions.filter((action) => action !== "refund_escrow"),
    [props.visibleActions],
  );

  const latestProviderMessage = extractProviderMessage(selected.latestAttemptProviderResponse);
  const displaySelected = useMemo(
    () => ({
      ...selected,
      latestAttemptFailureReason:
        latestProviderMessage ?? selected.latestAttemptFailureReason,
      lastError:
        selected.lastError ?? latestProviderMessage,
    }),
    [latestProviderMessage, selected],
  );

  const actionBusyId = busy ? selected.id : props.actionBusyId;

  useLayoutEffect(() => {
    const root = drawerRef.current;
    if (!root) return;

    const hiddenSiblings: Array<{ element: HTMLElement; display: string }> = [];
    const touchedAncestors: Array<{ element: HTMLElement; overflow: string }> = [];
    let node: HTMLElement | null = root;

    while (node && node !== document.body) {
      const parent = node.parentElement;
      if (!parent) break;

      for (const child of Array.from(parent.children)) {
        if (child === node || !(child instanceof HTMLElement)) continue;
        hiddenSiblings.push({ element: child, display: child.style.display });
        child.style.display = "none";
      }

      if (parent instanceof HTMLElement) {
        touchedAncestors.push({ element: parent, overflow: parent.style.overflow });
        parent.style.overflow = "visible";
      }

      node = parent;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyBackground = document.body.style.backgroundColor;
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    document.body.style.backgroundColor = "#f8fafc";

    return () => {
      hiddenSiblings.forEach(({ element, display }) => {
        element.style.display = display;
      });
      touchedAncestors.reverse().forEach(({ element, overflow }) => {
        element.style.overflow = overflow;
      });
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.backgroundColor = previousBodyBackground;
    };
  }, []);

  useEffect(() => {
    const handleSelectAll = (event: KeyboardEvent) => {
      if (!((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a")) return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        if (tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable) {
          return;
        }
      }

      const root = drawerRef.current;
      if (!root) return;

      event.preventDefault();
      event.stopPropagation();

      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(root);
      selection?.removeAllRanges();
      selection?.addRange(range);
    };

    document.addEventListener("keydown", handleSelectAll, true);
    return () => document.removeEventListener("keydown", handleSelectAll, true);
  }, []);

  const handleCopyDetails = async () => {
    const payload = {
      payoutId: displaySelected.id,
      sellerId: displaySelected.sellerId,
      sellerBusinessName: displaySelected.sellerBusinessName,
      orderId: displaySelected.orderId,
      escrowId: displaySelected.escrowId,
      releaseEntryId: displaySelected.releaseEntryId,
      amount: displaySelected.amount,
      currency: displaySelected.currency,
      status: displaySelected.status,
      provider: displaySelected.provider,
      providerStatus: displaySelected.providerStatus,
      providerChargeId: displaySelected.providerChargeId,
      providerReference: displaySelected.providerReference,
      providerTransactionId: displaySelected.providerTransactionId,
      destinationAccountId: displaySelected.destinationAccountId,
      destinationMaskedAccount: displaySelected.destinationMaskedAccount,
      destinationType: displaySelected.destinationType,
      destinationVerificationStatus: displaySelected.destinationVerificationStatus,
      destinationActive: displaySelected.destinationActive,
      destinationLastError: displaySelected.destinationLastError,
      sellerSuspended: displaySelected.sellerSuspended,
      failureReason: displaySelected.failureReason,
      manualReviewReason: displaySelected.manualReviewReason,
      latestAttemptNo: displaySelected.latestAttemptNo,
      latestAttemptStatus: displaySelected.latestAttemptStatus,
      latestAttemptFailureReason: displaySelected.latestAttemptFailureReason,
      latestAttemptAt: displaySelected.latestAttemptAt,
      latestAttemptProviderChargeId: displaySelected.latestAttemptProviderChargeId,
      latestAttemptProviderResponse: displaySelected.latestAttemptProviderResponse,
      latestWebhookEventType: displaySelected.latestWebhookEventType,
      latestWebhookEventAt: displaySelected.latestWebhookEventAt,
      latestAuditEventType: displaySelected.latestAuditEventType,
      latestAuditEventAt: displaySelected.latestAuditEventAt,
      retryEligible: displaySelected.retryEligible,
      retryBlockedReason: displaySelected.retryBlockedReason,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setNotice({ type: "success", message: "Payout details copied." });
    } catch {
      setNotice({ type: "error", message: "Unable to copy payout details." });
    }
  };

  const runAction = async (successMessage: string, task: () => Promise<unknown>) => {
    setBusy(true);
    setNotice(null);
    try {
      await task();
      setNotice({ type: "success", message: successMessage });
      window.setTimeout(() => window.location.reload(), 300);
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Action failed.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRetry = async () => {
    if (!window.confirm(`Retry payout ${selected.id}?`)) return;
    await runAction("Payout retried.", () =>
      apiFetch(`/api/admin/payouts/${encodeURIComponent(selected.id)}/retry`, {
        method: "POST",
        body: JSON.stringify({ payoutId: selected.id, sellerId: selected.sellerId }),
      }),
    );
  };

  const handleReconcile = async () => {
    if (!window.confirm(`Reconcile payout ${selected.id}?`)) return;
    await runAction("Payout reconciled.", () =>
      apiFetch(`/api/admin/payouts/${encodeURIComponent(selected.id)}/reconcile`, {
        method: "POST",
      }),
    );
  };

  const handleRefundEscrow = async () => {
    setNotice({
      type: "error",
      message: "Refund escrow is not wired yet. Hide this action or add the backend route before enabling it.",
    });
  };

  const handleOverride = async (action: Parameters<NonNullable<Props["onOpenOverrideDialog"]>>[0]) => {
    const label = action.replace(/_/g, " ");
    if (!window.confirm(`Apply ${label} to payout ${selected.id}?`)) return;
    const reason = pickReason(
      props.sellerControlReason,
      props.destinationReason,
      selected.manualReviewReason,
      selected.lastError,
      selected.failureReason,
      `Admin ${label}`,
    );
    await runAction("Payout updated.", () =>
      apiFetch(`/api/admin/payouts/${encodeURIComponent(selected.id)}/override`, {
        method: "POST",
        body: JSON.stringify({ payoutId: selected.id, sellerId: selected.sellerId, action, reason }),
      }),
    );
  };

  const handleDestinationVerification = async () => {
    if (!selected.destinationAccountId) {
      setNotice({ type: "error", message: "This payout does not have a destination account attached." });
      return;
    }
    const status = String(props.destinationStatus ?? selected.destinationVerificationStatus ?? "").trim().toLowerCase();
    if (!["pending", "verified", "failed", "disabled"].includes(status)) {
      setNotice({ type: "error", message: "Choose a valid destination verification status first." });
      return;
    }
    const reason = pickReason(props.destinationReason, selected.destinationLastError, `Admin set destination to ${status}`);
    await runAction("Destination verification updated.", () =>
      apiFetch(`/api/admin/payouts/destinations/${encodeURIComponent(selected.destinationAccountId as string)}/verification`, {
        method: "POST",
        body: JSON.stringify({ status, reason }),
      }),
    );
  };

  const handleApproveDestinationVerification = async () => {
    if (!selected.destinationAccountId) {
      setNotice({ type: "error", message: "This payout does not have a destination account attached." });
      return;
    }
    await runAction("Destination approved.", () =>
      apiFetch(`/api/admin/payouts/destinations/${encodeURIComponent(selected.destinationAccountId as string)}/verification`, {
        method: "POST",
        body: JSON.stringify({ status: "verified", reason: pickReason(props.destinationReason, "Destination approved by admin") }),
      }),
    );
  };

  const handleSellerSuspension = async (suspended: boolean) => {
    const reason = pickReason(props.sellerControlReason, selected.manualReviewReason, selected.lastError, suspended ? "Admin suspension" : "Admin unsuspension");
    await runAction(suspended ? "Seller payouts suspended." : "Seller payouts unsuspended.", () =>
      apiFetch(`/api/admin/payouts/sellers/${encodeURIComponent(selected.sellerId)}/suspension`, {
        method: "POST",
        body: JSON.stringify({ suspended, reason }),
      }),
    );
  };

  const handleCreateAdjustment = async () => {
    const amount = Number(props.adjustmentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice({ type: "error", message: "Enter a valid positive adjustment amount." });
      return;
    }
    const reason = pickReason(props.adjustmentReason, "Manual payout adjustment");
    await runAction("Adjustment created.", () =>
      apiFetch(`/api/admin/payouts/${encodeURIComponent(selected.id)}/adjustments`, {
        method: "POST",
        body: JSON.stringify({
          adjustmentType: props.adjustmentType,
          amount,
          reason,
          providerReference: props.adjustmentProviderRef || undefined,
        }),
      }),
    );
  };

  return (
    <>
      <style>{`
        [data-admin-payout-workspace] {
          position: static !important;
          display: block !important;
          width: 100% !important;
          max-width: none !important;
          min-height: 100vh !important;
        }

        [data-admin-payout-workspace] div[class*="fixed"][class*="inset-0"] {
          position: static !important;
          inset: auto !important;
          display: block !important;
          width: 100% !important;
          min-height: 0 !important;
          background: transparent !important;
          backdrop-filter: none !important;
          z-index: auto !important;
        }

        [data-admin-payout-workspace] div[class*="fixed"][class*="inset-0"] > aside {
          margin-left: 0 !important;
          width: 100% !important;
          max-width: none !important;
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          box-shadow: none !important;
        }
      `}</style>

      <div ref={drawerRef} data-admin-payout-workspace className="min-h-screen w-full bg-slate-50 outline-none">
        {notice ? (
          <div className={`sticky top-0 z-[96] mx-auto w-full max-w-6xl border-b px-4 py-3 text-sm font-semibold ${
            notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
          }`}>
            {notice.message}
          </div>
        ) : null}

        <div className="sticky top-0 z-[95] border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Payout detail workspace</p>
              <p className="mt-1 text-sm font-black text-zinc-950">{displaySelected.id}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyDetails()}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 shadow-sm hover:bg-zinc-50"
            >
              Copy Details
            </button>
          </div>
        </div>

        <PayoutDetailDrawer
          {...props}
          selected={displaySelected}
          visibleActions={safeVisibleActions}
          actionBusyId={actionBusyId}
          onOpenRetryDialog={() => void handleRetry()}
          onOpenOverrideDialog={(action) => void handleOverride(action)}
          onOpenReconcileDialog={() => void handleReconcile()}
          onOpenRefundEscrowDialog={() => void handleRefundEscrow()}
          onUpdateDestinationVerification={() => void handleDestinationVerification()}
          onApproveDestinationVerification={() => void handleApproveDestinationVerification()}
          onUpdateSellerSuspension={(suspended) => void handleSellerSuspension(suspended)}
          onCreateAdjustment={() => void handleCreateAdjustment()}
        />
      </div>
    </>
  );
}
