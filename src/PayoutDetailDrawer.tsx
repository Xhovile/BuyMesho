import type { ReactNode } from "react";
import { CircleAlert, Loader2, RefreshCw, ShieldCheck, Wallet, X } from "lucide-react";
import FormDropdown from "./components/FormDropdown";
import type { OverrideAction, PayoutAdjustment, PayoutRow, RowAction } from "./AdminPayoutsManager";
import { classifyPayoutDiagnostic, getPayoutDiagnostics } from "./modules/payouts/diagnostics";

type PayoutDetailDrawerProps = {
  selected: PayoutRow;
  visibleActions: string[];
  actionBusyId: string | null;
  adjustments: PayoutAdjustment[];
  adjustmentsLoading: boolean;
  destinationStatus: string;
  destinationReason: string;
  sellerControlReason: string;
  adjustmentType: "processing_fee" | "manual_adjustment";
  adjustmentAmount: string;
  adjustmentReason: string;
  adjustmentProviderRef: string;
  destinationStatusOptions: readonly { value: string; label: string }[];
  adjustmentTypeOptions: readonly { value: "manual_adjustment" | "processing_fee"; label: string }[];
  canAction: (row: PayoutRow, action: RowAction) => boolean;
  statusTone: (status: string) => string;
  formatStatus: (value: string | null | undefined) => string;
  toDate: (value: string | null | undefined) => string;
  onClose: () => void;
  onOpenRetryDialog: () => void;
  onOpenOverrideDialog: (action: OverrideAction, confirmLabel: string) => void;
  onOpenReconcileDialog: () => void;
  onOpenRefundEscrowDialog: () => void;
  isAdmin: boolean;
  onDestinationStatusChange: (value: string) => void;
  onDestinationReasonChange: (value: string) => void;
  onUpdateDestinationVerification: () => void;
  onApproveDestinationVerification: () => void;
  onSellerControlReasonChange: (value: string) => void;
  onUpdateSellerSuspension: (suspended: boolean) => void;
  onReloadAdjustments: () => void;
  onAdjustmentTypeChange: (value: "processing_fee" | "manual_adjustment") => void;
  onAdjustmentAmountChange: (value: string) => void;
  onAdjustmentReasonChange: (value: string) => void;
  onAdjustmentProviderRefChange: (value: string) => void;
  onCreateAdjustment: () => void;
};

