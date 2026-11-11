import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Database,
  FileText,
  FolderKanban,
  Mail,
  Search,
  Webhook,
  Users,
  XCircle,
} from "lucide-react";
import {
  SERVICE_LABELS,
  formatMoney,
  type PaymentStatus,
  type StudioAdminPayment,
} from "../config";
import type { LucideIcon } from "lucide-react";
import {
  DetailField,
  EmptyState,
  PaymentRow,
  SectionCard,
  StatCard,
  StatusPill,
  formatDate,
} from "./AdminUi";
import type { AdminSnapshot, ViewKey } from "./types";

export interface AdminWorkspaceViewsProps {
  view: ViewKey;
  snapshot: AdminSnapshot;
  summary?: AdminSnapshot["summary"];
  system?: AdminSnapshot["system"];
  filteredPayments: StudioAdminPayment[];
  paymentQuery: string;
  setPaymentQuery: (value: string) => void;
  paymentStatusFilter: "all" | PaymentStatus;
  setPaymentStatusFilter: (value: "all" | PaymentStatus) => void;
  selectedPayment: StudioAdminPayment | null;
  setSelectedPayment: (payment: StudioAdminPayment | null) => void;
  selectView: (view: ViewKey) => void;
}

export default function AdminWorkspaceViews({
  view,
  snapshot,
  summary,
  system,
  filteredPayments,
  paymentQuery,
  setPaymentQuery,
  paymentStatusFilter,
  setPaymentStatusFilter,
  selectedPayment,
  setSelectedPayment,
  selectView,
}: AdminWorkspaceViewsProps) {
  return (
    <>
        {view === "overview" && summary ? (
          <>
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard icon={CircleDollarSign} label="Paid revenue" value={formatMoney(summary.paidRevenue)} helper="Confirmed Studio payments" />
              <StatCard icon={CheckCircle2} label="Paid payments" value={summary.paidPayments.toLocaleString()} helper={summary.todayPaidPayments.toLocaleString() + " paid today"} />
              <StatCard icon={Clock3} label="Pending" value={summary.pendingPayments.toLocaleString()} helper="Still awaiting confirmation" />
              <StatCard icon={XCircle} label="Failed" value={summary.failedPayments.toLocaleString()} helper="Failed or declined checkouts" />
              <StatCard icon={CreditCard} label="Refunded" value={summary.refundedPayments.toLocaleString()} helper="Recorded refunded payments" />
              <StatCard icon={Users} label="Customers" value={summary.customerCount.toLocaleString()} helper="Unique phone numbers" />
              <StatCard icon={FolderKanban} label="Projects" value={summary.projectCount.toLocaleString()} helper="Referenced Studio projects" />
              <StatCard icon={Bell} label="Email issues" value={(summary.notificationPending + summary.notificationFailed).toLocaleString()} helper={summary.notificationFailed.toLocaleString() + " failed delivery records"} />
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
              <SectionCard title="Recent payments" eyebrow="Live activity" action={<span className="text-[10px] font-black uppercase tracking-[0.16em] text-bm-text-subtle">Latest 250 records</span>}>
                {snapshot?.payments.length ? (
                  <div className="overflow-hidden rounded-2xl border border-bm-border">
                    <div className="hidden grid-cols-[minmax(150px,1.15fr)_minmax(140px,1fr)_auto_auto] gap-4 bg-bm-surface-subtle px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle sm:grid sm:grid-cols-[minmax(170px,1.1fr)_minmax(200px,1fr)_auto_auto]">
                      <span>Customer</span>
                      <span>Service / Project</span>
                      <span className="text-right">Amount / Time</span>
                      <span className="text-right">Status</span>
                    </div>
                    {snapshot.payments.slice(0, 10).map((payment) => (
                      <PaymentRow key={payment.id} payment={payment} onSelect={() => setSelectedPayment(payment)} />
                    ))}
                  </div>
                ) : (
                  <EmptyState label="No Studio payments have been recorded yet." />
                )}
              </SectionCard>

              <SectionCard title="Attention" eyebrow="Operational signals">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-bm-warning/25 bg-bm-warning-bg p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-warning">Pending payments</p>
                    <p className="mt-1 text-2xl font-black text-bm-warning">{summary.pendingPayments}</p>
                    <p className="mt-1 text-xs leading-5 text-bm-warning">Payments that have not yet reached a confirmed paid state.</p>
                  </div>
                  <div className="rounded-2xl border border-bm-danger/25 bg-bm-danger-bg p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-danger">Failed notifications</p>
                    <p className="mt-1 text-2xl font-black text-bm-danger">{summary.notificationFailed}</p>
                    <p className="mt-1 text-xs leading-5 text-bm-danger">Successful payments whose internal notification email needs attention.</p>
                  </div>
                  <div className="rounded-2xl border border-bm-border bg-bm-surface-subtle p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">Webhook failures</p>
                    <p className="mt-1 text-2xl font-black text-bm-text">{summary.webhookFailed}</p>
                    <p className="mt-1 text-xs leading-5 text-bm-text-muted">PayChangu webhook events recorded as failed.</p>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Today" eyebrow="Confirmed payment activity">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-bm-border bg-bm-surface-subtle p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">Paid today</p>
                  <p className="mt-2 text-2xl font-black text-bm-text">{summary.todayPaidPayments}</p>
                </div>
                <div className="rounded-2xl border border-bm-border bg-bm-surface-subtle p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">Revenue today</p>
                  <p className="mt-2 text-2xl font-black text-bm-text">{formatMoney(summary.todayPaidRevenue)}</p>
                </div>
                <div className="rounded-2xl border border-bm-border bg-bm-surface-subtle p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">Last payment activity</p>
                  <p className="mt-2 text-sm font-black text-bm-text">{formatDate(summary.lastPaymentAt)}</p>
                </div>
              </div>
            </SectionCard>
          </>
        ) : null}

        {view === "payments" && snapshot ? (
          <div className="space-y-6">
            <SectionCard title="Payments" eyebrow="Studio payment ledger">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bm-text-subtle" />
                  <input
                    value={paymentQuery}
                    onChange={(event) => setPaymentQuery(event.target.value)}
                    className="w-full rounded-2xl border border-bm-border bg-bm-surface py-3 pl-10 pr-4 text-sm text-bm-text outline-none focus:border-bm-focus"
                    placeholder="Search customer, phone, email, reference, or description"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["all", "paid", "pending", "failed", "refunded"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setPaymentStatusFilter(status)}
                      className={
                        "rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-[0.12em] " +
                        (paymentStatusFilter === status
                          ? "bg-bm-brand text-bm-on-brand"
                          : "border border-bm-border bg-bm-surface text-bm-text-muted hover:bg-bm-surface-subtle")
                      }
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-bm-border">
                {filteredPayments.length ? (
                  filteredPayments.map((payment) => (
                    <PaymentRow key={payment.id} payment={payment} onSelect={() => setSelectedPayment(payment)} />
                  ))
                ) : (
                  <EmptyState label="No payments match the current filters." />
                )}
              </div>
              <p className="mt-3 text-[11px] text-bm-text-subtle">Showing up to the latest 250 records from the Studio database.</p>
            </SectionCard>

            {selectedPayment ? (
              <SectionCard
                title="Payment details"
                eyebrow="Selected record"
                action={
                  <button
                    type="button"
                    onClick={() => setSelectedPayment(null)}
                    className="rounded-2xl border border-bm-border bg-bm-surface px-3 py-2 text-xs font-black text-bm-text-muted hover:bg-bm-surface-subtle"
                  >
                    Close
                  </button>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailField label="Customer" value={selectedPayment.customerName} />
                  <DetailField label="Phone" value={selectedPayment.customerPhone} />
                  <DetailField label="Email" value={selectedPayment.customerEmail || "Not provided"} />
                  <DetailField label="Status" value={<StatusPill value={selectedPayment.status} />} />
                  <DetailField label="Service" value={SERVICE_LABELS[selectedPayment.serviceType]} />
                  <DetailField label="Payment mode" value={selectedPayment.paymentMode || "—"} />
                  <DetailField label="Amount" value={formatMoney(selectedPayment.amount, selectedPayment.currency)} />
                  <DetailField label="Project total" value={selectedPayment.projectTotal === null ? "—" : formatMoney(selectedPayment.projectTotal, selectedPayment.currency)} />
                  <DetailField label="Project reference" value={selectedPayment.projectReference || "—"} mono />
                  <DetailField label="Studio reference" value={selectedPayment.paymentReference || "—"} mono />
                  <DetailField label="PayChangu reference" value={selectedPayment.providerReference || "—"} mono />
                  <DetailField label="Created" value={formatDate(selectedPayment.createdAt)} />
                  <DetailField label="Paid at" value={formatDate(selectedPayment.paidAt)} />
                  <DetailField label="Email notification" value={<StatusPill value={selectedPayment.successNotificationStatus} />} />
                </div>

                <div className="mt-3 rounded-2xl border border-bm-border bg-bm-surface-subtle p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">Customer brief</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-bm-text-muted">{selectedPayment.description}</p>
                </div>

                {selectedPayment.referenceMedia.length ? (
                  <div className="mt-3 rounded-2xl border border-bm-border bg-bm-surface-subtle p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">References</p>
                    <p className="mt-1 text-xs text-bm-text-subtle">{selectedPayment.referenceMedia.length} file{selectedPayment.referenceMedia.length === 1 ? "" : "s"} attached by the customer.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {selectedPayment.referenceMedia.map((media, index) => (
                        <a
                          key={`${media.url}-${index}`}
                          href={media.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group overflow-hidden rounded-xl border border-bm-border bg-bm-surface"
                        >
                          {media.kind === "image" ? (
                            <img
                              src={media.url}
                              alt={media.originalName || `Reference ${index + 1}`}
                              className="aspect-square w-full object-cover transition group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                          ) : (
                            <video src={media.url} controls preload="metadata" className="aspect-square w-full bg-black object-cover" />
                          )}
                          <div className="border-t border-bm-border-subtle px-2.5 py-2">
                            <p className="truncate text-[10px] font-bold text-bm-text">{media.originalName}</p>
                            <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-bm-text-subtle">{media.kind}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedPayment.successNotificationError ? (
                  <div className="mt-3 rounded-2xl border border-bm-danger/25 bg-bm-danger-bg p-4 text-sm text-bm-danger">
                    <p className="font-black">Notification error</p>
                    <p className="mt-1 whitespace-pre-wrap">{selectedPayment.successNotificationError}</p>
                  </div>
                ) : null}
              </SectionCard>
            ) : null}
          </div>
        ) : null}

        {view === "customers" && snapshot ? (
          <SectionCard title="Customers" eyebrow="Customer activity">
            <div className="overflow-x-auto rounded-2xl border border-bm-border">
              <table className="min-w-full text-left">
                <thead className="bg-bm-surface-subtle">
                  <tr className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Payments</th>
                    <th className="px-4 py-3">Projects</th>
                    <th className="px-4 py-3">Paid amount</th>
                    <th className="px-4 py-3">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bm-border-subtle">
                  {snapshot.customers.length ? snapshot.customers.map((customer) => (
                    <tr key={customer.customerPhone} className="text-sm">
                      <td className="px-4 py-3 font-black text-bm-text">{customer.customerName}</td>
                      <td className="px-4 py-3 text-bm-text-muted">
                        <p>{customer.customerPhone}</p>
                        <p className="mt-0.5 text-xs text-bm-text-subtle">{customer.customerEmail || "No email"}</p>
                      </td>
                      <td className="px-4 py-3">{customer.paymentCount} <span className="text-xs text-bm-text-subtle">({customer.paidCount} paid)</span></td>
                      <td className="px-4 py-3">{customer.projectCount}</td>
                      <td className="px-4 py-3 font-black">{formatMoney(customer.paidAmount)}</td>
                      <td className="px-4 py-3 text-xs text-bm-text-subtle">{formatDate(customer.lastActivityAt)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6}><EmptyState label="No customers have been recorded yet." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        ) : null}

        {view === "projects" && snapshot ? (
          <SectionCard title="Projects" eyebrow="Project references">
            <div className="overflow-x-auto rounded-2xl border border-bm-border">
              <table className="min-w-full text-left">
                <thead className="bg-bm-surface-subtle">
                  <tr className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Payments</th>
                    <th className="px-4 py-3">Paid amount</th>
                    <th className="px-4 py-3">Latest status</th>
                    <th className="px-4 py-3">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bm-border-subtle">
                  {snapshot.projects.length ? snapshot.projects.map((project) => (
                    <tr key={`${project.projectReference}-${project.customerPhone}`} className="text-sm">
                      <td className="px-4 py-3 font-mono text-xs font-black text-bm-text">{project.projectReference}</td>
                      <td className="px-4 py-3">
                        <p className="font-black text-bm-text">{project.customerName}</p>
                        <p className="mt-0.5 text-xs text-bm-text-subtle">{project.customerPhone}</p>
                      </td>
                      <td className="px-4 py-3">{project.paymentCount}</td>
                      <td className="px-4 py-3 font-black">{formatMoney(project.paidAmount)}</td>
                      <td className="px-4 py-3"><StatusPill value={project.latestStatus} /></td>
                      <td className="px-4 py-3 text-xs text-bm-text-subtle">{formatDate(project.lastActivityAt)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6}><EmptyState label="No project references have been recorded yet." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        ) : null}

        {view === "notifications" && snapshot ? (
          <SectionCard title="Notifications" eyebrow="Internal payment email delivery" action={<span className="text-xs text-bm-text-subtle">Recipient: {system?.notificationEmail}</span>}>
            {snapshot.notifications.length ? (
              <div className="overflow-hidden rounded-2xl border border-bm-border">
                {snapshot.notifications.map((payment) => (
                  <button
                    key={payment.id}
                    type="button"
                    onClick={() => {
                      setSelectedPayment(payment);
                      selectView("payments");
                    }}
                    className="grid w-full gap-3 border-b border-bm-border-subtle px-4 py-3 text-left last:border-b-0 hover:bg-bm-surface-subtle sm:grid-cols-[minmax(180px,1fr)_auto_minmax(150px,0.8fr)] sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-black text-bm-text">{payment.customerName}</p>
                      <p className="mt-0.5 text-xs text-bm-text-subtle">{payment.paymentReference || payment.id}</p>
                    </div>
                    <StatusPill value={payment.successNotificationStatus} />
                    <div className="text-xs text-bm-text-subtle">
                      <p>{formatDate(payment.updatedAt)}</p>
                      {payment.successNotificationError ? <p className="mt-1 truncate text-bm-danger">{payment.successNotificationError}</p> : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-bm-success/25 bg-bm-success-bg p-5">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="h-5 w-5 text-bm-success" />
                  <div>
                    <p className="font-black text-bm-success">No notification issues in the latest records.</p>
                    <p className="mt-1 text-sm text-bm-success">Successful Studio payments with unsent, sending, or failed internal notifications would appear here.</p>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        ) : null}

        {view === "webhooks" && snapshot ? (
          <SectionCard title="Webhooks" eyebrow="PayChangu event audit">
            <div className="overflow-x-auto rounded-2xl border border-bm-border">
              <table className="min-w-full text-left">
                <thead className="bg-bm-surface-subtle">
                  <tr className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Payment reference</th>
                    <th className="px-4 py-3">Signature</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bm-border-subtle">
                  {snapshot.webhooks.length ? snapshot.webhooks.map((webhook) => (
                    <tr key={webhook.id} className="text-xs">
                      <td className="px-4 py-3">
                        <p className="font-black text-bm-text">{webhook.eventType || "Unknown event"}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-bm-text-subtle">{webhook.providerEventId || "No provider event id"}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-bm-text-muted">{webhook.paymentReference || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusPill value={webhook.signatureValid ? "valid" : "invalid"} />
                      </td>
                      <td className="px-4 py-3"><StatusPill value={webhook.status} /></td>
                      <td className="px-4 py-3 text-bm-text-subtle">{formatDate(webhook.createdAt)}</td>
                      <td className="max-w-xs px-4 py-3 text-bm-danger">{webhook.error || "—"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6}><EmptyState label="No Studio webhook events have been recorded yet." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        ) : null}

        {view === "system" && system ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Integration status" eyebrow="Configuration signals">
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ["Studio database", system.databaseConnected, "Connection check completed successfully.", Database],
                  ["PayChangu secret", system.paychanguConfigured, "Server-side payment credentials are configured.", CreditCard],
                  ["Webhook secret", system.webhookSecretConfigured, "PayChangu webhook verification secret is present.", Webhook],
                  ["Brevo email", system.brevoConfigured, "Email transport credentials are configured.", Mail],
                  ["Cloudinary media", system.cloudinaryConfigured, "Reference media storage credentials are configured.", FileText],
                ] as Array<[string, boolean, string, LucideIcon]>).map(([label, ready, helper, Icon]) => (
                  <div key={String(label)} className="rounded-2xl border border-bm-border bg-bm-surface-subtle p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-bm-text-subtle" />
                        <p className="text-sm font-black text-bm-text">{String(label)}</p>
                      </div>
                      {Boolean(ready) ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-bm-text-subtle">{String(helper)}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Runtime" eyebrow="Safe operational details">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailField label="Environment" value={system.environment} />
                <DetailField label="Notification recipient" value={system.notificationEmail} />
                <DetailField label="Database check" value={formatDate(system.databaseCheckedAt)} />
                <DetailField label="Latest webhook" value={formatDate(summary?.lastWebhookAt)} />
                <DetailField label="Latest payment activity" value={formatDate(summary?.lastPaymentAt)} />
                <DetailField label="Webhook events recorded" value={summary?.webhookReceived.toLocaleString() ?? "0"} />
              </div>
            </SectionCard>

            <SectionCard title="Monitoring notes" eyebrow="How to use this page">
              <div className="space-y-3 text-sm leading-6 text-bm-text-muted">
                <p>This control room is read-only. It does not approve, refund, resend, or otherwise mutate Studio payments.</p>
                <p>Successful payment records are kept in the dedicated Xhovilé Studio PostgreSQL database rather than BuyMesho marketplace payment tables.</p>
                <p>The page refreshes automatically while visible and can also be refreshed manually.</p>
              </div>
            </SectionCard>

            <SectionCard title="Current endpoint" eyebrow="Admin API">
              <div className="rounded-2xl border border-bm-border bg-bm-surface-subtle p-4">
                <p className="font-mono text-xs text-bm-text-muted">GET /api/admin/xhovile-studio</p>
                <p className="mt-2 text-xs leading-5 text-bm-text-subtle">Protected by BuyMesho authentication and backend admin authorization.</p>
              </div>
            </SectionCard>
          </div>
        ) : null}

    </>
  );
}
