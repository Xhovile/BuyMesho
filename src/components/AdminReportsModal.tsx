import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { X, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { apiFetch } from "../lib/api";

type ReportRow = {
  id: number;
  type: "listing" | "problem";
  listing_id: number | null;
  subject: string | null;
  reason: string;
  details: string | null;
  reporter_uid: string | null;
  reporter_email: string | null;
  status: "open" | "reviewed" | "resolved";
  created_at: string;
  listing_name?: string | null;
  listing_category?: string | null;
  listing_university?: string | null;
  listing_is_hidden?: number | null;
  seller_uid?: string | null;
  seller_is_suspended?: number | null;
  seller_business_name?: string | null;
};

type Props = {
  onClose: () => void;
  onOpenUser: (uid: string) => void;
};

export default function AdminReportsModal({ onClose, onOpenUser }: Props) {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [enforcingKey, setEnforcingKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [reportView, setReportView] = useState<"active" | "resolved">("active");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (reportView === "resolved") {
        params.append("status", "resolved");
      } else if (statusFilter) {
        params.append("status", statusFilter);
      }
      if (typeFilter) params.append("type", typeFilter);

      const query = params.toString();
      const data = await apiFetch(`/api/admin/reports${query ? `?${query}` : ""}`);
      setReports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      alert(err?.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, typeFilter, reportView]);

  useEffect(() => {
    if (reportView === "resolved") {
      setStatusFilter("resolved");
    } else if (statusFilter === "resolved") {
      setStatusFilter("");
    }
  }, [reportView]);

  const updateStatus = async (
    id: number,
    status: "open" | "reviewed" | "resolved"
  ) => {
    setUpdatingId(id);
    try {
      await apiFetch(`/api/admin/reports/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setReports((prev) =>
        prev.map((report) => (report.id === id ? { ...report, status } : report))
      );
    } catch (err: any) {
      alert(err?.message || "Failed to update report status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleListingVisibility = async (listingId: number, shouldHide: boolean) => {
    const key = `listing-${listingId}-${shouldHide ? "hide" : "unhide"}`;
    setEnforcingKey(key);

    try {
      await apiFetch(
        `/api/admin/listings/${listingId}/${shouldHide ? "hide" : "unhide"}`,
        {
          method: "POST",
        }
      );

      setReports((prev) =>
        prev.map((report) =>
          report.listing_id === listingId
            ? { ...report, listing_is_hidden: shouldHide ? 1 : 0 }
            : report
        )
      );
    } catch (err: any) {
      alert(err?.message || `Failed to ${shouldHide ? "hide" : "unhide"} listing.`);
    } finally {
      setEnforcingKey(null);
    }
  };

  const toggleSellerSuspension = async (sellerUid: string, shouldSuspend: boolean) => {
    const key = `seller-${sellerUid}-${shouldSuspend ? "suspend" : "unsuspend"}`;
    setEnforcingKey(key);

    try {
      await apiFetch(
        `/api/admin/sellers/${sellerUid}/${shouldSuspend ? "suspend" : "unsuspend"}`,
        {
          method: "POST",
        }
      );

      setReports((prev) =>
        prev.map((report) =>
          report.seller_uid === sellerUid
            ? { ...report, seller_is_suspended: shouldSuspend ? 1 : 0 }
            : report
        )
      );
    } catch (err: any) {
      alert(err?.message || `Failed to ${shouldSuspend ? "suspend" : "unsuspend"} seller.`);
    } finally {
      setEnforcingKey(null);
    }
  };

  const counts = useMemo(() => {
    return {
      total: reports.length,
      open: reports.filter((r) => r.status === "open").length,
      reviewed: reports.filter((r) => r.status === "reviewed").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
    };
  }, [reports]);

  const statusBadge = (status: string) => {
    if (status === "resolved") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (status === "reviewed") {
      return "bg-blue-50 text-blue-700 border border-blue-200";
    }
    return "bg-amber-50 text-amber-700 border border-amber-200";
  };

  const typeBadge = (type: string) => {
    if (type === "problem") {
      return "bg-zinc-100 text-zinc-700";
    }
    return "bg-red-50 text-red-700";
  };

  const listingVisibilityBadge = (hidden?: number | null) =>
    hidden === 1
      ? "bg-red-50 text-red-700 border border-red-200"
      : "bg-emerald-50 text-emerald-700 border border-emerald-200";

  const sellerSuspensionBadge = (suspended?: number | null) =>
    suspended === 1
      ? "bg-red-50 text-red-700 border border-red-200"
      : "bg-emerald-50 text-emerald-700 border border-emerald-200";

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
            <h2 className="text-2xl font-extrabold text-zinc-900">Admin Reports</h2>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
              Review submitted reports
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
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {reportView === "active" ? (
                <>
                  <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase">Active Total</p>
                    <p className="text-2xl font-extrabold text-zinc-900 mt-1">
                      {counts.open + counts.reviewed}
                    </p>
                  </div>

                  <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase">Open</p>
                    <p className="text-2xl font-extrabold text-amber-700 mt-1">{counts.open}</p>
                  </div>

                  <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase">Reviewed</p>
                    <p className="text-2xl font-extrabold text-blue-700 mt-1">{counts.reviewed}</p>
                  </div>

                  <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase">Resolved</p>
                    <p className="text-2xl font-extrabold text-emerald-700 mt-1">{counts.resolved}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase">Resolved Total</p>
                    <p className="text-2xl font-extrabold text-zinc-900 mt-1">{counts.resolved}</p>
                  </div>

                  <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase">Listing Reports</p>
                    <p className="text-2xl font-extrabold text-red-700 mt-1">
                      {reports.filter((r) => r.type === "listing").length}
                    </p>
                  </div>

                  <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase">Problem Reports</p>
                    <p className="text-2xl font-extrabold text-zinc-700 mt-1">
                      {reports.filter((r) => r.type === "problem").length}
                    </p>
                  </div>

                  <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase">Archive</p>
                    <p className="text-sm font-bold text-zinc-500 mt-2">Resolved only</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="px-4 sm:px-5 pb-3">
            <div className="inline-flex bg-zinc-100 rounded-2xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setReportView("active")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                  reportView === "active"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Active Reports
              </button>

              <button
                type="button"
                onClick={() => setReportView("resolved")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                  reportView === "resolved"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Resolved Reports
              </button>
            </div>
          </div>

          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-y border-zinc-100 px-4 sm:px-5 py-2.5">
            <div className="flex flex-col sm:flex-row gap-3">
              {reportView === "active" && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none"
                >
                  <option value="">All active</option>
                  <option value="open">Open</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              )}

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none"
              >
                <option value="">All types</option>
                <option value="listing">Listing</option>
                <option value="problem">Problem</option>
              </select>

              <button
                onClick={fetchReports}
                className="px-4 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
                <p className="text-zinc-500 font-medium">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-zinc-300" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900">No reports found</h3>
                <p className="text-zinc-500">
                  {reportView === "resolved"
                    ? "There are no resolved reports matching the current filters."
                    : "There are no active reports matching the current filters."}
                </p>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="border border-zinc-200 rounded-3xl p-4 sm:p-5 bg-white shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${typeBadge(
                            report.type
                          )}`}
                        >
                          {report.type}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusBadge(
                            report.status
                          )}`}
                        >
                          {report.status}
                        </span>
                        {report.type === "listing" && (
                          <>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${listingVisibilityBadge(
                                report.listing_is_hidden
                              )}`}
                            >
                              {report.listing_is_hidden === 1 ? "Hidden" : "Visible"}
                            </span>

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${sellerSuspensionBadge(
                                report.seller_is_suspended
                              )}`}
                            >
                              {report.seller_is_suspended === 1
                                ? "Seller Suspended"
                                : "Seller Active"}
                            </span>
                          </>
                        )}
                        <span className="text-xs text-zinc-400 font-bold">#{report.id}</span>
                      </div>

                      <div>
                        <h3 className="text-lg font-extrabold text-zinc-900">
                          {report.subject || report.reason}
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1">
                          {new Date(report.created_at).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          •{" "}
                          {new Date(report.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="bg-zinc-50 rounded-2xl p-3">
                          <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Reason</p>
                          <p className="text-zinc-800">{report.reason}</p>
                        </div>

                        <div className="bg-zinc-50 rounded-2xl p-3">
                          <p className="text-xs font-bold text-zinc-400 uppercase mb-1">
                            Reporter Email
                          </p>
                          <p className="text-zinc-800">{report.reporter_email || "Unknown"}</p>
                        </div>

                        {report.type === "listing" && (
                          <>
                            <div className="bg-zinc-50 rounded-2xl p-3">
                              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">
                                Listing
                              </p>
                              <p className="text-zinc-800">
                                {report.listing_name || `Listing #${report.listing_id}`}
                              </p>
                            </div>

                            <div className="bg-zinc-50 rounded-2xl p-3">
                              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">
                                Seller
                              </p>
                              <p className="text-zinc-800">
                                {report.seller_business_name || "Unknown seller"}
                              </p>
                            </div>

                            <div className="bg-zinc-50 rounded-2xl p-3">
                              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">
                                Listing Visibility
                              </p>
                              <p className="text-zinc-800">
                                {report.listing_is_hidden === 1 ? "Hidden" : "Visible"}
                              </p>
                            </div>

                            <div className="bg-zinc-50 rounded-2xl p-3">
                              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">
                                Seller Status
                              </p>
                              <p className="text-zinc-800">
                                {report.seller_is_suspended === 1 ? "Suspended" : "Active"}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {report.details && (
                        <div className="bg-zinc-50 rounded-2xl p-4">
                          <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Details</p>
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                            {report.details}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[160px]">
                      {reportView === "active" ? (
                        <>
                          <button
                            onClick={() => updateStatus(report.id, "open")}
                            disabled={updatingId === report.id}
                            className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-bold disabled:opacity-60"
                          >
                            {updatingId === report.id && report.status !== "open"
                              ? "Updating..."
                              : "Mark Open"}
                          </button>

                          <button
                            onClick={() => updateStatus(report.id, "reviewed")}
                            disabled={updatingId === report.id}
                            className="px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-bold disabled:opacity-60"
                          >
                            {updatingId === report.id && report.status !== "reviewed"
                              ? "Updating..."
                              : "Mark Reviewed"}
                          </button>

                          <button
                            onClick={() => updateStatus(report.id, "resolved")}
                            disabled={updatingId === report.id}
                            className="px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-sm font-bold disabled:opacity-60"
                          >
                            {updatingId === report.id && report.status !== "resolved"
                              ? "Updating..."
                              : "Mark Resolved"}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => updateStatus(report.id, "open")}
                            disabled={updatingId === report.id}
                            className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-bold disabled:opacity-60"
                          >
                            {updatingId === report.id ? "Updating..." : "Reopen"}
                          </button>

                          <button
                            onClick={() => updateStatus(report.id, "reviewed")}
                            disabled={updatingId === report.id}
                            className="px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-bold disabled:opacity-60"
                          >
                            {updatingId === report.id ? "Updating..." : "Move to Reviewed"}
                          </button>
                        </>
                      )}
                      {report.type === "listing" && report.listing_id && (
                        <>
                          <button
                            onClick={() =>
                              toggleListingVisibility(
                                report.listing_id!,
                                report.listing_is_hidden !== 1
                              )
                            }
                            disabled={
                              enforcingKey ===
                              `listing-${report.listing_id}-${
                                report.listing_is_hidden === 1 ? "unhide" : "hide"
                              }`
                            }
                            className={`px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60 ${
                              report.listing_is_hidden === 1
                                ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                                : "bg-red-100 hover:bg-red-200 text-red-800"
                            }`}
                          >
                            {enforcingKey ===
                            `listing-${report.listing_id}-${
                              report.listing_is_hidden === 1 ? "unhide" : "hide"
                            }`
                              ? "Updating..."
                              : report.listing_is_hidden === 1
                              ? "Unhide Listing"
                              : "Hide Listing"}
                          </button>

                          {report.seller_uid && (
                            <button
                              onClick={() =>
                                toggleSellerSuspension(
                                  report.seller_uid!,
                                  report.seller_is_suspended !== 1
                                )
                              }
                              disabled={
                                enforcingKey ===
                                `seller-${report.seller_uid}-${
                                  report.seller_is_suspended === 1
                                    ? "unsuspend"
                                    : "suspend"
                                }`
                              }
                              className={`px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60 ${
                                report.seller_is_suspended === 1
                                  ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                                  : "bg-red-100 hover:bg-red-200 text-red-800"
                              }`}
                            >
                              {enforcingKey ===
                              `seller-${report.seller_uid}-${
                                report.seller_is_suspended === 1
                                  ? "unsuspend"
                                  : "suspend"
                              }`
                                ? "Updating..."
                                : report.seller_is_suspended === 1
                                ? "Unsuspend Seller"
                                : "Suspend Seller"}
                            </button>
                          )}
                        </>
                      )}
                      {(report.seller_uid || report.reporter_uid) && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenUser(
                              (report.type === "listing"
                                ? report.seller_uid
                                : report.reporter_uid)!
                            );
                          }}
                          className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-sm font-bold"
                        >
                          View User
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
 }
