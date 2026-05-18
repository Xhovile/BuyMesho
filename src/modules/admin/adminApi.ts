import { apiFetch } from "../../lib/api";
import { fetchMessageReports } from "../../lib/messageModeration";
import type {
  AdminActionLog,
  AdminContentReport,
  AdminQueueSummary,
  AdminSellerApplication,
} from "./adminTypes";

export async function fetchOpenContentReports() {
  const data = await apiFetch("/api/admin/reports?status=open");
  return (Array.isArray(data) ? data : []) as AdminContentReport[];
}

export async function fetchPendingSellerApplications() {
  const data = await apiFetch("/api/admin/seller-applications?status=pending");
  return (Array.isArray(data) ? data : []) as AdminSellerApplication[];
}

export async function fetchAdminActionLogs() {
  const data = await apiFetch("/api/admin/actions");
  return (Array.isArray(data) ? data : []) as AdminActionLog[];
}

export async function fetchAdminQueueSummary(): Promise<AdminQueueSummary> {
  const [contentReports, messageReports, sellerApplications] = await Promise.all([
    fetchOpenContentReports(),
    fetchMessageReports("open"),
    fetchPendingSellerApplications(),
  ]);

  return {
    contentOpen: contentReports.length,
    messageOpen: messageReports.length,
    sellerPending: sellerApplications.length,
  };
}
