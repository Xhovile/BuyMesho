import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import AccountPageShell from "./components/AccountPageShell";
import FeedbackModal from "./components/FeedbackModal";
import FormDropdown from "./components/FormDropdown";
import { UNIVERSITIES } from "./constants";
import { navigateToPath } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import { resolveUniversity } from "./lib/university";
import { useAccountProfile } from "./hooks/useAccountProfile";
import type { University } from "./types";

type FeedbackState = { open: boolean; type: "success" | "error" | "info"; title: string; message: string } | null;
type SellerApplicationStatus = "pending" | "approved" | "rejected";
type SellerApplication = { status: SellerApplicationStatus; reviewed_at?: string | null; review_notes?: string | null };
type SellerType = "student" | "public" | "business";
type IdentityDocumentType = "national_id" | "passport";
type LaybyAudience = "students" | "everyone";

const SELLER_TYPES: Array<{ value: SellerType; label: string; description: string }> = [
  { value: "student", label: "Student seller", description: "I am applying as a student." },
  { value: "public", label: "Public / Non-student", description: "I am applying as an individual outside the student category." },
  { value: "business", label: "Business / Organisation", description: "I am representing a registered business or organisation." },
];

const STUDENT_OFFER_CATEGORIES = [
  "Phones & Accessories", "Laptops", "Stationery", "Clothes", "Accommodation", "Food", "Transport",
  "Printing", "Internet / Data", "Beauty Services", "Electronics", "Agricultural Products", "Financial Services",
];
const STUDENT_OFFER_PERCENTAGES = [5, 10, 15, 20, 25];

