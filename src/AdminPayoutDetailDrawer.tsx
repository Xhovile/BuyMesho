import { useEffect, useMemo, useState } from "react";
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
      {notice ? (
        <div
          className={`fixed left-4 top-4 z-[96] w-[min(28rem,calc(100vw-2rem))] rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

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
    </>
  );
}
