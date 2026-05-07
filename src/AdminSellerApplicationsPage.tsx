import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { apiFetch } from "./lib/api";
import {
  EXPLORE_PATH,
  HOME_PATH,
  navigateBackOrPath,
  navigateToPath,
  navigateToSellerProfile,
} from "./lib/appNavigation";

type SellerApplicationStatus = "pending" | "approved" | "rejected";

type SellerApplicationRow = {
  id: number;
  applicant_uid: string | null;
  full_legal_name: string | null;
  applicant_email: string | null;
  institution: string | null;
  applicant_type: string | null;
  institution_id_number: string | null;
  whatsapp_number: string | null;
  business_name: string | null;
  what_to_sell: string | null;
  business_description: string | null;
  reason_for_applying: string | null;
  proof_document_url: string | null;
  status: SellerApplicationStatus;
  review_notes: string | null;
  reviewed_at: string | null;
  reviewed_by_uid: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const FILTERS: SellerApplicationStatus[] = ["pending", "approved", "rejected"];

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
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch("/api/admin/seller-applications");
      const rows = Array.isArray(data) ? data : [];
      setApplications(rows);
      setReviewNotesById(
        rows.reduce<Record<number, string>>((acc, row) => {
          acc[row.id] = row.review_notes || "";
          return acc;
        }, {})
      );
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load seller applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchApplications();
  }, []);

  const filteredApplications = useMemo(
    () => applications.filter((application) => application.status === statusFilter),
    [applications, statusFilter]
  );

  const updateApplicationStatus = async (
    id: number,
    status: Exclude<SellerApplicationStatus, "pending">
  ) => {
    const reviewNotes = reviewNotesById[id]?.trim() || "";
    const targetApplication = applications.find((application) => application.id === id) || null;
    if (status === "rejected" && !reviewNotes) {
      setActionError("Please provide a rejection reason in review notes before rejecting.");
      setActionSuccess(null);
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setUpdatingId(id);

    try {
      const data = await apiFetch(`/api/admin/seller-applications/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, review_notes: reviewNotes || null }),
      });

      setApplications((prev) =>
        prev.map((application) =>
          application.id === id
            ? {
                ...application,
                status,
                review_notes:
                  data?.application?.review_notes ?? data?.review_notes ?? (reviewNotes || null),
                reviewed_at:
                  data?.application?.reviewed_at ??
                  data?.reviewed_at ??
                  application.reviewed_at,
                reviewed_by_uid:
                  data?.application?.reviewed_by_uid ??
                  data?.reviewed_by_uid ??
                  application.reviewed_by_uid,
                updated_at:
                  data?.application?.updated_at ?? data?.updated_at ?? application.updated_at,
              }
            : application
        )
      );

      setActionSuccess(
        status === "approved"
          ? "Application approved successfully."
          : "Application rejected successfully."
      );

      if (status === "approved" && targetApplication?.applicant_uid) {
        navigateToSellerProfile(targetApplication.applicant_uid);
      }
    } catch (err: any) {
      setActionError(err?.message || "Failed to update application status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const statusBadgeClass = (status: SellerApplicationStatus) => {
    if (status === "approved") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (status === "rejected") {
      return "bg-red-50 text-red-700 border border-red-200";
    }
    return "bg-amber-50 text-amber-700 border border-amber-200";
  };

  const statCounts = useMemo(
    () => ({
      pending: applications.filter((application) => application.status === "pending").length,
      approved: applications.filter((application) => application.status === "approved").length,
      rejected: applications.filter((application) => application.status === "rejected").length,
    }),
    [applications]
  );

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigateToPath(HOME_PATH)}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20">
              B
            </div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                Seller applications
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50 items-center gap-2 inline-flex"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                Admin
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
                Review seller applications.
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
                This page replaces the old floating seller applications admin modal with a dedicated
                page surface.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 min-w-[220px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                Current filter
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900 capitalize">
                {statusFilter}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
            <p className="text-xs font-bold text-zinc-400 uppercase">Pending</p>
            <p className="text-2xl font-extrabold text-amber-700 mt-1">{statCounts.pending}</p>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
            <p className="text-xs font-bold text-zinc-400 uppercase">Approved</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{statCounts.approved}</p>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
            <p className="text-xs font-bold text-zinc-400 uppercase">Rejected</p>
            <p className="text-2xl font-extrabold text-red-700 mt-1">{statCounts.rejected}</p>
          </div>
        </section>

        <section className="mb-4 flex flex-wrap items-center gap-2 justify-between">
          <div className="inline-flex bg-zinc-100 rounded-2xl p-1 gap-1">
            {FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition ${
                  statusFilter === status
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void fetchApplications()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold hover:bg-zinc-50 disabled:opacity-60 bg-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </section>

        {loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">
            {loadError}
          </div>
        ) : null}

        {actionError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">
            {actionError}
          </div>
        ) : null}

        {actionSuccess ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 mb-4">
            {actionSuccess}
          </div>
        ) : null}

        <section className="space-y-3">
          {loading ? (
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm py-24 flex items-center justify-center text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center text-zinc-500 font-medium shadow-sm">
              No {statusFilter} applications.
            </div>
          ) : (
            filteredApplications.map((application) => (
              <div
                key={application.id}
                className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <p className="text-sm font-bold text-zinc-900">Application #{application.id}</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusBadgeClass(
                      application.status
                    )}`}
                  >
                    {application.status}
                  </span>
                </div>

                <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="font-bold text-zinc-500">Full legal name</dt>
                    <dd className="text-zinc-900">{application.full_legal_name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-zinc-500">Email</dt>
                    <dd className="text-zinc-900">{application.applicant_email || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-zinc-500">Institution</dt>
                    <dd className="text-zinc-900">{application.institution || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-zinc-500">Applicant type</dt>
                    <dd className="text-zinc-900">{application.applicant_type || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-zinc-500">Institution ID number</dt>
                    <dd className="text-zinc-900">{application.institution_id_number || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-zinc-500">WhatsApp number</dt>
                    <dd className="text-zinc-900">{application.whatsapp_number || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-zinc-500">Business name</dt>
                    <dd className="text-zinc-900">{application.business_name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-zinc-500">What to sell</dt>
                    <dd className="text-zinc-900">{application.what_to_sell || "—"}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="font-bold text-zinc-500">Business description</dt>
                    <dd className="text-zinc-900 whitespace-pre-wrap">
                      {application.business_description || "—"}
                    </dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="font-bold text-zinc-500">Reason for applying</dt>
                    <dd className="text-zinc-900 whitespace-pre-wrap">
                      {application.reason_for_applying || "—"}
                    </dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="font-bold text-zinc-500">Proof document URL</dt>
                    <dd className="text-zinc-900 break-all">
                      {application.proof_document_url ? (
                        <a
                          href={application.proof_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {application.proof_document_url}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-zinc-500">Current status</dt>
                    <dd className="text-zinc-900 capitalize">{application.status}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="font-bold text-zinc-500">Review notes</dt>
                    <dd className="mt-1">
                      <textarea
                        value={reviewNotesById[application.id] || ""}
                        onChange={(e) =>
                          setReviewNotesById((prev) => ({
                            ...prev,
                            [application.id]: e.target.value,
                          }))
                        }
                        placeholder="Optional for approval, required for rejection."
                        rows={3}
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-zinc-500">Reviewed at</dt>
                    <dd className="text-zinc-900">
                      {application.reviewed_at
                        ? new Date(application.reviewed_at).toLocaleString()
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-zinc-500">Reviewed by UID</dt>
                    <dd className="text-zinc-900 break-all">{application.reviewed_by_uid || "—"}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateApplicationStatus(application.id, "approved")}
                    disabled={updatingId === application.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {updatingId === application.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    Approve
                  </button>

                  <button
                    type="button"
                    onClick={() => updateApplicationStatus(application.id, "rejected")}
                    disabled={updatingId === application.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60"
                  >
                    {updatingId === application.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    Reject
                  </button>

                  {application.status === "approved" && application.applicant_uid ? (
                    <button
                      type="button"
                      onClick={() => navigateToSellerProfile(application.applicant_uid)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 bg-white text-sm font-bold text-zinc-800 hover:bg-zinc-50"
                    >
                      View seller profile
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </section>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => navigateToPath("/profile")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Profile
          </button>
        </div>
      </main>
    </div>
  );
}
