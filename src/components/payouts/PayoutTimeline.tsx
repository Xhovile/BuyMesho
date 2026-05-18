import { CheckCircle2, Circle, Clock3, ShieldCheck, TriangleAlert } from "lucide-react";
import { getSellerPayoutLaunchStatus } from "../../modules/payouts/uiModel";
import type { PayoutRecord } from "../../modules/payouts/types";

type PayoutTimelineProps = {
  payouts: PayoutRecord[];
};

type Step = {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
  issue?: boolean;
};

function buildSteps(payouts: PayoutRecord[]): Step[] {
  const latest = payouts[0];
  const launchStatus = latest
    ? getSellerPayoutLaunchStatus({
        status: latest.status,
        destinationStatus: latest.destinationStatus,
        manualReviewPending: latest.manualReviewPending,
        retryAllowed: latest.retryAllowed,
        verificationBlockers: latest.verificationBlockers,
      })
    : "eligible";

  const statusOrder = ["eligible", "queued_for_admin_review", "sent_to_paychangu", "provider_pending", "paid"];
  const activeIndex = statusOrder.indexOf(launchStatus);
  const failureState = ["held", "needs_destination_update", "cancelled"].includes(launchStatus);

  return [
    {
      key: "eligible",
      label: "Eligible / queued",
      done: activeIndex > 0 || failureState,
      active: activeIndex === 0 && !failureState,
    },
    {
      key: "admin_review",
      label: "Admin review",
      done: activeIndex > 1 || failureState,
      active: activeIndex === 1 && !failureState,
    },
    {
      key: "provider",
      label: "Sent to provider",
      done: activeIndex > 2 || failureState,
      active: activeIndex === 2 && !failureState,
    },
    {
      key: "pending",
      label: "Provider pending",
      done: activeIndex > 3 || failureState,
      active: activeIndex === 3 && !failureState,
    },
    {
      key: "result",
      label: failureState ? "Paid or failed" : "Paid",
      done: launchStatus === "paid",
      active: failureState || activeIndex === 4,
      issue: failureState,
    },
  ];
}

export default function PayoutTimeline({ payouts }: PayoutTimelineProps) {
  const steps = buildSteps(payouts);

  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Payout timeline</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step) => (
          <div
            key={step.key}
            className={`rounded-2xl border px-3 py-3 text-sm ${
              step.issue
                ? "border-red-200 bg-red-50 text-red-700"
                : step.active
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : step.done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-zinc-200 bg-white text-zinc-600"
            }`}
          >
            <div className="flex items-center gap-2">
              {step.issue ? (
                <TriangleAlert className="h-4 w-4" />
              ) : step.done ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : step.active ? (
                <Clock3 className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              <span className="font-bold">{step.label}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-zinc-500">
        <ShieldCheck className="h-4 w-4" />
        During launch, payouts are automatically queued after escrow release.
      </p>
    </div>
  );
}

