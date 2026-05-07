import React, { useState } from "react";
import { motion } from "motion/react";
import { X, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { apiFetch } from "../lib/api";

type Props = {
  listingId: number;
  onClose: () => void;
};

export default function ReportListingModal({ listingId, onClose }: Props) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      alert("Please enter a reason.");
      return;
    }

    setSending(true);
    setSuccessMessage("");

    try {
      await apiFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          type: "listing",
          listing_id: listingId,
          reason: reason.trim(),
          details: details.trim() || null,
        }),
      });

      setSuccessMessage("Your listing report has been submitted successfully.");
      setReason("");
      setDetails("");
    } catch (err: any) {
      alert(err?.message || "Failed to submit listing report.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-xl font-extrabold text-zinc-900">Report Listing</h2>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
                Tell us what is wrong
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {successMessage && (
  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
    <div className="flex items-start gap-3">
      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-bold text-emerald-800">Submitted</p>
        <p className="text-sm text-emerald-700">{successMessage}</p>
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
)}

          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Scam, fake item, abusive content"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                  disabled={sending}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  Extra Details (Optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe the issue clearly..."
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-28 resize-none"
                  disabled={sending}
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:bg-zinc-300 disabled:hover:bg-zinc-300 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Report"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
