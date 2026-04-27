import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { apiFetch } from "./lib/api";
import FormDropdown from "./components/FormDropdown";
import {
  EXPLORE_PATH,
  HOME_PATH,
  navigateBackOrPath,
  navigateToPath,
  navigateToSellerProfile,
} from "./lib/appNavigation";

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

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [enforcingKey, setEnforcingKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [reportView, setReportView] = useState<"active" | "resolved">("active");
  const activeStatusFilterOptions = ["All active", "Open", "Reviewed"] as const;
  const typeFilterOptions = ["All types", "Listing", "Problem"] as const;

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
        { method: "POST" }
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
        { method: "POST" }
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
    if (status === "resolved") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (status === "reviewed") return "bg-blue-50 text-blue-700 border border-blue-200";
    return "bg-amber-50 text-amber-700 border border-amber-200";
  };

  const typeBadge = (type: string) => {
    if (type === "problem") return "bg-zinc-100 text-zinc-700";
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
                Admin reports
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
                Review submitted reports.
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
                This page replaces the old floating admin reports modal with a proper page surface.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 min-w-[220px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                Current view
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
                {reportView === "active" ? "Active Reports" : "Resolved Reports"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {reportView === "active" ? (
            <>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-zinc-400 uppercase">Active Total</p>
                <p className="text-2xl font-extrabold text-zinc-900 mt-1">
                  {counts.open + counts.reviewed}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-zinc-400 uppercase">Open</p>
                <p className="text-2xl font-extrabold text-amber-700 mt-1">{counts.open}</p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-zinc-400 uppercase">Reviewed</p>
                <p className="text-2xl font-extrabold text-blue-700 mt-1">{counts.reviewed}</p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-zinc-400 uppercase">Resolved</p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-1">{counts.resolved}</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-zinc-400 uppercase">Resolved Total</p>
                <p className="text-2xl font-extrabold text-zinc-900 mt-1">{counts.resolved}</p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-zinc-400 uppercase">Listing Reports</p>
                <p className="text-2xl font-extrabold text-red-700 mt-1">
                  {reports.filter((r) => r.type === "listing").length}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-zinc-400 uppercase">Problem Reports</p>
                <p className="text-2xl font-extrabold text-zinc-700 mt-1">
                  {reports.filter((r) => r.type === "problem").length}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-zinc-400 uppercase">Archive</p>
                <p className="text-sm font-bold text-zinc-500 mt-2">Resolved only</p>
              </div>
            </>
          )}
        </section>

        <section className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

          <button
            onClick={fetchReports}
            className="px-4 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </section>

        <section className="sticky top-[72px] z-10 bg-zinc-100/95 backdrop-blur pb-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              {reportView === "active" && (
                <div className="sm:min-w-[220px]">
                  <FormDropdown
                    label="Status"
                    value={
                      statusFilter === "open"
                        ? "Open"
                        : statusFilter === "reviewed"
                        ? "Reviewed"
                        : "All active"
                    }
                    options={[...activeStatusFilterOptions]}
                    onChange={(value) =>
                      setStatusFilter(
                        value === "Open" ? "open" : value === "Reviewed" ? "reviewed" : ""
                      )
                    }
                  />
                </div>
              )}

              <div className="sm:min-w-[220px]">
                <FormDropdown
                  label="Type"
                  value={
                    typeFilter === "listing"
                      ? "Listing"
                      : typeFilter === "problem"
                      ? "Problem"
                      : "All types"
                  }
                  options={[...typeFilterOptions]}
                  onChange={(value) =>
                    setTypeFilter(
                      value === "Listing" ? "listing" : value === "Problem" ? "problem" : ""
                    )
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
              <p className="text-zinc-500 font-medium">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
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
                            {report.seller_is_suspended === 1 ? "Seller Suspended" : "Seller Active"}
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
                            <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Listing</p>
                            <p className="text-zinc-800">
                              {report.listing_name || `Listing #${report.listing_id}`}
                            </p>
                          </div>

                          <div className="bg-zinc-50 rounded-2xl p-3">
                            <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Seller</p>
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
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap">{report.details}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-[180px]">
                    {reportView === "active" ? (
                      <>
                        <button
                          onClick={() => updateStatus(report.id, "open")}
                          disabled={updatingId === report.id}
                          className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-bold disabled:opacity-60"
                        >
                          {updatingId === report.id && report.status !== "open" ? "Updating..." : "Mark Open"}
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
                            `listing-${report.listing_id}-${report.listing_is_hidden === 1 ? "unhide" : "hide"}`
                          }
                          className={`px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60 ${
                            report.listing_is_hidden === 1
                              ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                              : "bg-red-100 hover:bg-red-200 text-red-800"
                          }`}
                        >
                          {enforcingKey ===
                          `listing-${report.listing_id}-${report.listing_is_hidden === 1 ? "unhide" : "hide"}`
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
                              `seller-${report.seller_uid}-${report.seller_is_suspended === 1 ? "unsuspend" : "suspend"}`
                            }
                            className={`px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60 ${
                              report.seller_is_suspended === 1
                                ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                                : "bg-red-100 hover:bg-red-200 text-red-800"
                            }`}
                          >
                            {enforcingKey ===
                            `seller-${report.seller_uid}-${report.seller_is_suspended === 1 ? "unsuspend" : "suspend"}`
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
                        onClick={() =>
                          navigateToSellerProfile(
                            (report.type === "listing" ? report.seller_uid : report.reporter_uid)!
                          )
                        }
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
