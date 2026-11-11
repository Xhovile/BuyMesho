import type { ReactNode } from "react";
import { formatMoney } from "../config";
import type { AdminCustomer, AdminProject } from "./types";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-MW", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function AdminStatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const classes =
    normalized === "paid" || normalized === "processed" || normalized === "sent"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "pending" || normalized === "received" || normalized === "sending"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : normalized === "failed" || normalized === "refunded"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-bm-border bg-bm-surface-muted text-bm-text-muted";

  return (
    <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] " + classes}>
      {value}
    </span>
  );
}

function AdminDetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-bm-border bg-bm-surface-subtle px-3.5 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bm-text-subtle">{label}</p>
      <p className={(mono ? "font-mono text-[11px] " : "text-sm ") + "mt-1 break-words font-bold text-bm-text"}>{value}</p>
    </div>
  );
}

function SectionCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-bm-border bg-white p-5 shadow-sm">
      <div>
        {eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.2em] text-bm-text-subtle">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl font-black tracking-tight text-bm-text">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-bm-border bg-bm-surface-subtle px-5 py-10 text-center text-sm text-bm-text-subtle">{label}</div>;
}

export default function AdminCustomersProjects({
  customers,
  projects,
}: {
  customers: AdminCustomer[];
  projects: AdminProject[];
}) {
  return (
    <div className="space-y-6">
      <SectionCard title="Customers" eyebrow="Customer activity">
        <p className="mb-4 text-[11px] text-bm-text-subtle">
          Showing the latest 250 customer groups. Summary totals cover the full Studio database.
        </p>
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
              {customers.length ? (
                customers.map((customer) => (
                  <tr key={customer.customerPhone} className="text-sm">
                    <td className="px-4 py-3 font-black text-bm-text">{customer.customerName}</td>
                    <td className="px-4 py-3 text-bm-text-muted">
                      <p>{customer.customerPhone}</p>
                      <p className="mt-0.5 text-xs text-bm-text-subtle">{customer.customerEmail || "No email"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {customer.paymentCount} <span className="text-xs text-bm-text-subtle">({customer.paidCount} paid)</span>
                    </td>
                    <td className="px-4 py-3">{customer.projectCount}</td>
                    <td className="px-4 py-3 font-black">{formatMoney(customer.paidAmount)}</td>
                    <td className="px-4 py-3 text-xs text-bm-text-subtle">{formatDate(customer.lastActivityAt)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6}><EmptyState label="No customers have been recorded yet." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Projects" eyebrow="Project references">
        <p className="mb-4 text-[11px] text-bm-text-subtle">
          Showing the latest 250 project groups. Summary totals cover the full Studio database.
        </p>
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
              {projects.length ? (
                projects.map((project) => (
                  <tr key={project.projectReference + "-" + project.customerPhone} className="text-sm">
                    <td className="px-4 py-3 font-mono text-xs font-black text-bm-text">{project.projectReference}</td>
                    <td className="px-4 py-3">
                      <p className="font-black text-bm-text">{project.customerName}</p>
                      <p className="mt-0.5 text-xs text-bm-text-subtle">{project.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3">{project.paymentCount}</td>
                    <td className="px-4 py-3 font-black">{formatMoney(project.paidAmount)}</td>
                    <td className="px-4 py-3"><AdminStatusPill value={project.latestStatus} /></td>
                    <td className="px-4 py-3 text-xs text-bm-text-subtle">{formatDate(project.lastActivityAt)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6}><EmptyState label="No project references have been recorded yet." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