export default function BecomeSellerPage() {
  const { firebaseUser, authLoading, profile, profileLoading } = useAccountProfile();
  const [sellerType, setSellerType] = useState<SellerType>("public");
  const [identityDocumentType, setIdentityDocumentType] = useState<IdentityDocumentType>("national_id");
  const [form, setForm] = useState({
    fullLegalName: "", institution: resolveUniversity(), studentNumber: "", whatsappNumber: "", businessName: "", whatToSell: "", businessDescription: "",
    nationalOrPassportUrl: "", studentIdUrl: "", businessRegistrationUrl: "", offersLayby: false, laybyAudience: "students" as LaybyAudience,
    offersFinancing: false, providesDelivery: false, offersDeals: false, participatesStudentOffers: false, studentOfferCategories: [] as string[], studentOfferPercentage: 10, agreedToRules: false,
  });
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [showReapplyForm, setShowReapplyForm] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({ ...prev, fullLegalName: profile.full_name || profile.display_name || prev.fullLegalName, institution: resolveUniversity(profile.university), studentNumber: profile.student_number || prev.studentNumber, whatsappNumber: profile.phone || prev.whatsappNumber, businessName: profile.business_name || prev.businessName }));
    if (profile.user_type === "student") setSellerType("student");
  }, [profile]);

  useEffect(() => {
    const loadStatus = async () => {
      if (!firebaseUser || profile?.is_seller) return;
      try {
        const data = await apiFetch("/api/profile/seller-application");
        if (["pending", "approved", "rejected"].includes(data?.status)) { setApplication(data as SellerApplication); setShowReapplyForm(false); }
        else setApplication(null);
      } catch { setApplication(null); }
    };
    void loadStatus();
  }, [firebaseUser, profile?.is_seller]);

  const showFeedback = (type: "success" | "error" | "info", title: string, message: string) => setFeedback({ open: true, type, title, message });
  const toggleStudentOfferCategory = (category: string) => setForm((prev) => ({ ...prev, studentOfferCategories: prev.studentOfferCategories.includes(category) ? prev.studentOfferCategories.filter((item) => item !== category) : [...prev.studentOfferCategories, category] }));

  const uploadDocument = async (key: "nationalOrPassportUrl" | "studentIdUrl" | "businessRegistrationUrl", file: File) => {
    setUploading(key);
    try {
      const formData = new FormData(); formData.append("image", file);
      const response = await fetch("/api/upload/", { method: "POST", body: formData });
      const text = await response.text(); const data = text ? JSON.parse(text) : null;
      if (!response.ok || !data?.url) throw new Error(data?.error || "Upload failed");
      setForm((prev) => ({ ...prev, [key]: data.url }));
    } catch (error: any) { showFeedback("error", "Upload failed", error?.message || "We could not upload this document."); }
    finally { setUploading(null); }
  };

  const handleFileChange = (key: "nationalOrPassportUrl" | "studentIdUrl" | "businessRegistrationUrl") => async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) await uploadDocument(key, file); event.target.value = ""; };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault(); if (!firebaseUser || !profile) return;
    if (!form.fullLegalName.trim()) { showFeedback("error", "Legal name required", "Please enter your full legal name."); return; }
    if (!form.whatsappNumber.trim()) { showFeedback("error", "Phone number required", "Please provide a phone or WhatsApp number."); return; }
    if (!form.businessName.trim() || !form.whatToSell.trim() || !form.businessDescription.trim()) { showFeedback("error", "Seller information required", "Please complete your seller name, what you sell, and product/service description."); return; }
    if (!form.nationalOrPassportUrl) { showFeedback("error", "Identity document required", sellerType === "student" ? "Students must submit a National ID or Passport." : "Please submit a National ID or Passport."); return; }
    if (sellerType === "student" && (!form.studentIdUrl || !form.studentNumber || !form.institution)) { showFeedback("error", "Student details required", "Student sellers must provide institution, student number, and Student ID."); return; }
    if (sellerType === "business" && !form.businessRegistrationUrl) { showFeedback("error", "Business document required", "Business applicants must submit proof of business registration."); return; }
    if (form.participatesStudentOffers && form.studentOfferCategories.length < 2) { showFeedback("error", "Choose student categories", "Select at least two student-related categories for your Student Offer commitment."); return; }
    setSaving(true);
    try {
      const submitted = await apiFetch("/api/profile/become-seller", { method: "POST", body: JSON.stringify({
        seller_type: sellerType, full_legal_name: form.fullLegalName, institution: sellerType === "student" ? form.institution : null, student_number: sellerType === "student" ? form.studentNumber : null,
        whatsapp_number: form.whatsappNumber, business_name: form.businessName, what_to_sell: form.whatToSell, business_description: form.businessDescription,
        identity_document_type: identityDocumentType, identity_document_url: form.nationalOrPassportUrl, student_id_document_url: sellerType === "student" ? form.studentIdUrl : null,
        business_registration_document_url: sellerType === "business" ? form.businessRegistrationUrl : null, offers_layby: form.offersLayby, layby_audience: form.offersLayby ? form.laybyAudience : null,
        offers_financing: form.offersFinancing, provides_delivery: form.providesDelivery, offers_deals: form.offersDeals, participates_student_offers: form.participatesStudentOffers,
        student_offer_categories: form.participatesStudentOffers ? form.studentOfferCategories : [], student_offer_percentage: form.participatesStudentOffers ? form.studentOfferPercentage : null,
        agreed_to_rules: form.agreedToRules,
      }) });
      setApplication(submitted?.application || { status: "pending" }); setShowReapplyForm(false); showFeedback("success", "Application submitted", "Your application is pending manual review."); navigateToPath("/profile");
    } catch (error: any) { showFeedback("error", "Application failed", error?.message || "We could not submit your seller application."); }
    finally { setSaving(false); }
  };

  const documentButton = (key: "nationalOrPassportUrl" | "studentIdUrl" | "businessRegistrationUrl", label: string, hint: string) => (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-bold text-zinc-900">{label}</p><p className="mt-1 text-xs text-zinc-500">{hint}</p>
      <input id={`seller-${key}`} type="file" accept="image/*" onChange={handleFileChange(key)} className="hidden" />
      <label htmlFor={`seller-${key}`} className="mt-3 inline-flex cursor-pointer rounded-xl bg-white border border-zinc-200 px-4 py-2 text-sm font-bold hover:bg-zinc-100">{uploading === key ? "Uploading..." : form[key] ? "Replace document" : "Upload document"}</label>
      {form[key] ? <p className="mt-2 text-xs font-semibold text-emerald-700">Document uploaded</p> : null}
    </div>
  );

  return (
    <AccountPageShell eyebrow="Seller" title="Become a seller" description="Apply for seller status with the verification information relevant to you." backLabel="Back to Profile" onBack={() => navigateToPath("/profile")}>
      {authLoading || profileLoading ? <div className="p-8 text-sm text-zinc-500">Loading seller application…</div> : !firebaseUser ? <div className="p-8 text-sm text-zinc-500">Login required.</div> : !profile ? <div className="p-8 text-sm text-zinc-500">Please complete your BuyMesho account first.</div> : profile.is_seller ? <div className="p-8 text-sm text-zinc-500">Your account is already a seller account.</div> : application?.status === "pending" ? <div className="p-8 space-y-3 text-sm text-zinc-600"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="font-bold text-amber-800">Application pending review</p><p className="mt-1 text-amber-800">BuyMesho is reviewing your seller application.</p></div></div> : application?.status === "approved" ? <div className="p-8 space-y-3 text-sm text-zinc-600"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="font-bold text-emerald-800">Application approved</p><p className="mt-1 text-emerald-800">Your seller account is active.</p></div><button type="button" onClick={() => navigateToPath("/profile")} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white">Back to profile</button></div> : application?.status === "rejected" && !showReapplyForm ? <div className="p-8 space-y-3 text-sm text-zinc-600"><div className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="font-bold text-rose-800">Application rejected</p><p className="mt-1 text-rose-800">Your previous application was not approved.</p>{application.review_notes ? <p className="mt-2">Review note: {application.review_notes}</p> : null}</div><button type="button" onClick={() => setShowReapplyForm(true)} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white">Reapply</button></div> : (
        <form onSubmit={handleSubmit} className="p-8 space-y-7 w-full">
          <section className="space-y-3"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">1. Seller type</p><h2 className="text-xl font-black text-zinc-900">How are you applying?</h2>{SELLER_TYPES.map((item) => <button key={item.value} type="button" onClick={() => setSellerType(item.value)} className={`w-full rounded-2xl border p-4 text-left ${sellerType === item.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}><p className="font-extrabold">{item.label}</p><p className={`mt-1 text-xs ${sellerType === item.value ? "text-zinc-300" : "text-zinc-500"}`}>{item.description}</p></button>)}</section>
          <section className="space-y-4"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">2. Identity & verification</p><h2 className="text-xl font-black text-zinc-900">Verify who you are</h2><input required value={form.fullLegalName} onChange={(e) => setForm((p) => ({ ...p, fullLegalName: e.target.value }))} placeholder="Full legal name" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"/><input required value={form.whatsappNumber} onChange={(e) => setForm((p) => ({ ...p, whatsappNumber: e.target.value }))} placeholder="Phone / WhatsApp number" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"/><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setIdentityDocumentType("national_id")} className={`rounded-xl border p-3 text-sm font-bold ${identityDocumentType === "national_id" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}>National ID</button><button type="button" onClick={() => setIdentityDocumentType("passport")} className={`rounded-xl border p-3 text-sm font-bold ${identityDocumentType === "passport" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}>Passport</button></div>{documentButton("nationalOrPassportUrl", identityDocumentType === "national_id" ? "National ID" : "Passport", "Required for every seller applicant.")}{sellerType === "student" ? <>{documentButton("studentIdUrl", "Student ID", "Required for student sellers. Students also submit National ID or Passport above.")}<FormDropdown label="Institution" value={form.institution} options={UNIVERSITIES} onChange={(value) => setForm((p) => ({ ...p, institution: value as University }))}/><input required value={form.studentNumber} onChange={(e) => setForm((p) => ({ ...p, studentNumber: e.target.value }))} placeholder="Student number" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"/></> : null}{sellerType === "business" ? documentButton("businessRegistrationUrl", "Business registration / certificate", "Required for business or organisation applicants.") : null}</section>
          <section className="space-y-4"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">3. Seller information</p><h2 className="text-xl font-black text-zinc-900">Tell us what you sell</h2><input required value={form.businessName} onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))} placeholder="Seller / business name" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"/><input required value={form.whatToSell} onChange={(e) => setForm((p) => ({ ...p, whatToSell: e.target.value }))} placeholder="What products or services do you sell?" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"/><textarea required value={form.businessDescription} onChange={(e) => setForm((p) => ({ ...p, businessDescription: e.target.value }))} placeholder="Brief description of your products or services" className="w-full h-24 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 resize-none"/></section>
          <section className="space-y-5"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">4. Seller participation</p><h2 className="text-xl font-black text-zinc-900">What do you want to offer customers?</h2><label className="flex gap-3 items-start"><input type="checkbox" checked={form.offersLayby} onChange={(e) => setForm((p) => ({ ...p, offersLayby: e.target.checked }))} className="mt-1"/><span><b>Lay-by</b><span className="block text-xs text-zinc-500">I offer lay-by arrangements.</span></span></label>{form.offersLayby ? <div className="ml-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-sm font-bold text-zinc-800">Who can use your lay-by?</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => setForm((p) => ({ ...p, laybyAudience: "students" }))} className={`rounded-xl px-3 py-2 text-sm font-bold border ${form.laybyAudience === "students" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}>Students</button><button type="button" onClick={() => setForm((p) => ({ ...p, laybyAudience: "everyone" }))} className={`rounded-xl px-3 py-2 text-sm font-bold border ${form.laybyAudience === "everyone" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}>Everyone</button></div></div> : null}<label className="flex gap-3 items-start"><input type="checkbox" checked={form.offersFinancing} onChange={(e) => setForm((p) => ({ ...p, offersFinancing: e.target.checked }))} className="mt-1"/><span><b>Financing / payment installments</b><span className="block text-xs text-zinc-500">I may offer financing or installment arrangements. BuyMesho does not currently enforce financing terms.</span></span></label><label className="flex gap-3 items-start"><input type="checkbox" checked={form.providesDelivery} onChange={(e) => setForm((p) => ({ ...p, providesDelivery: e.target.checked }))} className="mt-1"/><span><b>Delivery</b><span className="block text-xs text-zinc-500">I currently provide delivery for my orders.</span></span></label><label className="flex gap-3 items-start"><input type="checkbox" checked={form.offersDeals} onChange={(e) => setForm((p) => ({ ...p, offersDeals: e.target.checked }))} className="mt-1"/><span><b>Deals & promotions</b><span className="block text-xs text-zinc-500">I may offer discounts or special promotions through BuyMesho.</span></span></label>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4"><label className="flex gap-3 items-start"><input type="checkbox" checked={form.participatesStudentOffers} onChange={(e) => setForm((p) => ({ ...p, participatesStudentOffers: e.target.checked, studentOfferCategories: e.target.checked ? p.studentOfferCategories : [] }))} className="mt-1"/><span><b>BuyMesho Student Offer Program</b><span className="block text-xs text-zinc-500">Optional. Commit to at least two student-related categories and choose the percentage you are willing to offer.</span></span></label>{form.participatesStudentOffers ? <div className="mt-4 space-y-4"><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{STUDENT_OFFER_CATEGORIES.map((category) => <button key={category} type="button" onClick={() => toggleStudentOfferCategory(category)} className={`rounded-xl border px-3 py-2 text-left text-xs font-bold ${form.studentOfferCategories.includes(category) ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}>{category}</button>)}</div><div><p className="text-sm font-bold text-zinc-800">Student offer percentage</p><div className="mt-2 flex flex-wrap gap-2">{STUDENT_OFFER_PERCENTAGES.map((percentage) => <button key={percentage} type="button" onClick={() => setForm((p) => ({ ...p, studentOfferPercentage: percentage }))} className={`rounded-xl border px-3 py-2 text-sm font-bold ${form.studentOfferPercentage === percentage ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}>{percentage}%</button>)}</div><p className="mt-2 text-xs text-zinc-500">The application records your chosen categories and percentage. Automatic product-level enforcement will be added later.</p></div></div> : null}</div></section>
          <section className="space-y-4"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">5. Marketplace commitments</p><h2 className="text-xl font-black text-zinc-900">Before submitting</h2><div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600"><p>By applying, you agree to provide authentic products/services, avoid scams and misleading listings, provide accurate information, and follow BuyMesho marketplace rules.</p><p className="mt-2">Seller fees: <b>3% commission on successful sales</b>, plus applicable payment-processing fees.</p><p className="mt-2">Participation choices are voluntary. Any specific deal or commitment will be governed by its published BuyMesho terms when the relevant marketplace system is available.</p></div><label className="flex gap-3 items-start text-sm"><input required type="checkbox" checked={form.agreedToRules} onChange={(e) => setForm((p) => ({ ...p, agreedToRules: e.target.checked }))} className="mt-1"/><span>I agree to BuyMesho's seller rules and marketplace commitments.</span></label><button type="submit" disabled={saving || !!uploading} className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-extrabold text-white disabled:opacity-50">{saving ? "Submitting..." : "Submit Seller Application"}</button></section>
        </form>
      )}
      {feedback ? <FeedbackModal open={feedback.open} type={feedback.type} title={feedback.title} message={feedback.message} onClose={() => setFeedback(null)} /> : null}
    </AccountPageShell>
  );
}
