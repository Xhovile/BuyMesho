import { useEffect, useState, type FormEvent } from "react";
import { Loader2, MapPin, UserRound } from "lucide-react";
import AccountPageShell from "./components/AccountPageShell";
import FormDropdown from "./components/FormDropdown";
import FeedbackModal from "./components/FeedbackModal";
import { UNIVERSITIES } from "./constants";
import { apiFetch } from "./lib/api";
import { consumeAuthReturnPath, HOME_PATH, navigateToPath } from "./lib/appNavigation";
import { useAuthUser } from "./hooks/useAuthUser";
import type { UserProfile, UserType } from "./types";

type FormState = {
  firstName: string;
  surname: string;
  otherNames: string;
  userType: UserType | "";
  phone: string;
  university: string;
  campus: string;
  studentId: string;
  studentNumber: string;
  studentEmail: string;
  addressLine: string;
  area: string;
  townOrDistrict: string;
  landmark: string;
  profilePicture: string;
};

type FeedbackState = { open: boolean; type: "success" | "error" | "info"; title: string; message: string } | null;
type SignupProfileDraft = { firstName?: string; surname?: string; otherNames?: string };

const SIGNUP_PROFILE_DRAFT_KEY = "__buymesho_signup_profile_draft";

const emptyForm: FormState = {
  firstName: "", surname: "", otherNames: "", userType: "", phone: "", university: "", campus: "",
  studentId: "", studentNumber: "", studentEmail: "", addressLine: "", area: "", townOrDistrict: "", landmark: "", profilePicture: "",
};

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readSignupDraft(): SignupProfileDraft {
  try {
    const raw = sessionStorage.getItem(SIGNUP_PROFILE_DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SignupProfileDraft;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function AccountSetupPage() {
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    const signupDraft = readSignupDraft();
    void apiFetch("/api/profile")
      .then((profile: UserProfile) => {
        const firstName = normalize(profile?.first_name) || normalize(signupDraft.firstName);
        const surname = normalize(profile?.surname) || normalize(signupDraft.surname);
        const otherNames = normalize(profile?.other_names) || normalize(signupDraft.otherNames);
        setForm({
          ...emptyForm,
          firstName,
          surname,
          otherNames,
          userType: profile?.user_type === "student" || profile?.user_type === "public" ? profile.user_type : "",
          phone: normalize(profile?.phone),
          university: normalize(profile?.university),
          campus: normalize(profile?.campus),
          studentId: normalize(profile?.student_id),
          studentNumber: normalize(profile?.student_number),
          studentEmail: normalize(profile?.student_email),
          addressLine: normalize(profile?.buyer_details?.addressLine),
          area: normalize(profile?.buyer_details?.area),
          townOrDistrict: normalize(profile?.buyer_details?.townOrDistrict),
          landmark: normalize(profile?.buyer_details?.landmark),
          profilePicture: normalize(profile?.profile_picture),
        });
      })
      .catch(() => {
        setForm((prev) => ({
          ...prev,
          firstName: prev.firstName || normalize(signupDraft.firstName),
          surname: prev.surname || normalize(signupDraft.surname),
          otherNames: prev.otherNames || normalize(signupDraft.otherNames),
        }));
        setFeedback({ open: true, type: "error", title: "Could not load your profile", message: "Your signup details are still available. Please complete the remaining fields and try again." });
      })
      .finally(() => setLoading(false));
  }, [authLoading, firebaseUser]);

  const setField = (field: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [field]: value }));
  const isStudent = form.userType === "student";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!firebaseUser) return;

    const firstName = form.firstName.trim();
    const surname = form.surname.trim();
    const phone = form.phone.trim();
    const townOrDistrict = form.townOrDistrict.trim();

    if (!firstName || !surname || !phone || !form.userType) {
      setFeedback({ open: true, type: "error", title: "Complete your profile", message: "First name, surname, user type, and phone number are required." });
      return;
    }
    if (!townOrDistrict) {
      setFeedback({ open: true, type: "error", title: "Delivery location required", message: "Enter your town or district so BuyMesho can understand your delivery area." });
      return;
    }
    if (isStudent && (!form.university.trim() || !form.studentNumber.trim() || !form.studentEmail.trim())) {
      setFeedback({ open: true, type: "error", title: "Student information required", message: "Students must provide their institution, student number, and student email." });
      return;
    }

    setSaving(true);
    try {
      const fullName = [firstName, form.otherNames.trim(), surname].filter(Boolean).join(" ");
      const buyerDetails = {
        fullName,
        phone,
        addressLine: form.addressLine.trim(),
        area: form.area.trim(),
        townOrDistrict,
        landmark: form.landmark.trim(),
      };

      await apiFetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          surname,
          other_names: form.otherNames.trim() || null,
          full_name: fullName,
          phone,
          user_type: form.userType,
          university: isStudent ? form.university.trim() : null,
          campus: isStudent ? form.campus.trim() || null : null,
          student_id: isStudent ? form.studentId.trim() || null : null,
          student_number: isStudent ? form.studentNumber.trim() : null,
          student_email: isStudent ? form.studentEmail.trim() : null,
          profile_picture: form.profilePicture.trim() || null,
          buyer_details: buyerDetails,
          profile_setup_complete: true,
        }),
      });

      try { sessionStorage.removeItem(SIGNUP_PROFILE_DRAFT_KEY); } catch { /* Ignore storage errors. */ }
      navigateToPath(consumeAuthReturnPath(HOME_PATH), { replace: true });
    } catch (error: any) {
      setFeedback({ open: true, type: "error", title: "Could not save your profile", message: error?.message || "Please check your details and try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Welcome to BuyMesho"
      title="Complete your profile"
      description="Your account is verified. Tell us a little more so BuyMesho can work for you."
      backLabel="Log out"
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your account…</div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full space-y-7 pb-28">
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><UserRound className="h-5 w-5 text-zinc-700" /><div><h2 className="font-extrabold text-zinc-900">About you</h2><p className="text-xs text-zinc-500">Your general BuyMesho identity.</p></div></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label><span className="mb-2 block text-sm font-medium text-zinc-600">First name</span><input required autoComplete="given-name" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} className="w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 outline-none focus:border-zinc-900" /></label>
              <label><span className="mb-2 block text-sm font-medium text-zinc-600">Surname</span><input required autoComplete="family-name" value={form.surname} onChange={(e) => setField("surname", e.target.value)} className="w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 outline-none focus:border-zinc-900" /></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium text-zinc-600">Other names <span className="text-zinc-400">(optional)</span></span><input autoComplete="additional-name" value={form.otherNames} onChange={(e) => setField("otherNames", e.target.value)} className="w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 outline-none focus:border-zinc-900" /></label>
              <label><span className="mb-2 block text-sm font-medium text-zinc-600">Phone number</span><input required autoComplete="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} className="w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 outline-none focus:border-zinc-900" /></label>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-5"><h2 className="font-extrabold text-zinc-900">What best describes you?</h2><p className="mt-1 text-xs text-zinc-500">This only determines which relevant BuyMesho information we ask for.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[{ value: "student", title: "Student", description: "I am currently studying at an institution." }, { value: "public", title: "Public / Non-Student", description: "I am joining BuyMesho as a general user." }].map((option) => (
                <button key={option.value} type="button" onClick={() => setField("userType", option.value)} className={`rounded-2xl border p-4 text-left transition ${form.userType === option.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400"}`}>
                  <p className="font-extrabold">{option.title}</p><p className={`mt-1 text-xs ${form.userType === option.value ? "text-zinc-300" : "text-zinc-500"}`}>{option.description}</p>
                </button>
              ))}
            </div>
          </section>

          {isStudent && (
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-5"><h2 className="font-extrabold text-zinc-900">Student information</h2><p className="mt-1 text-xs text-zinc-500">These fields only apply to student accounts.</p></div>
              <div className="space-y-5">
                <FormDropdown label="Institution / University" value={form.university} options={UNIVERSITIES} onChange={(value) => setField("university", value)} />
                <label className="block"><span className="mb-2 block text-sm font-medium text-zinc-600">Campus <span className="text-zinc-400">(optional)</span></span><input value={form.campus} onChange={(e) => setField("campus", e.target.value)} className="w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 outline-none focus:border-zinc-900" /></label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label><span className="mb-2 block text-sm font-medium text-zinc-600">Student number</span><input required={isStudent} value={form.studentNumber} onChange={(e) => setField("studentNumber", e.target.value)} className="w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 outline-none focus:border-zinc-900" /></label>
                  <label><span className="mb-2 block text-sm font-medium text-zinc-600">Student ID <span className="text-zinc-400">(optional)</span></span><input value={form.studentId} onChange={(e) => setField("studentId", e.target.value)} className="w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 outline-none focus:border-zinc-900" /></label>
                </div>
                <label className="block"><span className="mb-2 block text-sm font-medium text-zinc-600">Student email</span><input required={isStudent} type="email" value={form.studentEmail} onChange={(e) => setField("studentEmail", e.target.value)} className="w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 outline-none focus:border-zinc-900" /></label>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><MapPin className="h-5 w-5 text-zinc-700" /><div><h2 className="font-extrabold text-zinc-900">Delivery information</h2><p className="text-xs text-zinc-500">Used to make checkout faster. You can change these details later.</p></div></div>
            <div className="space-y-5">
              <label className="block"><span className="mb-2 block text-sm font-medium text-zinc-600">Delivery address</span><textarea rows={3} value={form.addressLine} onChange={(e) => setField("addressLine", e.target.value)} placeholder="House, hostel, building, room, or other delivery address" className="w-full resize-none rounded-2xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-zinc-400" /></label>
              <div className="grid gap-5 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-medium text-zinc-600">Area / Location <span className="text-zinc-400">(optional)</span></span><input value={form.area} onChange={(e) => setField("area", e.target.value)} className="w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 outline-none focus:border-zinc-900" /></label><label><span className="mb-2 block text-sm font-medium text-zinc-600">Town / District</span><input required value={form.townOrDistrict} onChange={(e) => setField("townOrDistrict", e.target.value)} className="w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 outline-none focus:border-zinc-900" /></label></div>
              <label className="block"><span className="mb-2 block text-sm font-medium text-zinc-600">Nearest landmark <span className="text-zinc-400">(optional)</span></span><input value={form.landmark} onChange={(e) => setField("landmark", e.target.value)} className="w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 outline-none focus:border-zinc-900" /></label>
            </div>
          </section>

          <div className="sticky bottom-4 z-20 pt-2"><div className="rounded-[1.5rem] border border-white/80 bg-white/95 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur"><button type="submit" disabled={saving || !form.userType} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-6 py-3 font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Finish setup"}</button></div></div>
        </form>
      )}
      {feedback && <FeedbackModal open={feedback.open} type={feedback.type} title={feedback.title} message={feedback.message} onClose={() => setFeedback(null)} />}
    </AccountPageShell>
  );
}
