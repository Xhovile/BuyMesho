import {
  Bell,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Server,
  Users,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PaymentStatus, StudioAdminPayment } from "../config";

type ViewKey = "overview" | "payments" | "customers" | "projects" | "notifications" | "webhooks" | "system";

type AdminCustomer = {
  customerPhone: string;
  customerName: string;
  customerEmail: string | null;
  paymentCount: number;
  paidCount: number;
  paidAmount: number;
  projectCount: number;
  lastActivityAt: string;
};

type AdminProject = {
  projectReference: string;
  customerName: string;
  customerPhone: string;
  paymentCount: number;
  paidAmount: number;
  lastActivityAt: string;
  latestStatus: PaymentStatus;
};

type AdminWebhook = {
  id: number;
  providerEventId: string | null;
  paymentReference: string | null;
  eventType: string | null;
  payloadHash: string;
  status: string;
  signatureValid: boolean;
  error: string | null;
  createdAt: string;
  processedAt: string | null;
};

type AdminSnapshot = {
  success: boolean;
  summary: {
    totalPayments: number;
    paidPayments: number;
    pendingPayments: number;
    failedPayments: number;
    refundedPayments: number;
    paidRevenue: number;
    todayPaidPayments: number;
    todayPaidRevenue: number;
    customerCount: number;
    projectCount: number;
    notificationPending: number;
    notificationFailed: number;
    webhookReceived: number;
    webhookFailed: number;
    lastPaymentAt: string | null;
    lastWebhookAt: string | null;
  };
  payments: StudioAdminPayment[];
  customers: AdminCustomer[];
  projects: AdminProject[];
  notifications: StudioAdminPayment[];
  webhooks: AdminWebhook[];
  system: {
    databaseConnected: boolean;
    databaseCheckedAt: string | null;
    paychanguConfigured: boolean;
    webhookSecretConfigured: boolean;
    brevoConfigured: boolean;
    cloudinaryConfigured: boolean;
    notificationEmail: string;
    environment: string;
  };
};

const VIEW_LABELS: Record<ViewKey, string> = {
  overview: "Overview",
  payments: "Payments",
  customers: "Customers",
  projects: "Projects",
  notifications: "Notifications",
  webhooks: "Webhooks",
  system: "System",
};

const NAV_ITEMS: Array<{ key: ViewKey; label: string; description: string; icon: LucideIcon }> = [
  {
    key: "overview",
    label: "Overview",
    description: "Live operating picture for Xhovilé Studio.",
    icon: LayoutDashboard,
  },
  {
    key: "payments",
    label: "Payments",
    description: "Track every Studio checkout and payment status.",
    icon: CreditCard,
  },
  {
    key: "customers",
    label: "Customers",
    description: "See customer activity, spend, and project count.",
    icon: Users,
  },
  {
    key: "projects",
    label: "Projects",
    description: "Follow project references across payments.",
    icon: FolderKanban,
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "Monitor internal payment email delivery.",
    icon: Bell,
  },
  {
    key: "webhooks",
    label: "Webhooks",
    description: "Inspect PayChangu webhook receipt and processing.",
    icon: Webhook,
  },
  {
    key: "system",
    label: "System",
    description: "Check Studio database and integration configuration.",
    icon: Server,
  },
];

