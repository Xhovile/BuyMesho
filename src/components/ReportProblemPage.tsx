import React, { useState } from "react";
import {
  Loader2,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  FileWarning,
} from "lucide-react";
import { apiFetch } from "../lib/api";

type Props = {
  onBack: () => void;
  onClose: () => void;
  showBackButton?: boolean;
  isLoggedIn: boolean;
};

function Section({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-900">
          {title}
        </h3>
      </div>
      <div className="space-y-3 text-sm leading-7 text-zinc-700">{children}</div>
    </section>
  );
}

export default function ReportProblemPage({
  onBack,
  onClose,
  showBackButton = true,
  isLoggedIn,
}: Props) {
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      return;
    }

    if (!subject.trim() || !details.trim()) {
      alert("Please complete both subject and details.");
      return;
    }

    setSending(true);
    setSuccessMessage("");

    try {
      await apiFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          type: "problem",
          subject: subject.trim(),
          reason: subject.trim(),
          details: details.trim(),
        }),
      });

      setSuccessMessage(
        "Your report has been submitted successfully. BuyMesho may review the issue and take platform action where necessary."
      );
      setSubject("");
      setDetails("");
    } catch (err: any) {
      alert(err?.message || "Failed to submit problem report.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="sticky top-0 z-20 border-b border-zinc-100 bg-white/95 backdrop-blur">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
              BuyMesho
            </p>
            <h2 className="text-2xl font-extrabold text-zinc-900">
              Report a Problem
            </h2>
          </div>

          <button
            onClick={onClose}
            className="h-11 w-11 rounded-2xl border border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 hover:shadow-md transition-all flex items-center justify-center"
            aria-label="Close page"
          >
            <X className="w-5 h-5 text-zinc-700" />
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-3">
              <p className="text-sm font-semibold text-zinc-900">
                Help keep BuyMesho safer, more trustworthy, and more useful.
              </p>
              <p className="text-sm leading-7 text-zinc-700">
                This page is for reporting problems connected to BuyMesho,
                including suspicious activity, misleading listings, abusive
                behavior, scam attempts, account misuse, and other platform
                concerns.
              </p>
              <p className="text-sm leading-7 text-zinc-700">
                Clear reports help BuyMesho review issues more effectively and
                take moderation, safety, or account action where necessary.
              </p>
            </div>
          </div>

          <Section
            icon={<ShieldAlert className="w-5 h-5 text-zinc-700" />}
            title="1. What You Should Report"
          >
            <p>You should use this page to report issues such as:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>fake, misleading, or suspicious listings;</li>
              <li>suspected scams, payment deception, or impersonation;</li>
              <li>abusive, threatening, or inappropriate behavior;</li>
              <li>suspected stolen, prohibited, or unsafe items;</li>
              <li>seller or buyer misconduct connected to platform use;</li>
              <li>account misuse, repeated spam, or suspicious platform activity;</li>
              <li>technical problems that seriously affect platform use.</li>
            </ul>
          </Section>

          <Section
            icon={<FileWarning className="w-5 h-5 text-zinc-700" />}
            title="2. What Makes a Good Report"
          >
            <p>
              A strong report is specific, factual, and clear. When possible,
              include:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>what happened;</li>
              <li>which listing, user, or action is involved;</li>
              <li>when it happened;</li>
              <li>why it appears suspicious, misleading, unsafe, or abusive;</li>
              <li>
                any details that would help BuyMesho understand the issue faster.
              </li>
            </ul>
            <p>
              Reports that are vague, emotional without detail, or intentionally
              false are harder to review and may weaken the reporting process.
            </p>
          </Section>

          <Section
            icon={<AlertTriangle className="w-5 h-5 text-zinc-700" />}
            title="3. Important Reporting Guidance"
          >
            <p>
              Reporting a problem does not automatically guarantee removal of a
              listing, suspension of an account, or a specific outcome. BuyMesho
              may review the matter, compare it with available platform records,
              and decide what action is reasonable under the circumstances.
            </p>
            <p>
              Users should not use the reporting system to harass others, make
              false accusations, retaliate after ordinary disagreements, or
              manipulate competition. Misuse of the reporting process may itself
              lead to moderation action.
            </p>
            <p>
              If a situation appears urgent or involves immediate danger, users
              should prioritise personal safety and appropriate local help rather
              than relying only on an online report.
            </p>
          </Section>

          {!isLoggedIn && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">
                  Login required to submit
                </p>
                <p className="text-sm text-amber-700 leading-7">
                  You can read the reporting guidance now, but you need to log
                  in before sending a report through the platform.
                </p>
              </div>
            </div>
          )}

          {successMessage ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-800">
                    Report submitted
                  </p>
                  <p className="text-sm text-emerald-700 leading-7">
                    {successMessage}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-5 shadow-sm"
            >
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-zinc-100 disabled:text-zinc-400"
                  placeholder="Example: Suspicious seller behavior"
                  required
                  disabled={!isLoggedIn || sending}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  Details
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-40 resize-none disabled:bg-zinc-100 disabled:text-zinc-400"
                  placeholder="Describe clearly what happened, which listing or user was involved, and why you are reporting it."
                  required
                  disabled={!isLoggedIn || sending}
                />
                <p className="mt-2 text-xs text-zinc-500 leading-6">
                  Be clear, factual, and specific. Avoid insults or vague claims.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 leading-7">
                By submitting a report, you confirm that the information you are
                providing is truthful to the best of your knowledge and relates
                to a genuine platform concern.
              </div>

              <button
                type="submit"
                disabled={!isLoggedIn || sending}
                className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:bg-zinc-300 disabled:hover:bg-zinc-300 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Submit Report"
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-zinc-100 bg-white/95 backdrop-blur px-6 py-4 flex items-center justify-start">
        {showBackButton ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-zinc-800 transition-colors"
          >
            ← Back
          </button>
        ) : null}
      </div>
    </div>
  );
}
