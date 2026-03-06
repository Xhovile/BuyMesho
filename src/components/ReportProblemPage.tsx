import React, { useState } from "react";
import { HelpCircle, Loader2, X } from "lucide-react";
import { apiFetch } from "../lib/api";

type Props = {
  onBack: () => void;
  onClose: () => void;
  showBackButton?: boolean;
};

export default function ReportProblemPage({
  onBack,
  onClose,
  showBackButton = true,
}: Props) {
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !details.trim()) {
      alert("Please complete both subject and details.");
      return;
    }

    setSending(true);
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

      alert("Problem report submitted successfully.");
      setSubject("");
      setDetails("");
    } catch (err: any) {
      alert(err?.message || "Failed to submit problem report.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 overflow-y-auto flex-1">
      <div className="flex items-center justify-between mb-6">
        {showBackButton ? (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-bold"
          >
            ← Back to Settings
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-6 h-6 text-zinc-700" />
          <h2 className="text-2xl font-extrabold text-zinc-900">Report a Problem</h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="What went wrong?"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Details
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-32 resize-none"
              placeholder="Describe the issue clearly..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Problem"}
          </button>
        </form>
      </div>
    </div>
  );
}
