import type { PaymentStatus, StudioAdminPayment } from "../config";

export type AdminCustomer = {
  customerPhone: string;
  customerName: string;
  customerEmail: string | null;
  paymentCount: number;
  paidCount: number;
  paidAmount: number;
  projectCount: number;
  lastActivityAt: string;
};

export type AdminProject = {
  projectReference: string;
  customerName: string;
  customerPhone: string;
  paymentCount: number;
  paidAmount: number;
  lastActivityAt: string;
  latestStatus: PaymentStatus;
};

export type AdminWebhook = {
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

export type AdminSystemStatus = {
  databaseConnected: boolean;
  databaseCheckedAt: string | null;
  paychanguConfigured: boolean;
  webhookSecretConfigured: boolean;
  brevoConfigured: boolean;
  cloudinaryConfigured: boolean;
  notificationEmail: string;
  environment: string;
};

export type AdminSummary = {
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

export type AdminSnapshot = {
  success: boolean;
  summary: AdminSummary;
  payments: StudioAdminPayment[];
  customers: AdminCustomer[];
  projects: AdminProject[];
  notifications: StudioAdminPayment[];
  webhooks: AdminWebhook[];
  system: AdminSystemStatus;
};
