import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import AccountPageShell from "./components/AccountPageShell";
import FeedbackModal from "./components/FeedbackModal";
import FormDropdown from "./components/FormDropdown";
import { UNIVERSITIES } from "./constants";
import { navigateToPath } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import { useAccountProfile } from "./hooks/useAccountProfile";
import type { University } from "./types";

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

type SellerApplicationStatus = "pending" | "approved" | "rejected";

type SellerApplication = {
  status: SellerApplicationStatus;
  reviewed_at?: string | null;
  review_notes?: string | null;
};

// SQLite's CURRENT_TIMESTAMP returns 'YYYY-MM-DD HH:MM:SS' (space separator, no timezone).
// Replace the space with 'T' and append 'Z' so all browsers parse it correctly as UTC ISO-8601.
// If the string already contains 'T' it is treated as ISO-8601 and returned as-is.
function parseSQLiteDate(ts: string): Date {
  const iso = ts.includes("T") ? ts : ts.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    console.warn("parseSQLiteDate: unexpected timestamp format:", ts);
    return new Date(ts);
  }
  return d;
}

export default function BecomeSellerPage() {
  const { firebaseUser, authLoading, profile, profileLoading, setProfile, updateProfile } = useAccountProfile();
  const [form, setForm] = useState({
    fullLegalName: "",
    institution: UNIVERSITIES[0] as University,
    applicantType: "student",
    institutionIdNumber: "",
    whatsappNumber: "",
    businessName: "",
    whatToSell: "",
    businessDescription: "",
    reasonForApplying: "",
    proofDocumentUrl: "",
    agreedToRules: false,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [showReapplyForm, setShowReapplyForm] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      institution: profile.university || (UNIVERSITIES[0] as University),
      whatsappNumber: profile.whatsapp_number || "",
      businessName: profile.business_name || "",
    }));
  }, [profile]);

  useEffect(() => {
    const loadStatus = async () => {
      if (!firebaseUser || profile?.is_seller) return;
      try {
        const data = await apiFetch("/api/profile/seller-application");
        if (data?.status === "pending" || data?.status === "approved" || data?.status === "rejected") {
          if (data.status === "approved" && !profile?.is_seller) {
            setProfile((prev) => (prev ? { ...prev, is_seller: true } : prev));
            try {
              await updateProfile({ is_seller: true });
            } catch (syncErr) {
              console.error("Failed to sync approved seller profile from become-seller page", syncErr);
            }
          }
          setApplication(data as SellerApplication);
          setShowReapplyForm(false);
        } else {
          setApplication(null);
        }
      } catch {
        setApplication(null);
      }
    };
    void loadStatus();
  }, [firebaseUser, profile?.is_seller]);

  const showFeedback = (type: "success" | "error" | "info", title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload/", { method: "POST", body: formData });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setForm((prev) => ({ ...prev, proofDocumentUrl: data.url }));
    } catch (err: any) {
      showFeedback("error", "Upload failed", err?.message || "We could not upload the proof document.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile) return;
    setSaving(true);
    try {
      const submitted = await apiFetch("/api/profile/become-seller", {
        method: "POST",
        body: JSON.stringify({
          full_legal_name: form.fullLegalName,
          institution: form.institution,
          applicant_type: form.applicantType,
          institution_id_number: form.institutionIdNumber,
          whatsapp_number: form.whatsappNumber,
          business_name: form.businessName,
          what_to_sell: form.whatToSell,
          business_description: form.businessDescription,
          reason_for_applying: form.reasonForApplying,
          proof_document_url: form.proofDocumentUrl,
          agreed_to_rules: form.agreedToRules,
        }),
      });
      const nextApplication = submitted?.application;
      if (nextApplication?.status) {
        setApplication(nextApplication as SellerApplication);
      }
      setShowReapplyForm(false);
      showFeedback("success", "Application submitted", "Your application is pending manual review.");
      navigateToPath("/profile");
    } catch (err: any) {
      showFeedback("error", "Application failed", err?.message || "We could not submit your seller application.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Seller"
      title="Become a seller"
      description="Apply for seller status so you can post listings with stronger legitimacy and review control."
      backLabel="Back to Profile"
      onBack={() => navigateToPath("/profile")}
    >
      {authLoading || profileLoading ? (
        <div className="p-8 text-sm text-zinc-500">Loading seller application…</div>
      ) : !firebaseUser ? (
        <div className="p-8 text-sm text-zinc-500">Login required.</div>
      ) : !profile ? (
        <div className="p-8 space-y-3 text-sm text-zinc-500">
          <p>Your account setup is not complete. Please create your account details before applying to become a seller.</p>
          <button
            type="button"
            onClick={() => navigateToPath("/edit-account")}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800"
          >
            Complete account setup
          </button>
        </div>
      ) : profile.is_seller ? (
        <div className="p-8 text-sm text-zinc-500">Your account is already a seller account.</div>
      ) : application?.status === "pending" ? (
        <div className="p-8 space-y-3 text-sm text-zinc-600">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-bold text-amber-800">Application pending review</p>
            <p className="mt-1 text-amber-800">You already applied to become a seller. We are still reviewing your application.</p>
            <p className="mt-2">
              Reviewed date:{" "}
              <span className="font-medium">
                {application.reviewed_at ? parseSQLiteDate(application.reviewed_at).toLocaleString() : "Not reviewed yet"}
              </span>
            </p>
            {application.review_notes ? (
              <p className="mt-1">Review note: <span className="font-medium">{application.review_notes}</span></p>
            ) : null}
          </div>
        </div>
      ) : application?.status === "approved" ? (
        <div className="p-8 space-y-3 text-sm text-zinc-600">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-bold text-emerald-800">Application approved</p>
            <p className="mt-1 text-emerald-800">
              Your seller application has been approved. If seller tools are not visible yet, refresh the page.
            </p>
            <p className="mt-2">
              Reviewed date:{" "}
              <span className="font-medium">
                {application.reviewed_at ? parseSQLiteDate(application.reviewed_at).toLocaleString() : "Approved"}
              </span>
            </p>
            {application.review_notes ? (
              <p className="mt-1">Review note: <span className="font-medium">{application.review_notes}</span></p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => navigateToPath("/profile")}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800"
          >
            Back to profile
          </button>
        </div>
      ) : application?.status === "rejected" && !showReapplyForm ? (
        <div className="p-8 space-y-3 text-sm text-zinc-600">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="font-bold text-rose-800">Application rejected</p>
            <p className="mt-1 text-rose-800">Your previous seller application was not approved.</p>
            <p className="mt-2">
              Reviewed date:{" "}
              <span className="font-medium">
                {application.reviewed_at ? parseSQLiteDate(application.reviewed_at).toLocaleString() : "Not available"}
              </span>
            </p>
            {application.review_notes ? (
              <p className="mt-1">Review note: <span className="font-medium">{application.review_notes}</span></p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowReapplyForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800"
          >
            Reapply
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-8 space-y-5 w-full">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Full Legal Name</label>
            <input required type="text" value={form.fullLegalName} onChange={(e) => setForm((prev) => ({ ...prev, fullLegalName: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" />
          </div>
          <FormDropdown label="Institution" value={form.institution} options={UNIVERSITIES} onChange={(value) => setForm((prev) => ({ ...prev, institution: value as University }))} />
          <FormDropdown label="Applicant Type" value={form.applicantType} options={["student", "staff", "registered_business"]} onChange={(value) => setForm((prev) => ({ ...prev, applicantType: value }))} />
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Institution ID / Registration Number</label>
            <input required type="text" value={form.institutionIdNumber} onChange={(e) => setForm((prev) => ({ ...prev, institutionIdNumber: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">WhatsApp Number</label>
            <input required type="text" value={form.whatsappNumber} onChange={(e) => setForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Business Name</label>
            <input required type="text" value={form.businessName} onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">What Do You Want to Sell?</label>
            <input required type="text" value={form.whatToSell} onChange={(e) => setForm((prev) => ({ ...prev, whatToSell: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Business Description</label>
            <textarea required value={form.businessDescription} onChange={(e) => setForm((prev) => ({ ...prev, businessDescription: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none h-24 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Reason for Applying</label>
            <textarea required value={form.reasonForApplying} onChange={(e) => setForm((prev) => ({ ...prev, reasonForApplying: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none h-24 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Proof Document</label>
            <input id="seller-proof-upload" type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <label htmlFor="seller-proof-upload" className="inline-flex px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-bold cursor-pointer">
              {uploading ? "Uploading..." : form.proofDocumentUrl ? "Replace Proof" : "Upload Proof"}
            </label>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-bold mb-1">Application flow: submitted → pending review → approved/rejected.</p>
            <p>False information can lead to rejection, suspension, or account removal.</p>
          </div>
          <label className="flex items-start gap-2 text-sm text-zinc-600">
            <input type="checkbox" checked={form.agreedToRules} onChange={(e) => setForm((prev) => ({ ...prev, agreedToRules: e.target.checked }))} className="mt-1" />
            <span>I agree to seller rules and prohibited-items policy.</span>
          </label>
          <button type="submit" disabled={saving || uploading || !form.proofDocumentUrl || !form.agreedToRules} className="bg-zinc-900 text-white py-3 px-6 rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50">
            {saving ? "Submitting..." : "Submit Seller Application"}
          </button>
          {application && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 space-y-1">
              <p>Current application status: <span className="font-bold capitalize">{application.status}</span></p>
              <p>Reviewed date: <span className="font-medium">{application.reviewed_at ? parseSQLiteDate(application.reviewed_at).toLocaleString() : "Not reviewed yet"}</span></p>
              {application.review_notes ? <p>Review note: <span className="font-medium">{application.review_notes}</span></p> : null}
            </div>
          )}
        </form>
      )}

      {feedback && <FeedbackModal open={feedback.open} type={feedback.type} title={feedback.title} message={feedback.message} onClose={() => setFeedback(null)} />}
    </AccountPageShell>
  );
}
