import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera } from "lucide-react";
import AccountPageShell from "./components/AccountPageShell";
import FeedbackModal from "./components/FeedbackModal";
import FormDropdown from "./components/FormDropdown";
import { UNIVERSITIES } from "./constants";
import { navigateToPath } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import { resolveUniversity } from "./lib/university";
import { resolveWhatsappNumber } from "./lib/whatsapp";
import { useAccountProfile } from "./hooks/useAccountProfile";
import type { University, UserProfile } from "./types";

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

export default function EditProfilePage() {
  const { firebaseUser, authLoading, profile, profileLoading, setProfile } = useAccountProfile();
  const [form, setForm] = useState({
    businessName: "",
    university: resolveUniversity(),
    logoUrl: "",
    bio: "",
    whatsappNumber: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      businessName: profile.business_name || "",
      university: resolveUniversity(profile.university),
      logoUrl: profile.business_logo || "",
      bio: profile.bio || "",
      whatsappNumber: resolveWhatsappNumber(profile.whatsapp_number),
    });
  }, [profile]);

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
      setForm((prev) => ({ ...prev, logoUrl: data.url }));
    } catch (err: any) {
      showFeedback("error", "Upload failed", err?.message || "We could not upload the logo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile) return;
    setSaving(true);
    try {
      const updatedProfile: UserProfile = {
        ...profile,
        business_name: form.businessName,
        business_logo: form.logoUrl,
        university: form.university,
        bio: form.bio,
        whatsapp_number: form.whatsappNumber,
      };
      await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          business_name: updatedProfile.business_name,
          business_logo: updatedProfile.business_logo || "",
          university: updatedProfile.university,
          bio: updatedProfile.bio || "",
          whatsapp_number: updatedProfile.whatsapp_number || "",
        }),
      });
      setProfile(updatedProfile);
      showFeedback("success", "Profile updated", "Your seller profile was saved successfully.");
      navigateToPath("/profile");
    } catch (err: any) {
      showFeedback("error", "Profile update failed", err?.message || "We could not update your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Seller"
      title="Edit seller profile"
      description="Update the seller details buyers see when they open your profile."
      backLabel="Back to Profile"
      onBack={() => navigateToPath("/profile")}
    >
      {authLoading || profileLoading ? (
        <div className="p-8 text-sm text-zinc-500">Loading profile…</div>
      ) : !firebaseUser ? (
        <div className="p-8 text-sm text-zinc-500">Login required.</div>
      ) : !profile ? (
        <div className="p-8 space-y-3 text-sm text-zinc-500">
          <p>Your account profile is not ready yet. Complete account setup first.</p>
          <button
            type="button"
            onClick={() => navigateToPath("/edit-account")}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800"
          >
            Go to Edit Account
          </button>
        </div>
      ) : !profile.is_seller ? (
        <div className="p-8 text-sm text-zinc-500">Seller access required.</div>
      ) : (
        <form onSubmit={handleSave} className="p-8 space-y-5 w-full">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Business Name</label>
            <input required type="text" value={form.businessName} onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <FormDropdown label="University" value={form.university} options={UNIVERSITIES} onChange={(value) => setForm((prev) => ({ ...prev, university: value as University }))} />
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">WhatsApp Number</label>
            <input type="text" value={form.whatsappNumber} onChange={(e) => setForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Business Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center">
                {form.logoUrl ? <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-zinc-400" />}
              </div>
              <div>
                <input id="edit-profile-logo" type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                <label htmlFor="edit-profile-logo" className="inline-flex px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-bold cursor-pointer">
                  {uploading ? "Uploading..." : "Upload Logo"}
                </label>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Short Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-24 resize-none" />
          </div>
          <button type="submit" disabled={saving || uploading} className="bg-zinc-900 text-white py-3 px-6 rounded-xl font-bold hover:bg-zinc-800">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}

      {feedback && <FeedbackModal open={feedback.open} type={feedback.type} title={feedback.title} message={feedback.message} onClose={() => setFeedback(null)} />}
    </AccountPageShell>
  );
}
