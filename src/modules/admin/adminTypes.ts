export type AdminContentReport = {
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
};

export type AdminMessageReport = {
  id: number;
  conversation_id: number | null;
  message_id: number | null;
  reporter_uid: string;
  reported_uid: string | null;
  reason: string;
  details: string | null;
  status: "open" | "resolved";
  created_at: string;
};

export type AdminSellerApplication = {
  id: number;
  applicant_uid: string | null;
  applicant_email: string | null;
  full_legal_name: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string | null;
};

import type { AdminActionType, AdminTargetType } from "./shared/adminAuditTypes";

export type AdminActionLog = {
  id: number;
  admin_uid: string | null;
  admin_email: string | null;
  action_type: AdminActionType | string;
  target_type: AdminTargetType | string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type AdminQueueSummary = {
  contentOpen: number;
  messageOpen: number;
  sellerPending: number;
};
