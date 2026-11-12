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
          ? "bg-bm-brand text-bm-on-brand shadow-sm shadow-bm-brand/20"
          : "bg-bm-surface-raised dark:bg-bm-skeleton text-bm-text-muted dark:text-bm-text-muted hover:text-bm-text hover:bg-bm-surface-muted",
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
    zinc: "text-bm-text dark:text-bm-text",
    amber: "text-bm-warning",
    blue: "text-bm-text-muted",
    emerald: "text-bm-success",
    red: "text-bm-danger",
  };

  return (
    <div className="bg-bm-surface rounded-2xl border border-bm-border dark:border-bm-border p-4 shadow-sm">
      <p className="text-xs font-bold text-bm-text-subtle uppercase">{label}</p>
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
    <div className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-10 shadow-sm text-center">
      <div className="w-20 h-20 bg-bm-surface-muted dark:bg-bm-surface-muted rounded-full flex items-center justify-center mx-auto mb-4">
        {icon === "shield" ? (
          <ShieldCheck className="w-8 h-8 text-bm-text-subtle" />
        ) : (
          <ShieldAlert className="w-8 h-8 text-bm-text-subtle" />
        )}
      </div>
      <h3 className="text-lg font-bold text-bm-text dark:text-bm-text">{title}</h3>
      <p className="text-bm-text-subtle dark:text-bm-text-subtle mt-1">{description}</p>
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
  const buyerLabel = report.buyer_business_name || report.buyer_uid || "Unknown buyer";
  const sellerLabel = report.seller_business_name || report.seller_uid || "Unknown seller";
  const listingLabel = report.listing_name || "Unknown listing";

  return (
    <div className="border border-bm-border dark:border-bm-border rounded-3xl p-4 sm:p-5 bg-bm-surface shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-bm-danger-bg text-bm-danger border border-bm-danger/35">
              chat report
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-bm-warning-bg text-bm-warning border border-bm-warning/35">
              {report.status}
            </span>
            <span className="text-xs text-bm-text-subtle font-bold">#{report.id}</span>
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-bm-text dark:text-bm-text">{report.reason}</h3>
            <p className="text-sm text-bm-text-subtle dark:text-bm-text-subtle mt-1">
              {new Date(report.created_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3">
              <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Reporter UID</p>
              <p className="text-bm-text dark:text-bm-text-muted break-all">{report.reporter_uid}</p>
            </div>
            <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3">
              <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Reported UID</p>
              <p className="text-bm-text dark:text-bm-text-muted break-all">{report.reported_uid || "Unknown"}</p>
            </div>
            <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3 md:col-span-2">
              <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Conversation</p>
              <p className="text-bm-text dark:text-bm-text-muted">{report.conversation_id ?? "Unknown conversation"}</p>
            </div>
            <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3">
              <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Buyer</p>
              <p className="text-bm-text dark:text-bm-text-muted break-all">{buyerLabel}</p>
            </div>
            <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3">
              <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Seller</p>
              <p className="text-bm-text dark:text-bm-text-muted break-all">{sellerLabel}</p>
            </div>
            <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3 md:col-span-2">
              <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Listing</p>
              <p className="text-bm-text dark:text-bm-text-muted">{listingLabel}</p>
            </div>
            {report.message_id ? (
              <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3 md:col-span-2">
                <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Message</p>
                <p className="text-bm-text dark:text-bm-text-muted">Message #{report.message_id}</p>
              </div>
            ) : null}
            {report.message_body ? (
              <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3 md:col-span-2">
                <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Reported Message</p>
                <p className="text-bm-text dark:text-bm-text-muted whitespace-pre-wrap break-words">{report.message_body}</p>
              </div>
            ) : null}
          </div>

          {report.details ? (
            <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-4">
              <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Details</p>
              <p className="text-sm text-bm-text-muted dark:text-bm-text-muted whitespace-pre-wrap">{report.details}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 min-w-[180px]">
          {report.conversation_id != null ? (
            <button
              type="button"
              onClick={() => navigateToPath(`/admin/messages?conversation=${report.conversation_id}`)}
              className="px-4 py-2 rounded-xl bg-bm-brand hover:bg-bm-brand-hover text-bm-on-brand text-sm font-bold"
            >
              Open Conversation
            </button>
          ) : null}

          {report.status !== "resolved" ? (
            <button
              onClick={onResolve}
              disabled={resolving}
              className="px-4 py-2 rounded-xl bg-bm-success-bg hover:brightness-95 text-bm-success text-sm font-bold disabled:opacity-60"
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
    <div className="border border-bm-border dark:border-bm-border rounded-3xl p-4 sm:p-5 bg-bm-surface shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                isListing
                  ? "bg-bm-danger-bg text-bm-danger border-bm-danger/35"
                  : "bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text-muted dark:text-bm-text-muted border-bm-border dark:border-bm-border"
              }`}
            >
              {isListing ? "listing report" : "seller report"}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                report.status === "resolved"
                  ? "bg-bm-success-bg text-bm-success border-bm-success/35"
                  : report.status === "reviewed"
                  ? "bg-bm-surface-muted text-bm-text-muted border-bm-border"
                  : "bg-bm-warning-bg text-bm-warning border-bm-warning/35"
              }`}
            >
              {report.status}
            </span>
            <span className="text-xs text-bm-text-subtle font-bold">#{report.id}</span>
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-bm-text dark:text-bm-text">{report.subject || report.reason}</h3>
            <p className="text-sm text-bm-text-subtle dark:text-bm-text-subtle mt-1">
              {new Date(report.created_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3">
              <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Reason</p>
              <p className="text-bm-text dark:text-bm-text-muted">{report.reason}</p>
            </div>

            <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3">
              <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Reporter Email</p>
              <p className="text-bm-text dark:text-bm-text-muted">{report.reporter_email || "Unknown"}</p>
            </div>

            <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3 md:col-span-2">
              <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Target</p>
              <p className="text-bm-text dark:text-bm-text-muted">{targetName}</p>
            </div>

            {isListing ? (
              <>
                <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3">
                  <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Listing Visibility</p>
                  <p className="text-bm-text dark:text-bm-text-muted">{report.listing_is_hidden === 1 ? "Hidden" : "Visible"}</p>
                </div>
                <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3">
                  <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Seller Status</p>
                  <p className="text-bm-text dark:text-bm-text-muted">
                    {report.seller_is_suspended === 1 ? "Suspended" : "Active"}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3">
                  <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Seller Status</p>
                  <p className="text-bm-text dark:text-bm-text-muted">
                    {report.seller_is_suspended === 1 ? "Suspended" : "Active"}
                  </p>
                </div>
                <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-3">
                  <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Seller ID</p>
                  <p className="text-bm-text dark:text-bm-text-muted break-all">{report.seller_uid || "Unknown"}</p>
                </div>
              </>
            )}
          </div>

          {report.details ? (
            <div className="bg-bm-surface-muted dark:bg-bm-surface-subtle rounded-2xl p-4">
              <p className="text-xs font-bold text-bm-text-subtle uppercase mb-1">Details</p>
              <p className="text-sm text-bm-text-muted dark:text-bm-text-muted whitespace-pre-wrap">{report.details}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 min-w-[180px]">
          <button
            onClick={() => onUpdateStatus("open")}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-bm-warning-bg hover:brightness-95 text-bm-warning text-sm font-bold disabled:opacity-60"
          >
            Open
          </button>
          <button
            onClick={() => onUpdateStatus("reviewed")}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-bm-surface-muted hover:brightness-95 text-bm-text-muted text-sm font-bold disabled:opacity-60"
          >
            Reviewed
          </button>
          <button
            onClick={() => onUpdateStatus("resolved")}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-bm-success-bg hover:brightness-95 text-bm-success text-sm font-bold disabled:opacity-60"
          >
            Resolved
          </button>

          {isListing ? (
            <button
              onClick={onToggleListingVisibility}
              disabled={busy}
              className={`px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60 ${
                report.listing_is_hidden === 1
                  ? "bg-bm-success-bg hover:brightness-95 text-bm-success"
                  : "bg-bm-danger-bg hover:brightness-95 text-bm-danger"
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
                  ? "bg-bm-success-bg hover:brightness-95 text-bm-success"
                  : "bg-bm-danger-bg hover:brightness-95 text-bm-danger"
              }`}
            >
              {report.seller_is_suspended === 1 ? "Unsuspend Seller" : "Suspend Seller"}
            </button>
          )}

          <button
            onClick={onViewUser}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-bm-surface-muted dark:bg-bm-surface-muted hover:bg-bm-surface-raised text-bm-text dark:text-bm-text-muted text-sm font-bold disabled:opacity-60"
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
      <header className="buymesho-brand-header sticky top-0 z-40 border-b border-bm-border/80 bg-bm-surface/90 dark:bg-bm-surface/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigateToPath(HOME_PATH)}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-10 h-10 bg-bm-brand rounded-2xl flex items-center justify-center text-bm-on-brand font-extrabold text-xl shadow-lg shadow-bm-brand/20">
              B
            </div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight">
                <span className="text-bm-brand">Buy</span>
                <span className="text-bm-text-muted dark:text-bm-text-muted">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-bm-text-subtle">
                Admin moderation
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="px-4 py-2.5 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface text-sm font-bold hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted items-center gap-2 inline-flex"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      <div className="sticky top-[73px] z-30 bg-bm-surface-muted/95 backdrop-blur border-b border-bm-border dark:border-bm-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="inline-flex rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-muted p-1 gap-1 shadow-sm">
              <TabButton active={mainTab === "content"} onClick={() => setMainTab("content")}>
                Content
              </TabButton>
              <TabButton active={mainTab === "chats"} onClick={() => setMainTab("chats")}>
                Chats
              </TabButton>
            </div>

            {mainTab === "content" ? (
              <div className="inline-flex rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-muted p-1 gap-1 shadow-sm">
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
            className="px-4 py-3 bg-bm-brand text-bm-on-brand rounded-xl font-bold hover:bg-bm-brand-hover transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <section className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle">
                Admin
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-bm-text dark:text-bm-text">
                {mainTab === "content" ? currentContentTitle : "Chat reports queue"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-bm-text-muted dark:text-bm-text-muted leading-relaxed font-medium">
                {mainTab === "content"
                  ? currentContentDescription
                  : "Review reported conversations, keep evidence, and resolve abuse without deleting the record."}
              </p>
            </div>

            <div className="rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-5 py-4 min-w-[220px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-bm-text-subtle">
                Current view
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">
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
              <div className="inline-flex bg-bm-surface-muted dark:bg-bm-surface-muted rounded-2xl p-1 gap-1">
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
                <div className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-10 shadow-sm flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 text-bm-text-muted dark:text-bm-text-muted animate-spin" />
                  <p className="text-bm-text-subtle dark:text-bm-text-subtle font-medium">Loading reports...</p>
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
              <div className="inline-flex bg-bm-surface-muted dark:bg-bm-surface-muted rounded-2xl p-1 gap-1">
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
                <div className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-10 shadow-sm flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 text-bm-text-muted dark:text-bm-text-muted animate-spin" />
                  <p className="text-bm-text-subtle dark:text-bm-text-subtle font-medium">Loading message reports...</p>
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-bm-border dark:border-bm-border bg-bm-surface text-sm font-bold hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
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
