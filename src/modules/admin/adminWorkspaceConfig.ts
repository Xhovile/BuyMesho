import { ClipboardList, ListChecks, ReceiptText, ShieldCheck, Wallet, Wrench } from "lucide-react";
import type { ComponentType } from "react";
import {
  ADMIN_AUDIT_PATH,
  ADMIN_BALANCE_PATH,
  ADMIN_MODERATION_QUEUE_PATH,
  ADMIN_PATH,
  ADMIN_PAYMENTS_PATH,
  ADMIN_PAYOUT_DESTINATIONS_PATH,
  ADMIN_PAYOUTS_PATH,
  ADMIN_REPORTS_PATH,
  ADMIN_SELLER_APPLICATIONS_PATH,
  ADMIN_SETUP_PATH,
} from "../../lib/appNavigation";

export type AdminWorkspaceIcon = ComponentType<{ className?: string }>;

export type AdminWorkspaceItem = {
  label: string;
  path: string;
  icon: AdminWorkspaceIcon;
  description?: string;
};

export const ADMIN_HUB_ACTIONS: AdminWorkspaceItem[] = [
  {
    label: "Moderation Queue",
    path: ADMIN_MODERATION_QUEUE_PATH,
    icon: ListChecks,
    description: "Review flagged listings and urgent moderation work.",
  },
  {
    label: "Reports",
    path: ADMIN_REPORTS_PATH,
    icon: ClipboardList,
    description: "Handle user reports and compliance issues.",
  },
  {
    label: "Seller Approvals",
    path: ADMIN_SELLER_APPLICATIONS_PATH,
    icon: ShieldCheck,
    description: "Approve or reject seller onboarding requests.",
  },
  {
    label: "Payments & Webhooks",
    path: ADMIN_PAYMENTS_PATH,
    icon: ReceiptText,
    description: "Inspect payment events and webhook activity.",
  },
  {
    label: "Balance",
    path: ADMIN_BALANCE_PATH,
    icon: Wallet,
    description: "Check PayChangu wallet balance before payouts.",
  },
  {
    label: "Payouts",
    path: ADMIN_PAYOUTS_PATH,
    icon: Wallet,
    description: "Review payout requests and settlement activity.",
  },
  {
    label: "Admin Setup",
    path: ADMIN_SETUP_PATH,
    icon: Wrench,
    description: "Manage feature flags, settings, and internal setup.",
  },
];

export const ADMIN_WORKSPACE_NAV_ITEMS: AdminWorkspaceItem[] = [
  {
    label: "Moderation Queue",
    path: ADMIN_MODERATION_QUEUE_PATH,
    icon: ListChecks,
  },
  {
    label: "Reports",
    path: ADMIN_REPORTS_PATH,
    icon: ClipboardList,
  },
  {
    label: "Seller Applications",
    path: ADMIN_SELLER_APPLICATIONS_PATH,
    icon: ShieldCheck,
  },
  {
    label: "Payments",
    path: ADMIN_PAYMENTS_PATH,
    icon: ReceiptText,
  },
  {
    label: "Balance",
    path: ADMIN_BALANCE_PATH,
    icon: Wallet,
  },
  {
    label: "Payouts",
    path: ADMIN_PAYOUTS_PATH,
    icon: Wallet,
  },
  {
    label: "Destination Requests",
    path: ADMIN_PAYOUT_DESTINATIONS_PATH,
    icon: ShieldCheck,
  },
  {
    label: "Audit Log",
    path: ADMIN_AUDIT_PATH,
    icon: ClipboardList,
  },
  {
    label: "Admin Setup",
    path: ADMIN_SETUP_PATH,
    icon: Wrench,
  },
];

export { ADMIN_PATH };
