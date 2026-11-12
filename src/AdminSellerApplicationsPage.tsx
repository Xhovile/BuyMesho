import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { apiFetch } from "./lib/api";
import { EXPLORE_PATH, HOME_PATH, navigateBackOrPath, navigateToPath, navigateToSellerProfile } from "./lib/appNavigation";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";

type SellerApplicationStatus = "pending" | "approved" | "rejected";
type SellerApplicationRow = {
  id: number;
  applicant_uid: string | null;
  applicant_email: string | null;
  full_legal_name: string | null;
  seller_type: string | null;
  institution: string | null;
  student_number: string | null;
  whatsapp_number: string | null;
  business_name: string | null;
  what_to_sell: string | null;
  business_description: string | null;
  identity_document_type: string | null;
  identity_document_url: string | null;
  student_id_document_url: string | null;
  business_registration_document_url: string | null;
  offers_layby: boolean;
  layby_audience: string | null;
  offers_financing: boolean;
  provides_delivery: boolean;
  offers_deals: boolean;
  participates_student_offers: boolean;
  student_offer_categories: string[];
  student_offer_percentage: number | null;
  agreed_to_rules: boolean;
  status: SellerApplicationStatus;
  review_notes: string | null;
  reviewed_at: string | null;
  reviewed_by_uid: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const FILTERS: SellerApplicationStatus[] = ["pending", "approved", "rejected"];
const labelize = (value: string | null | undefined) => value ? value.replace(/_/g, " ") : "—";

export default function AdminSellerApplicationsPage() {
  const [applications, setApplications] = useState<SellerApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SellerApplicationStatus>("pending");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [reviewNotesById, setReviewNotesById] = useState<Record<number, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchApplications = async () => {
    setLoading(true); setLoadError(null);
    try {
      const data = await apiFetch("/api/admin/seller-applications");
      const rows = Array.isArray(data) ? data : [];
      setApplications(rows);
      setReviewNotesById(rows.reduce<Record<number, string>>((acc, row) => { acc[row.id] = row.review_notes || ""; return acc; }, {}));
    } catch (err: any) { setLoadError(err?.message || "Failed to load seller applications."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchApplications(); }, []);
  const filteredApplications = useMemo(() => applications.filter((application) => application.status === statusFilter), [applications, statusFilter]);
  const statCounts = useMemo(() => ({
    pending: applications.filter((application) => application.status === "pending").length,
    approved: applications.filter((application) => application.status === "approved").length,
    rejected: applications.filter((application) => application.status === "rejected").length,
  }), [applications]);

  const updateApplicationStatus = async (id: number, status: Exclude<SellerApplicationStatus, "pending">) => {
    const reviewNotes = reviewNotesById[id]?.trim() || "";
    const targetApplication = applications.find((application) => application.id === id) || null;
    if (status === "rejected" && !reviewNotes) { setActionError("Please provide a rejection reason in review notes before rejecting."); setActionSuccess(null); return; }
    setActionError(null); setActionSuccess(null); setUpdatingId(id);
    try {
      const data = await apiFetch(`/api/admin/seller-applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, review_notes: reviewNotes || null }) });
      setApplications((prev) => prev.map((application) => application.id === id ? {
        ...application,
        status,
        review_notes: data?.application?.review_notes ?? data?.review_notes ?? (reviewNotes || null),
        reviewed_at: data?.application?.reviewed_at ?? data?.reviewed_at ?? application.reviewed_at,
        reviewed_by_uid: data?.application?.reviewed_by_uid ?? data?.reviewed_by_uid ?? application.reviewed_by_uid,
        updated_at: data?.application?.updated_at ?? data?.updated_at ?? application.updated_at,
      } : application));
      setActionSuccess(status === "approved" ? "Application approved successfully." : "Application rejected successfully.");
      if (status === "approved" && targetApplication?.applicant_uid) navigateToSellerProfile(targetApplication.applicant_uid);
    } catch (err: any) { setActionError(err?.message || "Failed to update application status."); }
    finally { setUpdatingId(null); }
  };

  const statusBadgeClass = (status: SellerApplicationStatus) => status === "approved" ? "bg-bm-success-bg text-bm-success border border-bm-success/35" : status === "rejected" ? "bg-bm-danger-bg text-bm-danger border border-bm-danger/35" : "bg-bm-warning-bg text-bm-warning border border-bm-warning/35";
  const documentLink = (label: string, url: string | null) => url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-bm-brand hover:underline break-all">View {label}</a> : <span>—</span>;

  return (
    <AdminWorkspaceLayout title="Seller applications" description="Review pending, approved, and rejected seller onboarding requests." onRefresh={() => void fetchApplications()}>
      <div className="space-y-6">
        <header className="buymesho-brand-header sticky top-0 z-40 border-b border-bm-border bg-bm-surface/90 dark:bg-bm-surface/90 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="flex items-center gap-2.5 min-w-0"><div className="w-10 h-10 bg-bm-brand rounded-2xl flex items-center justify-center text-bm-on-brand font-extrabold text-xl shadow-lg shadow-bm-brand/20">B</div><div className="text-left"><p className="text-lg font-extrabold tracking-tight"><span className="text-bm-brand">Buy</span><span className="text-bm-text-muted dark:text-bm-text-muted">Mesho</span></p><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">Seller applications</p></div></button>
            <button type="button" onClick={() => navigateBackOrPath(EXPLORE_PATH)} className="px-4 py-2.5 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface text-sm font-bold hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted items-center gap-2 inline-flex"><ChevronLeft className="w-4 h-4" />Back</button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <section className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-6 sm:p-8 shadow-sm mb-6"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"><div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">Admin</p><h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-bm-text dark:text-bm-text">Review seller applications.</h1><p className="mt-3 max-w-2xl text-sm sm:text-base text-bm-text-muted dark:text-bm-text-muted leading-relaxed font-medium">Review the full seller application, verification documents, participation choices, and marketplace commitments before approval.</p></div><div className="rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-5 py-4 min-w-[220px]"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-bm-text-subtle dark:text-bm-text-subtle">Current filter</p><p className="mt-2 text-2xl font-black tracking-tight text-bm-text dark:text-bm-text capitalize">{statusFilter}</p></div></div></section>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">{(["pending", "approved", "rejected"] as const).map((status) => <div key={status} className="bg-bm-surface rounded-2xl border border-bm-border dark:border-bm-border p-4 shadow-sm"><p className="text-xs font-bold text-bm-text-subtle dark:text-bm-text-subtle uppercase">{status}</p><p className="text-2xl font-extrabold mt-1">{statCounts[status]}</p></div>)}</section>

          <section className="mb-4 flex flex-wrap items-center gap-2 justify-between"><div className="inline-flex bg-bm-surface-muted dark:bg-bm-surface-muted rounded-2xl p-1 gap-1">{FILTERS.map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition ${statusFilter === status ? "bg-bm-surface text-bm-text dark:text-bm-text shadow-sm" : "text-bm-text-subtle dark:text-bm-text-subtle hover:text-bm-text"}`}>{status}</button>)}</div><button type="button" onClick={() => void fetchApplications()} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-bm-border dark:border-bm-border text-sm font-bold hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted disabled:opacity-60 bg-bm-surface">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Refresh</button></section>
          {loadError ? <div className="rounded-xl border border-bm-danger/35 bg-bm-danger-bg px-3 py-2 text-sm text-bm-danger mb-4">{loadError}</div> : null}
          {actionError ? <div className="rounded-xl border border-bm-danger/35 bg-bm-danger-bg px-3 py-2 text-sm text-bm-danger mb-4">{actionError}</div> : null}
          {actionSuccess ? <div className="rounded-xl border border-bm-success/35 bg-bm-success-bg px-3 py-2 text-sm text-bm-success mb-4">{actionSuccess}</div> : null}

          <section className="space-y-4">
            {loading ? <div className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface py-24 flex items-center justify-center text-bm-text-subtle dark:text-bm-text-subtle"><Loader2 className="w-6 h-6 animate-spin" /></div> : filteredApplications.length === 0 ? <div className="bg-bm-surface border border-bm-border dark:border-bm-border rounded-2xl p-8 text-center text-bm-text-subtle dark:text-bm-text-subtle font-medium shadow-sm">No {statusFilter} applications.</div> : filteredApplications.map((application) => (
              <article key={application.id} className="bg-bm-surface border border-bm-border dark:border-bm-border rounded-[2rem] p-5 sm:p-7 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-bm-text-subtle dark:text-bm-text-subtle">Application #{application.id}</p><h2 className="mt-1 text-xl font-black text-bm-text dark:text-bm-text">{application.business_name || application.full_legal_name || "Seller application"}</h2></div><span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusBadgeClass(application.status)}`}>{application.status}</span></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <section className="rounded-2xl border border-bm-border dark:border-bm-border p-4"><div className="flex items-center gap-2 mb-4"><ShieldCheck className="w-4 h-4 text-bm-text-subtle dark:text-bm-text-subtle" /><h3 className="font-extrabold">Applicant</h3></div><dl className="space-y-3 text-sm"><div><dt className="font-bold text-bm-text-subtle dark:text-bm-text-subtle">Seller type</dt><dd className="capitalize">{labelize(application.seller_type)}</dd></div><div><dt className="font-bold text-bm-text-subtle dark:text-bm-text-subtle">Full legal name</dt><dd>{application.full_legal_name || "—"}</dd></div><div><dt className="font-bold text-bm-text-subtle dark:text-bm-text-subtle">Email</dt><dd>{application.applicant_email || "—"}</dd></div><div><dt className="font-bold text-bm-text-subtle dark:text-bm-text-subtle">Phone / WhatsApp</dt><dd>{application.whatsapp_number || "—"}</dd></div><div><dt className="font-bold text-bm-text-subtle dark:text-bm-text-subtle">Seller / business name</dt><dd>{application.business_name || "—"}</dd></div></dl></section>
                  <section className="rounded-2xl border border-bm-border dark:border-bm-border p-4"><h3 className="font-extrabold mb-4">Verification</h3><dl className="space-y-3 text-sm"><div><dt className="font-bold text-bm-text-subtle dark:text-bm-text-subtle">Identity document</dt><dd className="capitalize">{labelize(application.identity_document_type)} · {documentLink("identity document", application.identity_document_url)}</dd></div>{application.seller_type === "student" ? <><div><dt className="font-bold text-bm-text-subtle dark:text-bm-text-subtle">Institution</dt><dd>{application.institution || "—"}</dd></div><div><dt className="font-bold text-bm-text-subtle dark:text-bm-text-subtle">Student number</dt><dd>{application.student_number || "—"}</dd></div><div><dt className="font-bold text-bm-text-subtle dark:text-bm-text-subtle">Student ID</dt><dd>{documentLink("Student ID", application.student_id_document_url)}</dd></div></> : null}{application.seller_type === "business" ? <div><dt className="font-bold text-bm-text-subtle dark:text-bm-text-subtle">Business registration</dt><dd>{documentLink("business registration", application.business_registration_document_url)}</dd></div> : null}</dl></section>
                </div>

                <section className="mt-6 rounded-2xl border border-bm-border dark:border-bm-border p-4"><h3 className="font-extrabold mb-4">Seller profile</h3><dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><div><dt className="font-bold text-bm-text-subtle dark:text-bm-text-subtle">What they sell</dt><dd>{application.what_to_sell || "—"}</dd></div><div><dt className="font-bold text-bm-text-subtle dark:text-bm-text-subtle">Description</dt><dd className="whitespace-pre-wrap">{application.business_description || "—"}</dd></div></dl></section>

                <section className="mt-6 rounded-2xl border border-bm-border dark:border-bm-border p-4"><h3 className="font-extrabold mb-4">Participation choices</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"><div><b>Lay-by:</b> {application.offers_layby ? `Yes${application.layby_audience ? ` · ${labelize(application.layby_audience)}` : ""}` : "No"}</div><div><b>Financing / installments:</b> {application.offers_financing ? "Yes" : "No"}</div><div><b>Delivery:</b> {application.provides_delivery ? "Yes" : "No"}</div><div><b>Deals & promotions:</b> {application.offers_deals ? "Yes" : "No"}</div><div className="md:col-span-2"><b>Student Offer Program:</b> {application.participates_student_offers ? `${application.student_offer_percentage ?? "—"}% · ${application.student_offer_categories.join(", ") || "No categories"}` : "Not participating"}</div></div></section>

                <section className="mt-6 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle p-4 text-sm"><p><b>Rules accepted:</b> {application.agreed_to_rules ? "Yes" : "No"}</p><p className="mt-2 text-bm-text-subtle dark:text-bm-text-subtle">Application submitted {application.created_at ? new Date(application.created_at).toLocaleString() : "—"}.</p></section>

                <section className="mt-6"><label className="block text-sm font-extrabold text-bm-text dark:text-bm-text">Review notes</label><textarea value={reviewNotesById[application.id] || ""} onChange={(e) => setReviewNotesById((prev) => ({ ...prev, [application.id]: e.target.value }))} placeholder="Add notes for the seller or internal review record" className="mt-2 w-full min-h-24 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3 text-sm resize-y" />{application.review_notes ? <p className="mt-2 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Existing review note: {application.review_notes}</p> : null}</section>

                <div className="mt-5 flex flex-wrap items-center gap-2 justify-end">{application.applicant_uid ? <button type="button" onClick={() => navigateToSellerProfile(application.applicant_uid!)} className="px-4 py-2 rounded-xl border border-bm-border dark:border-bm-border text-sm font-bold hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted">View profile</button> : null}{application.status === "pending" ? <><button type="button" onClick={() => updateApplicationStatus(application.id, "rejected")} disabled={updatingId === application.id} className="px-4 py-2 rounded-xl border border-bm-danger/35 text-bm-danger text-sm font-bold hover:brightness-95 disabled:opacity-60">{updatingId === application.id ? "Updating..." : "Reject"}</button><button type="button" onClick={() => updateApplicationStatus(application.id, "approved")} disabled={updatingId === application.id} className="px-4 py-2 rounded-xl bg-bm-success-bg text-bm-success text-sm font-bold hover:brightness-95 disabled:opacity-60">{updatingId === application.id ? "Updating..." : "Approve"}</button></> : null}</div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </AdminWorkspaceLayout>
  );
}
