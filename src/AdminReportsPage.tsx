import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronLeft,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { apiFetch } from "./lib/api";
import {
  EXPLORE_PATH,
  HOME_PATH,
  navigateBackOrPath,
  navigateToPath,
  navigateToSellerProfile,
} from "./lib/appNavigation";
import { fetchMessageReports, resolveMessageReport } from "./lib/messageModeration";
import type { MessageReport } from "./types";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";

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

type MainTab = "content" | "chats";
type ContentTab = "listings" | "sellers";
type ContentStatusFilter = "all" | "open" | "reviewed" | "resolved";
type ChatStatusFilter = "open" | "resolved" | "all";

function TabButton({
  active,
  children,
  onClick,
  className = "",
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-xl text-sm font-bold transition",
        active
          ? "bg-zinc-700 text-white shadow-sm shadow-zinc-700/30"
          : "bg-zinc-200 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-300",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
  accent = "zinc",
}: {
  label: string;
  value: string | number;
  accent?: "zinc" | "amber" | "blue" | "emerald" | "red";
}) {
  const accentStyles: Record<"zinc" | "amber" | "blue" | "emerald" | "red", string> = {
    zinc: "text-zinc-900",
    amber: "text-amber-700",
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    red: "text-red-700",
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
      <p className="text-xs font-bold text-zinc-400 uppercase">{label}</p>
      <p className={`text-2xl font-extrabold mt-1 ${accentStyles[accent]}`}>{value}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  icon = "shield",
}: {
  title: string;
  description: string;
  icon?: "shield" | "chat";
}) {
  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm text-center">
      <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
        {icon === "shield" ? (
          <ShieldCheck className="w-8 h-8 text-zinc-300" />
        ) : (
          <ShieldAlert className="w-8 h-8 text-zinc-300" />
        )}
      </div>
      <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
      <p className="text-zinc-500 mt-1">{description}</p>
    </div>
  );
}

