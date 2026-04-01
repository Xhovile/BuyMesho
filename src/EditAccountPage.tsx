import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { User } from "lucide-react";
import { updateDoc, doc } from "firebase/firestore";
import AccountPageShell from "./components/AccountPageShell";
import FeedbackModal from "./components/FeedbackModal";
import FormDropdown from "./components/FormDropdown";
import { db as firestore } from "./firebase";
import { UNIVERSITIES } from "./constants";
import { navigateToPath } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import { useAccountProfile } from "./hooks/useAccountProfile";
import type { University, UserProfile } from "./types";

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

export default function EditAccountPage() {
  const { firebaseUser, authLoading, profile, profileLoading, setProfile } = useAccountProfile();
  const [form, setForm] = useState({
    university: UNIVERSITIES[0] as University,
    avatarUrl: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      university: profile.university || (UNIVERSITIES[0] as University),
      avatarUrl: profile.avatar_url || "",
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
      setForm((prev) => ({ ...prev, avatarUrl: data.url }));
    } catch (err: any) {
      showFeedback("error", "Upload failed", err?.message || "We could not upload the image.");
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
        university: form.university,
        avatar_url: form.avatarUrl,
      };
      await updateDoc(doc(firestore, "users", firebaseUser.uid), {
        university: updatedProfile.university,
        avatar_url: updatedProfile.avatar_url || "",
      });
      await apiFetch("/api/sellers", {
        method: "POST",
        body: JSON.stringify(updatedProfile),
      });
      setProfile(updatedProfile);
      showFeedback("success", "Account updated", "Your account details were saved successfully.");
      navigateToPath("/profile");
    } catch (err: any) {
      showFeedback("error", "Account update failed", err?.message || "We could not update your account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Account"
      title="Edit account"
      description="Update your general account details, including your university and profile picture."
      backLabel="Back to Profile"
      onBack={() => navigateToPath("/profile")}
    >
      {authLoading || profileLoading ? (
        <div className="p-8 text-sm text-zinc-500">Loading account…</div>
      ) : !firebaseUser ? (
        <div className="p-8 text-sm text-zinc-500">Login required.</div>
      ) : !profile ? (
        <div className="p-8 space-y-3 text-sm text-zinc-500">
          <p>Account setup is still in progress. Please open your profile to continue setup.</p>
          <button
            type="button"
            onClick={() => navigateToPath("/profile")}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800"
          >
            Continue profile setup
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="p-8 space-y-5 w-full">
          <FormDropdown
            label="University"
            value={form.university}
            options={UNIVERSITIES}
            onChange={(value) => setForm((prev) => ({ ...prev, university: value as University }))}
          />

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Profile Picture</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center">
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-zinc-400" />
                )}
              </div>
              <div>
                <input id="edit-account-avatar" type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                <label htmlFor="edit-account-avatar" className="inline-flex px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-bold cursor-pointer">
                  {uploading ? "Uploading..." : "Upload Photo"}
                </label>
              </div>
            </div>
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
