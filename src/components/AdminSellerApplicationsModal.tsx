import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { X, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { apiFetch } from "../lib/api";

type SellerApplicationStatus = "pending" | "approved" | "rejected";

type SellerApplicationRow = {
  id: number;
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
};

type Props = {
  onClose: () => void;
};

const FILTERS: SellerApplicationStatus[] = ["pending", "approved", "rejected"];

export default function AdminSellerApplicationsModal({ onClose }: Props) {
  const [applications, setApplications] = useState<SellerApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SellerApplicationStatus>("pending");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/admin/seller-applications");
      const rows = Array.isArray(data) ? data : [];
      setApplications(rows);
    } catch (err: any) {
      alert(err?.message || "Failed to load seller applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const filteredApplications = useMemo(
    () => applications.filter((application) => application.status === statusFilter),
    [applications, statusFilter]
  );

  const updateApplicationStatus = async (
    id: number,
    status: Exclude<SellerApplicationStatus, "pending">
  ) => {
    setUpdatingId(id);
    try {
      await apiFetch(`/api/admin/seller-applications/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setApplications((prev) =>
        prev.map((application) =>
          application.id === id ? { ...application, status } : application
        )
      );
    } catch (err: any) {
      alert(err?.message || "Failed to update application status.");
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
    <div className="fixed inset-0 z-[96] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden h-[92vh] flex flex-col"
      >
        <div className="p-5 sm:p-6 border-b border-zinc-100 flex items-center justify-between flex-shrink-0 bg-white">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900">Seller Applications</h2>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
              Review and process seller onboarding requests
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                <p className="text-xs font-bold text-zinc-400 uppercase">Pending</p>
                <p className="text-2xl font-extrabold text-amber-700 mt-1">{statCounts.pending}</p>
              </div>
              <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                <p className="text-xs font-bold text-zinc-400 uppercase">Approved</p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-1">{statCounts.approved}</p>
              </div>
              <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                <p className="text-xs font-bold text-zinc-400 uppercase">Rejected</p>
                <p className="text-2xl font-extrabold text-red-700 mt-1">{statCounts.rejected}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-between">
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
                onClick={fetchApplications}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold hover:bg-zinc-50 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="py-24 flex items-center justify-center text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 text-center text-zinc-500 font-medium">
                No {statusFilter} applications.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApplications.map((application) => (
                  <div
                    key={application.id}
                    className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p className="text-sm font-bold text-zinc-900">Application #{application.id}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusBadgeClass(application.status)}`}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