function MessageReportCard({
  report,
  onResolve,
  resolving,
}: {
  report: MessageReport;
  onResolve: () => void;
  resolving: boolean;
}) {
  return (
    <div className="border border-zinc-200 rounded-3xl p-4 sm:p-5 bg-white shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-red-50 text-red-700 border border-red-200">
              chat report
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
              {report.status}
            </span>
            <span className="text-xs text-zinc-400 font-bold">#{report.id}</span>
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-zinc-900">{report.reason}</h3>
            <p className="text-sm text-zinc-500 mt-1">
              {new Date(report.created_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-zinc-50 rounded-2xl p-3">
              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Reporter UID</p>
              <p className="text-zinc-800 break-all">{report.reporter_uid}</p>
            </div>
            <div className="bg-zinc-50 rounded-2xl p-3">
              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Reported UID</p>
              <p className="text-zinc-800 break-all">{report.reported_uid || "Unknown"}</p>
            </div>
            <div className="bg-zinc-50 rounded-2xl p-3 md:col-span-2">
              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Conversation</p>
              <p className="text-zinc-800">{report.conversation_id ?? "Unknown conversation"}</p>
            </div>
            {report.message_id ? (
              <div className="bg-zinc-50 rounded-2xl p-3 md:col-span-2">
                <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Message</p>
                <p className="text-zinc-800">Message #{report.message_id}</p>
              </div>
            ) : null}
          </div>

          {report.details ? (
            <div className="bg-zinc-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Details</p>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{report.details}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 min-w-[180px]">
          {report.status !== "resolved" ? (
            <button
              onClick={onResolve}
              disabled={resolving}
              className="px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-sm font-bold disabled:opacity-60"
            >
              {resolving ? "Resolving..." : "Resolve"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ContentReportCard({
  report,
  onUpdateStatus,
  onToggleListingVisibility,
  onToggleSellerSuspension,
  onViewUser,
  busy,
}: {
  report: ReportRow;
  onUpdateStatus: (status: "open" | "reviewed" | "resolved") => void;
  onToggleListingVisibility: () => void;
  onToggleSellerSuspension: () => void;
  onViewUser: () => void;
  busy: boolean;
}) {
  const isListing = report.type === "listing";
  const isSeller = report.type === "problem";
  const targetName = isListing ? report.listing_name || `Listing #${report.listing_id}` : report.seller_business_name || "Unknown seller";

  return (
    <div className="border border-zinc-200 rounded-3xl p-4 sm:p-5 bg-white shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                isListing
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-zinc-100 text-zinc-700 border-zinc-200"
              }`}
            >
              {isListing ? "listing report" : "seller report"}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                report.status === "resolved"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : report.status === "reviewed"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {report.status}
            </span>
            <span className="text-xs text-zinc-400 font-bold">#{report.id}</span>
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-zinc-900">{report.subject || report.reason}</h3>
            <p className="text-sm text-zinc-500 mt-1">
              {new Date(report.created_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-zinc-50 rounded-2xl p-3">
              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Reason</p>
              <p className="text-zinc-800">{report.reason}</p>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-3">
              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Reporter Email</p>
              <p className="text-zinc-800">{report.reporter_email || "Unknown"}</p>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-3 md:col-span-2">
              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Target</p>
              <p className="text-zinc-800">{targetName}</p>
            </div>

            {isListing ? (
              <>
                <div className="bg-zinc-50 rounded-2xl p-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Listing Visibility</p>
                  <p className="text-zinc-800">{report.listing_is_hidden === 1 ? "Hidden" : "Visible"}</p>
                </div>
                <div className="bg-zinc-50 rounded-2xl p-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Seller Status</p>
                  <p className="text-zinc-800">
                    {report.seller_is_suspended === 1 ? "Suspended" : "Active"}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-zinc-50 rounded-2xl p-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Seller Status</p>
                  <p className="text-zinc-800">
                    {report.seller_is_suspended === 1 ? "Suspended" : "Active"}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-2xl p-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Seller ID</p>
                  <p className="text-zinc-800 break-all">{report.seller_uid || "Unknown"}</p>
                </div>
              </>
            )}
          </div>

          {report.details ? (
            <div className="bg-zinc-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Details</p>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{report.details}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 min-w-[180px]">
          <button
            onClick={() => onUpdateStatus("open")}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-bold disabled:opacity-60"
          >
            Open
          </button>
          <button
            onClick={() => onUpdateStatus("reviewed")}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-bold disabled:opacity-60"
          >
            Reviewed
          </button>
          <button
            onClick={() => onUpdateStatus("resolved")}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-sm font-bold disabled:opacity-60"
          >
            Resolved
          </button>

          {isListing ? (
            <button
              onClick={onToggleListingVisibility}
              disabled={busy}
              className={`px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60 ${
                report.listing_is_hidden === 1
                  ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                  : "bg-red-100 hover:bg-red-200 text-red-800"
              }`}
            >
              {report.listing_is_hidden === 1 ? "Unhide Listing" : "Hide Listing"}
            </button>
          ) : (
            <button
              onClick={onToggleSellerSuspension}
              disabled={busy}
              className={`px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60 ${
                report.seller_is_suspended === 1
                  ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                  : "bg-red-100 hover:bg-red-200 text-red-800"
              }`}
            >
              {report.seller_is_suspended === 1 ? "Unsuspend Seller" : "Suspend Seller"}
            </button>
          )}

          <button
            onClick={onViewUser}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-sm font-bold disabled:opacity-60"
          >
            View User
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const [mainTab, setMainTab] = useState<MainTab>("content");
  const [contentTab, setContentTab] = useState<ContentTab>("listings");
  const [contentStatusFilter, setContentStatusFilter] = useState<ContentStatusFilter>("all");
  const [chatStatusFilter, setChatStatusFilter] = useState<ChatStatusFilter>("open");

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [messageReports, setMessageReports] = useState<MessageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [messageUpdatingId, setMessageUpdatingId] = useState<number | null>(null);
  const [enforcingKey, setEnforcingKey] = useState<string | null>(null);

  const fetchContentReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("type", contentTab === "listings" ? "listing" : "problem");
      if (contentStatusFilter !== "all") {
        params.append("status", contentStatusFilter);
      }

      const query = params.toString();
      const data = await apiFetch(`/api/admin/reports${query ? `?${query}` : ""}`);
      setReports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      alert(err?.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  const fetchChatReports = async () => {
    setMessageLoading(true);
    try {
      const items = await fetchMessageReports(chatStatusFilter);
      setMessageReports(items);
    } catch (err: any) {
      alert(err?.message || "Failed to load message reports.");
    } finally {
      setMessageLoading(false);
    }
  };

  useEffect(() => {
    void fetchContentReports();
  }, [contentTab, contentStatusFilter]);

  useEffect(() => {
    void fetchChatReports();
  }, [chatStatusFilter]);

  const updateStatus = async (id: number, status: "open" | "reviewed" | "resolved") => {
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

  const resolveMsgReport = async (id: number) => {
    setMessageUpdatingId(id);
    try {
      await resolveMessageReport(id);
      setMessageReports((prev) => prev.filter((report) => report.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to resolve message report.");
    } finally {
      setMessageUpdatingId(null);
    }
  };

  const toggleListingVisibility = async (listingId: number, shouldHide: boolean) => {
    const key = `listing-${listingId}-${shouldHide ? "hide" : "unhide"}`;
    setEnforcingKey(key);

    try {
      await apiFetch(`/api/admin/listings/${listingId}/${shouldHide ? "hide" : "unhide"}`, {
        method: "POST",
      });

      setReports((prev) =>
        prev.map((report) =>
          report.listing_id === listingId ? { ...report, listing_is_hidden: shouldHide ? 1 : 0 } : report
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
      await apiFetch(`/api/admin/sellers/${sellerUid}/${shouldSuspend ? "suspend" : "unsuspend"}`, {
        method: "POST",
      });

      setReports((prev) =>
        prev.map((report) =>
          report.seller_uid === sellerUid ? { ...report, seller_is_suspended: shouldSuspend ? 1 : 0 } : report
        )
      );
    } catch (err: any) {
      alert(err?.message || `Failed to ${shouldSuspend ? "suspend" : "unsuspend"} seller.`);
    } finally {
      setEnforcingKey(null);
    }
  };

  const contentFiltered = useMemo(() => {
    return reports;
  }, [reports]);

  const contentCounts = useMemo(() => {
    return {
      total: contentFiltered.length,
      open: contentFiltered.filter((r) => r.status === "open").length,
      reviewed: contentFiltered.filter((r) => r.status === "reviewed").length,
      resolved: contentFiltered.filter((r) => r.status === "resolved").length,
      listings: contentFiltered.filter((r) => r.type === "listing").length,
      sellers: contentFiltered.filter((r) => r.type === "problem").length,
    };
  }, [contentFiltered]);

  const chatCounts = useMemo(() => {
    return {
      total: messageReports.length,
      open: messageReports.filter((r) => r.status === "open").length,
      resolved: messageReports.filter((r) => r.status === "resolved").length,
    };
  }, [messageReports]);


  const currentContentTitle = contentTab === "listings" ? "Listings reports" : "Seller reports";
  const currentContentDescription =
    contentTab === "listings"
      ? "Review listing complaints, hide or unhide listings, and close the case when done."
      : "Review seller complaints, suspend or unsuspend sellers, and keep the record clean.";

  return (
    <AdminWorkspaceLayout
      title={mainTab === "content" ? currentContentTitle : "Chat reports queue"}
      description={
        mainTab === "content"
          ? currentContentDescription
          : "Review reported conversations, keep evidence, and resolve abuse without deleting the record."
      }
      onRefresh={() => {
        if (mainTab === "content") {
          void fetchContentReports();
        } else {
          void fetchChatReports();
        }
      }}
    >
      <div className="space-y-6">
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
                Admin moderation
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

      <div className="sticky top-[73px] z-30 bg-zinc-100/95 backdrop-blur border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="inline-flex rounded-2xl bg-zinc-100 p-1 gap-1 shadow-sm">
              <TabButton active={mainTab === "content"} onClick={() => setMainTab("content")}>
                Content
              </TabButton>
              <TabButton active={mainTab === "chats"} onClick={() => setMainTab("chats")}>
                Chats
              </TabButton>
            </div>

            {mainTab === "content" ? (
              <div className="inline-flex rounded-2xl bg-zinc-100 p-1 gap-1 shadow-sm">
                <TabButton
                  active={contentTab === "listings"}
                  onClick={() => setContentTab("listings")}
                >
                  Listings
                </TabButton>
                <TabButton
                  active={contentTab === "sellers"}
                  onClick={() => setContentTab("sellers")}
                >
                  Sellers
                </TabButton>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              if (mainTab === "content") {
                void fetchContentReports();
              } else {
                void fetchChatReports();
              }
            }}
            className="px-4 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                Admin
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
                {mainTab === "content" ? currentContentTitle : "Chat reports queue"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
                {mainTab === "content"
                  ? currentContentDescription
                  : "Review reported conversations, keep evidence, and resolve abuse without deleting the record."}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 min-w-[220px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                Current view
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
                {mainTab === "content"
                  ? contentTab === "listings"
                    ? "Listings"
                    : "Sellers"
                  : "Chats"}
              </p>
            </div>
          </div>
        </section>

        {mainTab === "content" ? (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Total" value={contentCounts.total} />
              <StatCard label="Open" value={contentCounts.open} accent="amber" />
              <StatCard label="Reviewed" value={contentCounts.reviewed} accent="blue" />
              <StatCard label="Resolved" value={contentCounts.resolved} accent="emerald" />
            </section>

            <section className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="inline-flex bg-zinc-100 rounded-2xl p-1 gap-1">
                <TabButton
                  active={contentStatusFilter === "all"}
                  onClick={() => setContentStatusFilter("all")}
                >
                  All
                </TabButton>
                <TabButton
                  active={contentStatusFilter === "open"}
                  onClick={() => setContentStatusFilter("open")}
                >
                  Open
                </TabButton>
                <TabButton
                  active={contentStatusFilter === "reviewed"}
                  onClick={() => setContentStatusFilter("reviewed")}
                >
                  Reviewed
                </TabButton>
                <TabButton
                  active={contentStatusFilter === "resolved"}
                  onClick={() => setContentStatusFilter("resolved")}
                >
                  Resolved
                </TabButton>
              </div>
            </section>

            <section className="mt-6 space-y-4">
              {loading ? (
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
                  <p className="text-zinc-500 font-medium">Loading reports...</p>
                </div>
              ) : contentFiltered.filter((r) =>
                  contentTab === "listings" ? r.type === "listing" : r.type === "problem"
                ).filter((r) =>
                  contentStatusFilter === "all" ? true : r.status === contentStatusFilter
                ).length === 0 ? (
                <EmptyState
                  title="No reports found"
                  description={
                    contentStatusFilter === "resolved"
                      ? "There are no resolved reports matching the current filters."
                      : "There are no reports matching the current filters."
                  }
                />
              ) : (
                contentFiltered
                  .filter((r) =>
                    contentTab === "listings" ? r.type === "listing" : r.type === "problem"
                  )
                  .filter((r) =>
                    contentStatusFilter === "all" ? true : r.status === contentStatusFilter
                  )
                  .map((report) => {
                    const key = report.id;
                    const busy =
                      updatingId === report.id ||
                      enforcingKey === `listing-${report.listing_id}-hide` ||
                      enforcingKey === `listing-${report.listing_id}-unhide` ||
                      enforcingKey === `seller-${report.seller_uid}-suspend` ||
                      enforcingKey === `seller-${report.seller_uid}-unsuspend`;

                    return (
                      <ContentReportCard
                        key={key}
                        report={report}
                        busy={busy}
                        onUpdateStatus={(status) => void updateStatus(report.id, status)}
                        onToggleListingVisibility={() => {
                          if (report.listing_id == null) return;
                          void toggleListingVisibility(report.listing_id, report.listing_is_hidden !== 1);
                        }}
                        onToggleSellerSuspension={() => {
                          if (!report.seller_uid) return;
                          void toggleSellerSuspension(report.seller_uid, report.seller_is_suspended !== 1);
                        }}
                        onViewUser={() => {
                          const uid = report.seller_uid || report.reporter_uid;
                          if (uid) navigateToSellerProfile(uid);
                        }}
                      />
                    );
                  })
              )}
            </section>
          </>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Total" value={chatCounts.total} />
              <StatCard label="Open" value={chatCounts.open} accent="amber" />
              <StatCard label="Resolved" value={chatCounts.resolved} accent="emerald" />
              <StatCard label="Queue" value={chatCounts.open} accent="red" />
            </section>

            <section className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="inline-flex bg-zinc-100 rounded-2xl p-1 gap-1">
                <TabButton active={chatStatusFilter === "open"} onClick={() => setChatStatusFilter("open")}>
                  Open
                </TabButton>
                <TabButton
                  active={chatStatusFilter === "resolved"}
                  onClick={() => setChatStatusFilter("resolved")}
                >
                  Resolved
                </TabButton>
                <TabButton active={chatStatusFilter === "all"} onClick={() => setChatStatusFilter("all")}>
                  All
                </TabButton>
              </div>
            </section>

            <section className="mt-6 space-y-4">
              {messageLoading ? (
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-sm flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
                  <p className="text-zinc-500 font-medium">Loading message reports...</p>
                </div>
              ) : messageReports.length === 0 ? (
                <EmptyState
                  title={chatStatusFilter === "resolved" ? "No resolved chat reports" : "No open message reports"}
                  description={
                    chatStatusFilter === "resolved"
                      ? "There are no resolved chat reports matching the current filter."
                      : "Anything reported from chat will appear here for review."
                  }
                  icon="chat"
                />
              ) : (
                messageReports.map((report) => (
                  <MessageReportCard
                    key={report.id}
                    report={report}
                    resolving={messageUpdatingId === report.id}
                    onResolve={() => void resolveMsgReport(report.id)}
                  />
                ))
              )}
            </section>
          </>
        )}

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
    </AdminWorkspaceLayout>
  );
}
