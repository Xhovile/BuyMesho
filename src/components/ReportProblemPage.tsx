import React, { useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { apiFetch } from "../lib/api";
import LegalPageShell from "./LegalPageShell";

type Props = {
  onBack: () => void;
  isLoggedIn: boolean;
};

export default function ReportProblemPage({
  onBack,
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
    <LegalPageShell title="Report a Problem" onBack={onBack}>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="w-full space-y-6">
          <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-sm font-semibold text-zinc-900">
              Help keep BuyMesho safer, more trustworthy, and more useful.
            </p>
            <p className="text-sm leading-7 text-zinc-700">
              This page is for reporting problems connected to BuyMesho, including
              suspicious activity, misleading listings, abusive behavior, scam
              attempts, account misuse, and other platform concerns.
            </p>
            <p className="text-sm leading-7 text-zinc-700">
              Clear reports help BuyMesho review issues more effectively and take
              moderation, safety, or account action where necessary.
            </p>
          </div>

          {!isLoggedIn && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-amber-800">
                  Login required to submit
                </p>
                <p className="text-sm leading-7 text-amber-700">
                  You can read the reporting form now, but you need to log in
                  before sending a report through the platform.
                </p>
              </div>
            </div>
          )}

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-800">
                    Report submitted
                  </p>
                  <p className="text-sm leading-7 text-emerald-700">
                    {successMessage}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="w-full space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-zinc-400">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-zinc-100 disabled:text-zinc-400"
                  placeholder="Example: Suspicious seller behavior"
                  required
                  disabled={!isLoggedIn || sending}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-zinc-400">
                  Details
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="h-40 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-zinc-100 disabled:text-zinc-400"
                  placeholder="Describe clearly what happened, which listing or user was involved, and why you are reporting it."
                  required
                  disabled={!isLoggedIn || sending}
                />
                <p className="mt-2 text-xs leading-6 text-zinc-500">
                  Be clear, factual, and specific. Avoid insults or vague claims.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7 text-zinc-700">
                By submitting a report, you confirm that the information you are
                providing is truthful to the best of your knowledge and relates
                to a genuine platform concern.
              </div>

              <button
                type="submit"
                disabled={!isLoggedIn || sending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:hover:bg-zinc-300"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Report"}
              </button>
            </form>
          )}
        </div>
      </div>
    </LegalPageShell>
  );
}
