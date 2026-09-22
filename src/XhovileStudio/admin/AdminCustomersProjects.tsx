import type { ReactNode } from "react";
import { formatMoney, type PaymentStatus } from "../config";

export type AdminCustomer = {
  customerPhone: string;
  customerName: string;
  customerEmail: string | null;
  paymentCount: number;
  paidCount: number;
  paidAmount: number;
  projectCount: number;
  lastActivityAt: string;
};

export type AdminProject = {
  projectReference: string;
  customerName: string;
  customerPhone: string;
  paymentCount: number;
  paidAmount: number;
  lastActivityAt: string;
  latestStatus: PaymentStatus;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-MW", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function AdminStatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const classes =
    normalized === "paid" || normalized === "processed" || normalized === "sent"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "pending" || normalized === "received" || normalized === "sending"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : normalized === "failed" || normalized === "refunded"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-zinc-200 bg-zinc-100 text-zinc-700";

  return (
    <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] " + classes}>
      {value}
    </span>
  );
}

export function AdminDetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className={(mono ? "font-mono text-[11px] " : "text-sm ") + "mt-1 break-words font-bold text-zinc-900"}>{value}</p>
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
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        {eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-10 text-center text-sm text-zinc-500">{label}</div>;
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
        <div className="overflow-x-auto rounded-2xl border border-zinc-200">
          <table className="min-w-full text-left">
            <thead className="bg-zinc-50">
              <tr className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Payments</th>
                <th className="px-4 py-3">Projects</th>
                <th className="px-4 py-3">Paid amount</th>
                <th className="px-4 py-3">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {customers.length ? (
                customers.map((customer) => (
                  <tr key={customer.customerPhone} className="text-sm">
                    <td className="px-4 py-3 font-black text-zinc-900">{customer.customerName}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      <p>{customer.customerPhone}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{customer.customerEmail || "No email"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {customer.paymentCount} <span className="text-xs text-zinc-400">({customer.paidCount} paid)</span>
                    </td>
                    <td className="px-4 py-3">{customer.projectCount}</td>
                    <td className="px-4 py-3 font-black">{formatMoney(customer.paidAmount)}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(customer.lastActivityAt)}</td>
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
        <div className="overflow-x-auto rounded-2xl border border-zinc-200">
          <table className="min-w-full text-left">
            <thead className="bg-zinc-50">
              <tr className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Payments</th>
                <th className="px-4 py-3">Paid amount</th>
                <th className="px-4 py-3">Latest status</th>
                <th className="px-4 py-3">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {projects.length ? (
                projects.map((project) => (
                  <tr key={project.projectReference + "-" + project.customerPhone} className="text-sm">
                    <td className="px-4 py-3 font-mono text-xs font-black text-zinc-900">{project.projectReference}</td>
                    <td className="px-4 py-3">
                      <p className="font-black text-zinc-900">{project.customerName}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{project.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3">{project.paymentCount}</td>
                    <td className="px-4 py-3 font-black">{formatMoney(project.paidAmount)}</td>
                    <td className="px-4 py-3"><AdminStatusPill value={project.latestStatus} /></td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(project.lastActivityAt)}</td>
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
