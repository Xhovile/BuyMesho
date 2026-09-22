import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, Database, FileText, Mail, Webhook } from "lucide-react";

type SystemStatus = {
  databaseConnected: boolean;
  databaseCheckedAt: string | null;
  paychanguConfigured: boolean;
  webhookSecretConfigured: boolean;
  brevoConfigured: boolean;
  cloudinaryConfigured: boolean;
  notificationEmail: string;
  environment: string;
};

type SystemSummary = {
  webhookReceived: number;
  lastWebhookAt: string | null;
  lastPaymentAt: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-MW", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function SectionCard({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <div>{eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p> : null}<h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">{title}</h2></div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function DetailField({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">{label}</p><p className={(mono ? "font-mono text-[11px] " : "text-sm ") + "mt-1 break-words font-bold text-zinc-900"}>{value}</p></div>;
}

export default function AdminSystem({ system, summary }: { system: SystemStatus; summary: SystemSummary }) {
  const integrations = [
    ["Studio database", system.databaseConnected, "Connection check completed successfully.", Database],
    ["PayChangu secret", system.paychanguConfigured, "Server-side payment credentials are configured.", CreditCard],
    ["Webhook secret", system.webhookSecretConfigured, "PayChangu webhook verification secret is present.", Webhook],
    ["Brevo email", system.brevoConfigured, "Email transport credentials are configured.", Mail],
    ["Cloudinary media", system.cloudinaryConfigured, "Reference media storage credentials are configured.", FileText],
  ] as const;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Integration status" eyebrow="Configuration signals">
        <div className="grid gap-3 sm:grid-cols-2">
          {integrations.map(([label, ready, helper, Icon]) => (
            <div key={label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-zinc-500" /><p className="text-sm font-black text-zinc-900">{label}</p></div>{ready ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}</div>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{helper}</p>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Runtime" eyebrow="Safe operational details">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailField label="Environment" value={system.environment} />
          <DetailField label="Notification recipient" value={system.notificationEmail} />
          <DetailField label="Database check" value={formatDate(system.databaseCheckedAt)} />
          <DetailField label="Latest webhook" value={formatDate(summary.lastWebhookAt)} />
          <DetailField label="Latest payment activity" value={formatDate(summary.lastPaymentAt)} />
          <DetailField label="Webhook events recorded" value={summary.webhookReceived.toLocaleString()} />
        </div>
      </SectionCard>
      <SectionCard title="Monitoring notes" eyebrow="How to use this page">
        <div className="space-y-3 text-sm leading-6 text-zinc-600">
          <p>This control room is read-only. It does not approve, refund, resend, or otherwise mutate Studio payments.</p>
          <p>Successful payment records are kept in the dedicated Xhovilé Studio PostgreSQL database rather than BuyMesho marketplace payment tables.</p>
          <p>The page refreshes automatically while visible and can also be refreshed manually.</p>
        </div>
      </SectionCard>
      <SectionCard title="Current endpoint" eyebrow="Admin API">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><p className="font-mono text-xs text-zinc-700">GET /api/admin/xhovile-studio</p><p className="mt-2 text-xs leading-5 text-zinc-500">Protected by BuyMesho authentication and backend admin authorization.</p></div>
      </SectionCard>
    </div>
  );
}
