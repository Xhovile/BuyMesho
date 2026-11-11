import { type ReactNode } from "react";
import { Wallet } from "lucide-react";
import PayoutStatusBadge from "../../../components/payouts/PayoutStatusBadge";
import {
  getSellerPayoutStatusDetail,
  getSellerPayoutStatusLabel,
  sellerOperationalSignals,
} from "../../../modules/payouts/uiModel";
import type { PayoutRecord } from "../../../modules/payouts/types";
import { formatDate, money, payoutFeeNote, payoutMathBreakdown } from "../sellerPayouts.helpers";

function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-bm-text-subtle dark:text-bm-text-subtle">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
      </div>
      {action ? action : null}
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={5} className="px-4 py-6 text-bm-text-subtle dark:text-bm-text-subtle">
        {message}
      </td>
    </tr>
  );
}

export default function SellerPayoutsHistorySection({
  payouts,
  canViewHistory,
}: {
  payouts: PayoutRecord[];
  canViewHistory: boolean;
}) {
  const content = !canViewHistory ? (
    <EmptyRow message="You do not have permission to view payout history." />
  ) : payouts.length === 0 ? (
    <EmptyRow message="No payout activity yet." />
  ) : (
    payouts.map((payout) => {
      const operationalSignals = sellerOperationalSignals({
        status: payout.status,
        destinationStatus: payout.destinationStatus,
        retryAllowed: payout.retryAllowed,
        manualReviewPending: payout.manualReviewPending,
        verificationBlockers: payout.verificationBlockers,
      });

      const payoutMath = payoutMathBreakdown(payout);

      return (
        <tr key={payout.id} className="align-top">
          <td className="px-4 py-4">
            <div className="space-y-2">
              <PayoutStatusBadge status={payout.status} />
              <div className="text-xs font-semibold text-bm-text-muted dark:text-bm-text-muted">
                {getSellerPayoutStatusLabel(payout.status)}
              </div>
              {payout.status === "held" ? (
                <div className="rounded-xl border border-bm-warning/35 bg-bm-warning-bg px-3 py-2 text-xs font-semibold text-bm-warning">
                  <div>Payout paused for review</div>
                  <div>Seller is waiting on the next action</div>
                </div>
              ) : null}
            </div>
          </td>

          <td className="px-4 py-4 text-bm-text-muted dark:text-bm-text-muted">
            <div className="font-bold text-bm-text dark:text-bm-text">
              {money(payoutMath.sellerReceivesAmount, payoutMath.currency)}
            </div>

            {payoutMath.hasFormula ? (
              <div className="mt-2 space-y-1 rounded-xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-2.5 py-2 text-[11px] font-semibold text-bm-text-subtle dark:text-bm-text-subtle">
                <div className="flex justify-between gap-3">
                  <span>Item sold total</span>
                  <span>{money(payoutMath.grossAmount, payoutMath.currency)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>BuyMesho commission (3%)</span>
                  <span>-{money(payoutMath.platformFeeAmount, payoutMath.currency)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>PayChangu payout fee</span>
                  <span>-{money(payoutMath.payChanguFeeAmount, payoutMath.currency)}</span>
                </div>
                {payoutMath.reserveAmount > 0 ? (
                  <div className="flex justify-between gap-3">
                    <span>Reserve</span>
                    <span>-{money(payoutMath.reserveAmount, payoutMath.currency)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3 border-t border-bm-border dark:border-bm-border pt-1 font-bold text-bm-text-muted dark:text-bm-text-muted">
                  <span>Total you will receive</span>
                  <span>{money(payoutMath.sellerReceivesAmount, payoutMath.currency)}</span>
                </div>
                <div className="rounded-lg bg-bm-surface px-2 py-1 text-[10px] leading-4 text-bm-text-muted dark:text-bm-text-muted">
                  {payoutFeeNote(payout)}
                </div>
              </div>
            ) : null}
          </td>

          <td className="px-4 py-4 text-bm-text-muted dark:text-bm-text-muted">{payout.orderId || payout.escrowId || "—"}</td>

          <td className="px-4 py-4 text-bm-text-muted dark:text-bm-text-muted">
            <div className="space-y-1">
              {operationalSignals.length === 0 ? (
                <span>—</span>
              ) : (
                operationalSignals.map((message) => (
                  <div
                    key={`${payout.id}-${message}`}
                    className="rounded-xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-2.5 py-1 text-xs font-semibold"
                  >
                    {message}
                  </div>
                ))
              )}
              <div className="rounded-xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-2.5 py-1 text-xs font-semibold">
                {getSellerPayoutStatusDetail(payout.status)}
              </div>
            </div>
          </td>

          <td className="px-4 py-4 text-bm-text-subtle dark:text-bm-text-subtle">{formatDate(payout.updatedAt)}</td>
        </tr>
      );
    })
  );

  return (
    <section className="rounded-[28px] border border-bm-border bg-bm-surface p-6 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
      <SectionTitle
        eyebrow="Payout history"
        title="Release, paid, failed."
        action={<Wallet className="h-5 w-5 text-bm-text-subtle dark:text-bm-text-subtle" />}
      />

      <div className="mt-5 overflow-x-auto rounded-2xl border border-bm-border dark:border-bm-border">
        <div className="max-h-[520px] min-w-[760px] overflow-auto">
          <table className="w-full divide-y divide-bm-border dark:divide-bm-border text-left text-sm">
            <thead className="sticky top-0 bg-bm-surface-muted dark:bg-bm-surface-subtle text-bm-text-subtle dark:text-bm-text-subtle">
              <tr>
                <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">Status</th>
                <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">Amount</th>
                <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">Order</th>
                <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">
                  Operational view
                </th>
                <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bm-border-subtle dark:divide-bm-border-subtle bg-bm-surface">{content}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
