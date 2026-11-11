import { CheckCircle2, Clock3, CircleAlert, Loader2 } from 'lucide-react';
import type { PayoutRecord } from '../types';
import { getSellerPayoutFailureMeta } from '../uiModel';

type TimelineStepState = 'done' | 'active' | 'pending' | 'warning';

type TimelineStep = {
  label: string;
  detail: string;
  state: TimelineStepState;
};

export type PayoutTimelineProps = {
  payout: PayoutRecord;
  className?: string;
};

function buildTimeline(payout: PayoutRecord): TimelineStep[] {
  const status = String(payout.status ?? '').toLowerCase();
  const failureMeta = getSellerPayoutFailureMeta(payout.lastFailureReason ?? null);
  const issueLabel = failureMeta?.label ?? payout.holdReason ?? 'Awaiting review';
  const issueDetail =
    failureMeta?.detail ??
    payout.holdReason ??
    'The payout is paused until the next action is completed.';

  const payoutSubmitted = ['queued', 'processing', 'pending', 'held', 'failed', 'paid'].includes(status);
  const payoutReleased = ['pending', 'processing', 'held', 'failed', 'paid'].includes(status);
  const payoutSettled = status === 'paid';
  const payoutBlocked = ['held', 'failed'].includes(status);

  return [
    {
      label: 'Buyer paid',
      detail: 'Customer funds were captured successfully.',
      state: 'done',
    },
    {
      label: 'Escrow created',
      detail: 'Funds were placed in escrow and are waiting for release.',
      state: payoutSubmitted ? 'done' : 'active',
    },
    {
      label: 'Order released',
      detail: payoutReleased
        ? 'The order moved from escrow into the payout flow.'
        : 'The order has not yet been released into payout processing.',
      state: payoutReleased ? 'done' : payoutSubmitted ? 'active' : 'pending',
    },
    {
      label: payoutBlocked ? issueLabel : 'Payout processing',
      detail: payoutBlocked
        ? issueDetail
        : payoutSettled
          ? 'The payout completed successfully.'
          : 'The provider is processing the transfer.',
      state: payoutSettled ? 'done' : payoutBlocked ? 'warning' : payoutSubmitted ? 'active' : 'pending',
    },
    {
      label: payoutSettled ? 'Funds received' : 'Awaiting completion',
      detail: payoutSettled
        ? 'The seller destination received the payout.'
        : 'The payout has not reached the seller yet.',
      state: payoutSettled ? 'done' : 'pending',
    },
  ];
}

function StepIcon({ state }: { state: TimelineStepState }) {
  if (state === 'done') return <CheckCircle2 className="h-4 w-4 text-bm-success" />;
  if (state === 'warning') return <CircleAlert className="h-4 w-4 text-bm-warning" />;
  if (state === 'active') return <Loader2 className="h-4 w-4 animate-spin text-bm-brand" />;
  return <Clock3 className="h-4 w-4 text-bm-text-subtle" />;
}

function StepLine({ state }: { state: TimelineStepState }) {
  const classes =
    state === 'done'
      ? 'bg-bm-success'
      : state === 'warning'
        ? 'bg-bm-warning'
        : state === 'active'
          ? 'bg-bm-brand'
          : 'bg-bm-border';

  return <div className={`h-full w-px ${classes}`} />;
}

export default function PayoutTimeline({ payout, className = '' }: PayoutTimelineProps) {
  const steps = buildTimeline(payout);
  const status = String(payout.status ?? '').toLowerCase();
  const headline =
    status === 'paid'
      ? 'Payout timeline complete'
      : status === 'held' || status === 'failed'
        ? 'Payout stopped here'
        : 'Payout in progress';

  return (
    <section className={`rounded-[1.75rem] border border-bm-border bg-bm-surface p-4 shadow-sm ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-bm-text-subtle">
            Payout timeline
          </p>
          <h4 className="mt-2 text-base font-black tracking-tight text-bm-text">
            {headline}
          </h4>
        </div>
        <div className="rounded-full bg-bm-surface-muted px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-bm-text-muted">
          {status || 'unknown'}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {steps.map((step, index) => (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bm-surface-subtle ring-1 ring-bm-border">
                <StepIcon state={step.state} />
              </div>
              {index < steps.length - 1 ? <div className="mt-1 h-full min-h-8"><StepLine state={step.state} /></div> : null}
            </div>

            <div className="min-w-0 pb-1">
              <p className="text-sm font-bold text-bm-text">{step.label}</p>
              <p className="mt-1 text-sm text-bm-text-subtle">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
