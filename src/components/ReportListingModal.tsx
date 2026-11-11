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
        className="absolute inset-0 bg-bm-overlay backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-bm-surface rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-bm-border-subtle dark:border-bm-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-bm-warning" />
            <div>
              <h2 className="text-xl font-extrabold text-bm-text dark:text-bm-text">Report Listing</h2>
              <p className="text-xs font-bold text-bm-text-subtle dark:text-bm-text-subtle uppercase tracking-widest mt-1">
                Tell us what is wrong
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {successMessage && (
  <div className="bg-bm-success-bg border border-bm-border rounded-2xl p-4">
    <div className="flex items-start gap-3">
      <CheckCircle2 className="w-5 h-5 text-bm-success mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-bold text-bm-success">Submitted</p>
        <p className="text-sm text-bm-success">{successMessage}</p>
      </div>
    </div>

    <div className="mt-3 flex justify-end">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-xl bg-bm-success hover:bg-bm-success/90 text-bm-on-brand text-sm font-bold transition-colors"
      >
        Close
      </button>
    </div>
  </div>
)}

          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-bm-text-subtle dark:text-bm-text-subtle uppercase mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Scam, fake item, abusive content"
                  className="w-full px-4 py-3 bg-bm-surface-muted dark:bg-bm-surface-subtle border border-bm-border dark:border-bm-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                  disabled={sending}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-bm-text-subtle dark:text-bm-text-subtle uppercase mb-1">
                  Extra Details (Optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe the issue clearly..."
                  className="w-full px-4 py-3 bg-bm-surface-muted dark:bg-bm-surface-subtle border border-bm-border dark:border-bm-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-28 resize-none"
                  disabled={sending}
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-bm-brand text-bm-on-brand py-3 rounded-xl font-bold hover:bg-bm-brand-hover transition-colors flex items-center justify-center gap-2 disabled:bg-bm-surface-raised disabled:hover:bg-bm-surface-raised disabled:cursor-not-allowed"
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
