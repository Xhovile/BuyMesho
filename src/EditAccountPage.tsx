import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera } from "lucide-react";
import AccountPageShell from "./components/AccountPageShell";
import FeedbackModal from "./components/FeedbackModal";
import FormDropdown from "./components/FormDropdown";
import { UNIVERSITIES } from "./constants";
import { navigateToPath } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import { resolveUniversity } from "./lib/university";
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
    university: resolveUniversity(),
    profilePicture: "",
  });
  const [formReady, setFormReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  // Fetch authoritative profile from server (SQLite) once authenticated so the
  // form is prefilled with current data regardless of Firestore state.
  useEffect(() => {
    if (!firebaseUser || authLoading) return;
    apiFetch("/api/profile")
      .then((serverProfile) => {
        if (!serverProfile) return;
        setForm({
          university: resolveUniversity(serverProfile.university),
          profilePicture: serverProfile.profile_picture || "",
        });
      })
      .finally(() => setFormReady(true));
  }, [firebaseUser, authLoading]);

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
      setForm((prev) => ({ ...prev, profilePicture: data.url }));
    } catch (err: any) {
      showFeedback("error", "Upload failed", err?.message || "We could not upload the picture.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    try {
      await apiFetch("/api/account", {
        method: "PUT",
        body: JSON.stringify({
          university: form.university,
          profile_picture: form.profilePicture || "",
        }),
      });

      const updatedProfile: UserProfile = profile
        ? { ...profile, university: form.university, profile_picture: form.profilePicture || undefined }
        : {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            university: form.university,
            profile_picture: form.profilePicture || undefined,
            is_verified: false,
            is_seller: false,
            join_date: new Date().toISOString(),
          };

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
      title={profile ? "Edit account" : "Complete account setup"}
      description={
        profile
          ? "Update your general account details, including your university."
          : "Create your account details to finish setting up your profile."
      }
      backLabel="Back to Profile"
      onBack={() => navigateToPath("/profile")}
    >
      {authLoading || profileLoading || !formReady ? (
        <div className="p-8 text-sm text-zinc-500">Loading account…</div>
      ) : !firebaseUser ? (
        <div className="p-8 text-sm text-zinc-500">Login required.</div>
      ) : (
        <form onSubmit={handleSave} className="p-8 space-y-5 w-full">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Profile Picture</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                {form.profilePicture ? (
                  <img src={form.profilePicture} alt="Profile picture" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-zinc-400" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input id="edit-account-picture" type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                <label
                  htmlFor="edit-account-picture"
                  className="inline-flex px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-bold cursor-pointer"
                >
                  {uploading ? "Uploading..." : form.profilePicture ? "Replace Picture" : "Upload Picture"}
                </label>
                {form.profilePicture && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, profilePicture: "" }))}
                    className="inline-flex px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-sm font-bold text-red-600"
                  >
                    Remove Picture
                  </button>
                )}
              </div>
            </div>
          </div>

          <FormDropdown
            label="University"
            value={form.university}
            options={UNIVERSITIES}
            onChange={(value) => setForm((prev) => ({ ...prev, university: value as University }))}
          />

          <button type="submit" disabled={saving || uploading} className="bg-zinc-900 text-white py-3 px-6 rounded-xl font-bold hover:bg-zinc-800">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}

      {feedback && <FeedbackModal open={feedback.open} type={feedback.type} title={feedback.title} message={feedback.message} onClose={() => setFeedback(null)} />}
    </AccountPageShell>
  );
}
