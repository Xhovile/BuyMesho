export type ServiceType = "graphic_design" | "website_development" | "both";
export type PaymentMode = "deposit" | "full" | "balance";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export {
  GRAPHIC_SERVICES,
  MIN_WEBSITE_PROJECT_TOTAL,
  type GraphicService,
} from "../shared/studioPricing";

export interface ServicePayment {
  id: string;
  serviceType: ServiceType;
  customerName: string;
  customerEmail: string | null;
  description: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentReference: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudioReferenceMedia {
  kind: "image" | "video";
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  publicId: string | null;
  resourceType: "image" | "video" | null;
}

export interface StudioAdminPayment extends ServicePayment {
  customerPhone: string;
  paymentMode: PaymentMode | null;
  projectTotal: number | null;
  projectReference: string | null;
  graphicId: string | null;
  providerReference: string | null;
  referenceMedia: StudioReferenceMedia[];
  successNotificationStatus: "pending" | "sending" | "sent" | "failed";
  successNotificationSentAt: string | null;
  successNotificationError: string | null;
  checkoutUrl: string | null;
  idempotencyKey: string | null;
}

export interface CreateResponse {
  success: boolean;
  reference: string;
  checkoutUrl: string;
  servicePayment: ServicePayment;
}

export type PublicServicePaymentStatus = Omit<
  ServicePayment,
  "customerName" | "customerEmail" | "description"
> & {
  customerName?: string;
  customerEmail?: string | null;
  description?: string;
};

export interface StatusResponse {
  success: boolean;
  servicePayment: PublicServicePaymentStatus | null;
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  graphic_design: "Graphic Design",
  website_development: "Website Development",
  both: "Graphic Design + Web Development",
};

const API_BASE_URL = String(
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_BUYMESHO_API_BASE_URL ?? "",
).replace(/\/$/, "");

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export function formatMoney(amount: number, currency = "MWK") {
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

