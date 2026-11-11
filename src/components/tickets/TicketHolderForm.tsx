import { useEffect, useState, type FormEvent } from "react";
import { Mail, Phone, UserRound, X } from "lucide-react";

export type TicketHolderInformation = { fullName: string; email: string; phone: string };
type TicketHolderFormProps = { initialValue?: Partial<TicketHolderInformation>; onSubmit: (value: TicketHolderInformation) => void; onCancel?: () => void; submitting?: boolean };

export default function TicketHolderForm({ initialValue, onSubmit, onCancel, submitting = false }: TicketHolderFormProps) {
  const [fullName, setFullName] = useState(initialValue?.fullName ?? "");
  const [email, setEmail] = useState(initialValue?.email ?? "");
  const [phone, setPhone] = useState(initialValue?.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setFullName(initialValue?.fullName ?? ""); setEmail(initialValue?.email ?? ""); setPhone(initialValue?.phone ?? ""); }, [initialValue?.fullName, initialValue?.email, initialValue?.phone]);
  const submit = (event: FormEvent) => { event.preventDefault(); const clean = { fullName: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim() }; if (clean.fullName.length < 2) return setError("Enter the ticket holder's full name."); if (!/^\S+@\S+\.\S+$/.test(clean.email)) return setError("Enter a valid email address."); if (clean.phone.length < 7) return setError("Enter a valid phone number."); setError(null); onSubmit(clean); };
  return <form onSubmit={submit} className="space-y-4">
    <div><p className="text-xs font-black uppercase tracking-[0.18em] text-bm-text-subtle">Ticket holder</p><h2 className="mt-1 text-xl font-black tracking-tight text-bm-text">Who is this ticket for?</h2><p className="mt-1.5 text-xs leading-5 text-bm-text-subtle">These details will be attached to the ticket and used on your ticket, PDF and event validation.</p></div>
    <label className="block"><span className="mb-1.5 block text-xs font-bold text-bm-text-muted">Full name</span><div className="relative"><UserRound className="absolute left-3 top-3 h-4 w-4 text-bm-text-subtle" /><input required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" className="min-h-11 w-full rounded-xl border border-bm-border bg-bm-surface pl-10 pr-3 text-sm text-bm-text outline-none focus:border-bm-focus focus:ring-2 focus:ring-bm-focus" /></div></label>
    <label className="block"><span className="mb-1.5 block text-xs font-bold text-bm-text-muted">Email address</span><div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-bm-text-subtle" /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="min-h-11 w-full rounded-xl border border-bm-border bg-bm-surface pl-10 pr-3 text-sm text-bm-text outline-none focus:border-bm-focus focus:ring-2 focus:ring-bm-focus" /></div></label>
    <label className="block"><span className="mb-1.5 block text-xs font-bold text-bm-text-muted">Phone number</span><div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-bm-text-subtle" /><input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="0994 123 456" className="min-h-11 w-full rounded-xl border border-bm-border bg-bm-surface pl-10 pr-3 text-sm text-bm-text outline-none focus:border-bm-focus focus:ring-2 focus:ring-bm-focus" /></div></label>
    {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p> : null}
    <div className="flex gap-2 pt-1">{onCancel ? <button type="button" onClick={onCancel} disabled={submitting} className="flex-1 rounded-xl border border-bm-border bg-bm-surface px-4 py-3 text-sm font-bold text-bm-text-muted hover:bg-bm-surface-muted disabled:opacity-50"><X className="mr-1.5 inline h-4 w-4" />Cancel</button> : null}<button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-bm-brand px-4 py-3 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Continuing…" : "Continue to payment"}</button></div>
  </form>;
}
