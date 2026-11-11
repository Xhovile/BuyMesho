type PayoutStatusBadgeKind = "payout" | "destination" | "destination_state";

type PayoutStatusBadgeProps = {
  status: string | boolean;
  kind?: PayoutStatusBadgeKind;
  className?: string;
};

const PAYOUT_STATUS_META: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "border-bm-success/25 bg-bm-success-bg text-bm-success" },
  failed: { label: "Failed", className: "border-bm-danger/25 bg-bm-danger-bg text-bm-danger" },
  cancelled: { label: "Cancelled", className: "border-bm-border bg-bm-surface-muted text-bm-text-muted" },
  eligible: { label: "Eligible", className: "border-bm-warning/25 bg-bm-warning-bg text-bm-warning" },
  queued: { label: "Queued for review", className: "border-bm-warning/25 bg-bm-warning-bg text-bm-warning" },
  processing: { label: "Sent to provider", className: "border-bm-warning/25 bg-bm-warning-bg text-bm-warning" },
  pending: { label: "Provider pending", className: "border-bm-warning/25 bg-bm-warning-bg text-bm-warning" },
  held: { label: "Held for review", className: "border-bm-warning/25 bg-bm-warning-bg text-bm-warning" },
};

const DESTINATION_STATUS_META: Record<string, { label: string; className: string }> = {
  verified: { label: "Verified", className: "border-bm-success/25 bg-bm-success-bg text-bm-success" },
  pending: { label: "Pending", className: "border-bm-warning/25 bg-bm-warning-bg text-bm-warning" },
  failed: { label: "Failed", className: "border-bm-danger/25 bg-bm-danger-bg text-bm-danger" },
  unverified: { label: "Unverified", className: "border-bm-border bg-bm-surface-muted text-bm-text-muted" },
};

const DESTINATION_STATE_META: Record<string, { label: string; className: string }> = {
  default: { label: "Default", className: "border-sky-200 bg-sky-50 text-sky-700" },
  active: { label: "Active", className: "border-bm-success/25 bg-bm-success-bg text-bm-success" },
  inactive: { label: "Inactive", className: "border-bm-border bg-bm-surface-muted text-bm-text-muted" },
};

function toTitleLabel(status: string) {
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getPayoutStatusBadgeMeta(status: string | boolean, kind: PayoutStatusBadgeKind = "payout") {
  const normalized = typeof status === "boolean" ? (status ? "active" : "inactive") : status.toLowerCase();
  const dictionary = kind === "destination" ? DESTINATION_STATUS_META : kind === "destination_state" ? DESTINATION_STATE_META : PAYOUT_STATUS_META;
  return dictionary[normalized] ?? {
    label: typeof status === "boolean" ? (status ? "Active" : "Inactive") : toTitleLabel(status),
    className: "border-bm-border bg-bm-surface-muted text-bm-text-muted",
  };
}

export default function PayoutStatusBadge({ status, kind = "payout", className = "" }: PayoutStatusBadgeProps) {
  const meta = getPayoutStatusBadgeMeta(status, kind);

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] ${meta.className} ${className}`}>
      {meta.label}
    </span>
  );
}