function Value({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className={`mt-1 break-all text-sm font-semibold text-zinc-950 ${mono ? "font-mono text-[13px]" : ""}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-zinc-200 bg-white ${className}`}>
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-sm font-black tracking-tight text-zinc-950">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>{label}</span>;
}

export default function PayoutDetailDrawer({
  selected,
  visibleActions,
  actionBusyId,
  adjustments,
  adjustmentsLoading,
  destinationStatus,
  destinationReason,
  sellerControlReason,
  adjustmentType,
  adjustmentAmount,
  adjustmentReason,
  adjustmentProviderRef,
  destinationStatusOptions,
  adjustmentTypeOptions,
  canAction,
  statusTone,
  formatStatus,
  toDate,
  onClose,
  onOpenRetryDialog,
  onOpenOverrideDialog,
  onOpenReconcileDialog,
  onOpenRefundEscrowDialog,
  isAdmin,
  onDestinationStatusChange,
  onDestinationReasonChange,
  onUpdateDestinationVerification,
  onApproveDestinationVerification,
  onSellerControlReasonChange,
  onUpdateSellerSuspension,
  onReloadAdjustments,
  onAdjustmentTypeChange,
  onAdjustmentAmountChange,
  onAdjustmentReasonChange,
  onAdjustmentProviderRefChange,
  onCreateAdjustment,
}: PayoutDetailDrawerProps) {
  const exactDiagnostics = getPayoutDiagnostics(selected);
  const primaryDiagnostic = classifyPayoutDiagnostic(selected);
  const destinationVerified = String(selected.destinationVerificationStatus ?? "").toLowerCase() === "verified" && selected.destinationActive !== false;
  const canApproveDestination = !!selected.destinationAccountId && !destinationVerified;
  const escrowState = String(selected.escrowState ?? "").toLowerCase();
  const canRefundEscrow = isAdmin && Boolean(selected.orderId) && Boolean(selected.escrowId) && !["released", "refunded", "closed"].includes(escrowState);

  const blockerCandidates = [selected.holdReason, selected.manualReviewReason, selected.retryBlockedReason, selected.lastError, selected.latestAttemptFailureReason, selected.destinationLastError, ...(selected.verificationBlockers ?? [])].filter((value): value is string => Boolean(value?.trim()));
  const uniqueBlockers = Array.from(new Set(blockerCandidates.map((value) => value.trim())));
  const retryDisabled = !selected.retryEligible;
  const busy = actionBusyId === selected.id;
  const providerFailure = primaryDiagnostic.classification === "provider";
  const diagnosticTone = providerFailure || primaryDiagnostic.classification === "reconciliation" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-900";
  const diagnosticTitle = primaryDiagnostic.message ? primaryDiagnostic.label : "No active blocker";
  const diagnosticMessage = primaryDiagnostic.message ?? "The payout has no classified operational blocker.";

  const actionButton = (action: string, label: string, icon: ReactNode, onClick: () => void, destructive = false) => {
    if (!visibleActions.includes(action)) return null;
    const allowed = canAction(selected, action as RowAction);
    return (
      <button type="button" disabled={busy || !allowed} onClick={onClick} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-sm shadow-zinc-300/60 transition-[box-shadow,transform,background-color] duration-150 hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-400/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${destructive ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-zinc-950 text-white hover:bg-zinc-800"}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-950">
      <style>{`
        [data-admin-payout-workspace] > div[class*="z-[95]"] {
          display: none !important;
        }

        @media (max-width: 639px) {
          [data-admin-payout-workspace] {
            width: 100% !important;
            min-height: 100vh !important;
          }

          header {
            position: relative !important;
            padding: 0.75rem 0.75rem 1rem !important;
          }

          header > div {
            position: relative !important;
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 0.75rem !important;
            align-items: stretch !important;
          }

          header > div > div:first-child {
            display: contents !important;
          }

          header > div > div:first-child > div:first-child {
            order: 3;
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 0.5rem !important;
            margin: 0 !important;
          }

          header > div > div:first-child > div:first-child > span {
            width: 100% !important;
            min-width: 0 !important;
            justify-content: flex-start !important;
            border-radius: 1rem !important;
            padding: 0.7rem 0.9rem !important;
            font-size: 0.8rem !important;
          }

          header > div > div:first-child > div:nth-child(2) {
            order: 1;
            margin: 0 !important;
            gap: 0.6rem !important;
            position: relative !important;
          }

          header > div > div:first-child > div:nth-child(2) > button {
            position: absolute !important;
            top: -0.05rem !important;
            right: 0 !important;
            z-index: 40 !important;
            border-radius: 9999px !important;
            padding: 0.55rem !important;
            background: white !important;
            box-shadow: 0 8px 20px rgba(24, 24, 27, 0.12) !important;
          }

          header > div > div:nth-child(2) {
            order: 2;
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 0.5rem !important;
            width: 100% !important;
            min-width: 0 !important;
            padding: 0.75rem !important;
            border: 1.5px solid #ef4444 !important;
            border-radius: 1.5rem !important;
            background: white !important;
            box-shadow: 0 12px 28px rgba(24, 24, 27, 0.10) !important;
          }

          header > div > div:nth-child(2) > button {
            width: 100% !important;
            min-width: 0 !important;
            min-height: 2.9rem !important;
            justify-content: center !important;
            gap: 0.35rem !important;
            padding: 0.55rem 0.35rem !important;
            font-size: 0.76rem !important;
            white-space: nowrap !important;
          }

          header > div > div:nth-child(2) > button svg {
            width: 0.95rem !important;
            height: 0.95rem !important;
            flex: 0 0 auto !important;
          }

          main {
            width: 100% !important;
            max-width: none !important;
            padding: 0 0 1rem !important;
          }

          main > div {
            gap: 1rem !important;
          }

          main > div > div,
          main > div > aside {
            width: 100% !important;
            min-width: 0 !important;
          }

          main section,
          main details {
            border-radius: 0 !important;
            border-left-width: 0 !important;
            border-right-width: 0 !important;
          }

          main section > div,
          main details > summary,
          main details > div {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }

          main section > div > div.grid,
          main section > div > div.space-y-4,
          main section > div > div.space-y-2 {
            min-width: 0 !important;
          }
        }
      `}</style>
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label={formatStatus(selected.status)} tone={statusTone(selected.status)} />
              <StatusPill label={selected.sellerSuspended ? "Seller suspended" : "Seller active"} tone={selected.sellerSuspended ? "border-rose-200 bg-rose-50 text-rose-700" : "border-zinc-200 bg-zinc-100 text-zinc-700"} />
              <StatusPill label={`Destination ${formatStatus(selected.destinationVerificationStatus)}`} tone={destinationVerified ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-white text-zinc-700"} />
            </div>
            <div className="mt-2 flex min-w-0 items-center gap-3">
              <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50" aria-label="Back"><X className="h-4 w-4" /></button>
              <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Payout</p><h1 className="truncate text-base font-black tracking-tight sm:text-lg">{selected.id}</h1></div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {actionButton("retry", "Retry", <RefreshCw className="h-4 w-4" />, onOpenRetryDialog)}
            <button type="button" disabled={busy} onClick={onOpenReconcileDialog} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 shadow-sm shadow-zinc-300/60 transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow-md hover:shadow-zinc-400/40 active:translate-y-0 disabled:opacity-50 disabled:shadow-none">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Reconcile</button>
            {actionButton("hold", "Hold", <ShieldCheck className="h-4 w-4" />, () => onOpenOverrideDialog("hold", "hold"))}
            {actionButton("mark_paid", "Mark paid", <Wallet className="h-4 w-4" />, () => onOpenOverrideDialog("mark_paid", "mark paid"))}
            {actionButton("mark_failed", "Mark failed", <CircleAlert className="h-4 w-4" />, () => onOpenOverrideDialog("mark_failed", "mark failed"), true)}
            {actionButton("cancel", "Cancel", <X className="h-4 w-4" />, () => onOpenOverrideDialog("cancel", "cancel"), true)}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.8fr)]">
          <div className="min-w-0 space-y-6">
            <section className={`rounded-3xl border px-5 py-5 ${diagnosticTone}`}><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{diagnosticTitle}</p><p className="mt-2 text-lg font-black tracking-tight">{diagnosticMessage}</p>{uniqueBlockers.length > 0 ? <p className="mt-2 text-sm opacity-80">{uniqueBlockers[0]}</p> : null}</div><div className="grid shrink-0 gap-4 sm:grid-cols-2 lg:min-w-[420px]"><Value label="Amount" value={`${selected.currency} ${Number(selected.amount).toLocaleString()}`} /><Value label="Provider" value={`${formatStatus(selected.provider)} · ${formatStatus(selected.providerStatus)}`} /><Value label="Latest attempt" value={selected.latestAttemptNo ? `#${selected.latestAttemptNo} · ${formatStatus(selected.latestAttemptStatus)}` : "No attempt recorded"} /><Value label="Retry" value={retryDisabled ? selected.retryBlockedReason ?? "Unavailable" : "Available"} /></div></div></section>
            <Panel title="Payout details"><div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3"><Value label="Payout ID" value={selected.id} mono /><Value label="Seller ID" value={selected.sellerId} mono /><Value label="Order ID" value={selected.orderId ?? "—"} mono /><Value label="Escrow ID" value={selected.escrowId ?? "—"} mono /><Value label="Release entry" value={selected.releaseEntryId ?? "—"} mono /><Value label="Requested by" value={selected.requestedBy ?? "—"} mono /><Value label="Destination" value={selected.destinationMaskedAccount ?? "—"} /><Value label="Destination type" value={formatStatus(selected.destinationType)} /><Value label="Destination status" value={`${formatStatus(selected.destinationVerificationStatus)} · ${selected.destinationActive ? "Active" : "Inactive"}`} /></div></Panel>
            <Panel title="Activity"><div className="divide-y divide-zinc-100">{[["Created", selected.createdAt],["Requested", selected.requestedAt],["Sent", selected.sentAt],["Failed", selected.failedAt],["Paid", selected.paidAt],["Updated", selected.updatedAt]].filter(([, value]) => Boolean(value)).map(([label, value]) => <div key={label} className="flex items-center justify-between gap-6 py-3 first:pt-0 last:pb-0"><span className="text-sm font-semibold text-zinc-700">{label}</span><span className="text-right text-sm text-zinc-500">{toDate(value)}</span></div>)}</div></Panel>
            {primaryDiagnostic.message || uniqueBlockers.length > 0 ? <details className="overflow-hidden rounded-3xl border border-zinc-200 bg-white"><summary className="cursor-pointer list-none px-5 py-4 text-sm font-black text-zinc-950">More diagnostic detail</summary><div className="border-t border-zinc-100 px-5 py-5"><div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3"><Value label="Provider reference" value={selected.providerReference ?? "—"} mono /><Value label="Provider charge" value={selected.providerChargeId ?? "—"} mono /><Value label="Provider transaction" value={selected.providerTransactionId ?? "—"} mono /><Value label="Latest failure" value={selected.latestAttemptFailureReason ?? "—"} /><Value label="Latest webhook" value={selected.latestWebhookEventType ? `${formatStatus(selected.latestWebhookEventType)} · ${toDate(selected.latestWebhookEventAt)}` : "—"} /><Value label="Latest audit" value={selected.latestAuditEventType ? `${formatStatus(selected.latestAuditEventType)} · ${toDate(selected.latestAuditEventAt)}` : "—"} /></div>{uniqueBlockers.length > 0 ? <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Blockers</p><ul className="mt-2 space-y-1 text-sm text-zinc-700">{uniqueBlockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}</ul></div> : null}<details className="mt-5 rounded-2xl bg-zinc-950 px-4 py-3 text-zinc-100"><summary className="cursor-pointer text-xs font-black uppercase tracking-[0.16em] text-zinc-300">Raw JSON</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs leading-5">{JSON.stringify(exactDiagnostics, null, 2)}</pre></details></div></details> : null}
          </div>
          <aside className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:self-start">
            <Panel title="Destination verification"><div className="space-y-4"><Value label="Destination account" value={selected.destinationAccountId ?? "—"} mono /><Value label="Current status" value={formatStatus(selected.destinationVerificationStatus)} />{selected.destinationLastError ? <Value label="Last error" value={selected.destinationLastError} /> : null}{canApproveDestination ? <button type="button" onClick={onApproveDestinationVerification} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-900/20 transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-md active:translate-y-0 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Approve as verified</button> : null}<div className="grid gap-3"><FormDropdown label="Set status" value={destinationStatus} options={destinationStatusOptions} onChange={onDestinationStatusChange} placeholder="Select status" searchPlaceholder="Search status..." disabled={!selected.destinationAccountId || busy} /><input value={destinationReason} onChange={(event) => onDestinationReasonChange(event.target.value)} placeholder="Reason" className="w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm" disabled={!selected.destinationAccountId || busy} /><button type="button" onClick={onUpdateDestinationVerification} disabled={!selected.destinationAccountId || busy} className="rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-zinc-300/50 transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-md active:translate-y-0 disabled:opacity-50 disabled:shadow-none">Update destination</button></div></div></Panel>
            <Panel title="Seller payout access"><div className="space-y-4"><Value label="Current state" value={selected.sellerSuspended ? "Suspended" : "Active"} /><input value={sellerControlReason} onChange={(event) => onSellerControlReasonChange(event.target.value)} placeholder="Reason" className="w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm" disabled={busy} /><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => onUpdateSellerSuspension(true)} disabled={busy} className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white" >Suspend</button><button type="button" onClick={() => onUpdateSellerSuspension(false)} disabled={busy} className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 disabled:opacity-50">Unsuspend</button></div></div></Panel>
            {canRefundEscrow ? <Panel title="Escrow"><div className="space-y-4"><div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1"><Value label="Order" value={selected.orderId ?? "—"} mono /><Value label="Escrow" value={selected.escrowId ?? "—"} mono /><Value label="State" value={formatStatus(selected.escrowState)} /></div><button type="button" onClick={onOpenRefundEscrowDialog} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50"><CircleAlert className="h-4 w-4" />Record refund</button></div></Panel> : null}
            <Panel title="Adjustments"><div className="space-y-4"><div className="grid grid-cols-2 gap-4"><Value label="Gross" value={`${selected.currency} ${Number(selected.grossAmount ?? 0).toLocaleString()}`} /><Value label="Net" value={`${selected.currency} ${Number(selected.netAmount ?? selected.amount).toLocaleString()}`} /></div><button type="button" onClick={onReloadAdjustments} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700">Refresh adjustments</button><div className="grid gap-3"><FormDropdown label="Type" value={adjustmentType} options={adjustmentTypeOptions} onChange={(value) => onAdjustmentTypeChange(value as "processing_fee" | "manual_adjustment")} placeholder="Select type" searchPlaceholder="Search type..." disabled={busy} /><input value={adjustmentAmount} onChange={(event) => onAdjustmentAmountChange(event.target.value)} placeholder="Amount" className="w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm" disabled={busy} /><input value={adjustmentReason} onChange={(event) => onAdjustmentReasonChange(event.target.value)} placeholder="Reason" className="w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm" disabled={busy} /><input value={adjustmentProviderRef} onChange={(event) => onAdjustmentProviderRefChange(event.target.value)} placeholder="Provider reference (optional)" className="w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm" disabled={busy} /><button type="button" onClick={onCreateAdjustment} disabled={busy} className="rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white">Save adjustment</button></div><div className="space-y-2">{adjustmentsLoading ? <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600"><Loader2 className="h-4 w-4 animate-spin" />Loading adjustments...</div> : adjustments.length === 0 ? <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600">No adjustments recorded.</div> : adjustments.map((adjustment) => <div key={adjustment.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3"><p className="text-sm font-bold text-zinc-950">{adjustment.adjustmentType.replace(/_/g, " ")} · {adjustment.currency} {Number(adjustment.amount).toLocaleString()}</p><p className="mt-1 text-sm text-zinc-700">{adjustment.reason}</p><p className="mt-1 text-xs text-zinc-500">{toDate(adjustment.createdAt)} · {adjustment.actorType}</p></div>)}</div></div></Panel>
          </aside>
        </div>
      </main>
    </div>
  );
}
