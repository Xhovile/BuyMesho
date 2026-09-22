import type {
  PaymentMode,
  PaymentStatus,
  ServiceType,
} from "../config";

type ViewKey = "overview" | "payments" | "customers" | "projects" | "notifications" | "webhooks" | "system";

type AdminPayment = {
  id: string;
  serviceType: ServiceType;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  description: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMode: PaymentMode | null;
  projectTotal: number | null;
  projectReference: string | null;
  graphicId: string | null;
  providerReference: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  successNotificationStatus: "pending" | "sending" | "sent" | "failed";
  successNotificationSentAt: string | null;
  successNotificationError: string | null;
  referenceMedia: Array<{
    kind: "image" | "video";
    url: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
};

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
  payments: AdminPayment[];
  customers: AdminCustomer[];
  projects: AdminProject[];
  notifications: AdminPayment[];
  webhooks: AdminWebhook[];
  system: {
    databaseConnected: boolean;
    databaseCheckedAt: string | null;
    paychanguConfigured: boolean;
    webhookSecretConfigured: boolean;
    brevoConfigured: boolean;
    notificationEmail: string;
    environment: string;
    cloudinaryConfigured: boolean;
  };
};


