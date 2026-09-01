export type Tone = "zinc" | "emerald" | "amber" | "rose" | "blue";

export type PaymentRow = {
  id: string;
  order_id: string;
  provider: string;
  method: string;
  payment_status: string;
  reference: string;
  provider_reference: string | null;
  currency: string;
  amount: number;
  checkout_url: string | null;
  paid_at: string | null;
  verified: number;
  verification: string | null;
  created_at: string;
  updated_at: string;
  order_status: string | null;
  order_paid_at: string | null;
  order_fulfilled_at: string | null;
  escrow_id: string | null;
  escrow_state: string | null;
  balance_amount: number | null;
  balance_currency: string | null;
  escrow_updated_at: string | null;
  seller_uuid?: string | null;
  seller_id?: string | null;
  ticket_id?: string | null;
  [key: string]: unknown;
};

export type WebhookEventRow = {
  id: number;
  provider: string;
  reference: string | null;
  event_type: string | null;
  signature_valid: number;
  payload: string | null;
  created_at: string;
  [key: string]: unknown;
};

export type SummaryResponse = {
  summary?: {
    total_payments?: number;
    verified_payments?: number;
    paid_payments?: number;
    pending_payments?: number;
  };
  webhookSummary?: {
    total_webhooks?: number;
    valid_webhooks?: number;
    invalid_webhooks?: number;
  };
};

export type PaymentSortMode = "recent" | "verified" | "paid" | "pending";
export type WebhookSortMode = "recent" | "valid" | "invalid";

export function normalizeSearchValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value).trim().toLowerCase();
  }
  try {
    return JSON.stringify(value).toLowerCase();
  } catch {
    return "";
  }
}

function searchableObject(value: unknown): string {
  const normalized = normalizeSearchValue(value);
  if (normalized) return normalized;
  return "";
}

export function parseWebhookPayload(payload: string | null): unknown {
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

export function paymentMatchesSearch(payment: PaymentRow, query: string): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  return Object.entries(payment).some(([key, value]) => {
    if (key === "payload") return false;
    return searchableObject(value).includes(normalizedQuery);
  });
}

export function webhookMatchesSearch(event: WebhookEventRow, query: string): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  const fieldsMatch = [event.id, event.provider, event.reference, event.event_type, event.signature_valid, event.created_at]
    .some((value) => searchableObject(value).includes(normalizedQuery));

  return fieldsMatch || normalizeSearchValue(parseWebhookPayload(event.payload)).includes(normalizedQuery);
}

const toTimestamp = (value: string | null | undefined): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isPaidPayment = (payment: PaymentRow) => ["paid", "captured"].includes(payment.payment_status);
const isPendingPayment = (payment: PaymentRow) => payment.payment_status === "pending";
const isVerifiedPayment = (payment: PaymentRow) => Number(payment.verified) === 1;
const isValidWebhook = (event: WebhookEventRow) => Number(event.signature_valid) === 1;

export function sortPayments(payments: PaymentRow[], mode: PaymentSortMode): PaymentRow[] {
  const ranked = [...payments];
  ranked.sort((left, right) => {
    const leftTime = toTimestamp(left.updated_at);
    const rightTime = toTimestamp(right.updated_at);

    let leftRank = 0;
    let rightRank = 0;
    if (mode === "verified") {
      leftRank = isVerifiedPayment(left) ? 0 : 1;
      rightRank = isVerifiedPayment(right) ? 0 : 1;
    } else if (mode === "paid") {
      leftRank = isPaidPayment(left) ? 0 : 1;
      rightRank = isPaidPayment(right) ? 0 : 1;
    } else if (mode === "pending") {
      leftRank = isPendingPayment(left) ? 0 : 1;
      rightRank = isPendingPayment(right) ? 0 : 1;
    }

    if (leftRank !== rightRank) return leftRank - rightRank;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return String(left.reference ?? "").localeCompare(String(right.reference ?? ""));
  });
  return ranked;
}

export function sortWebhooks(events: WebhookEventRow[], mode: WebhookSortMode): WebhookEventRow[] {
  const ranked = [...events];
  ranked.sort((left, right) => {
    const leftTime = toTimestamp(left.created_at);
    const rightTime = toTimestamp(right.created_at);

    let leftRank = 0;
    let rightRank = 0;
    if (mode === "valid") {
      leftRank = isValidWebhook(left) ? 0 : 1;
      rightRank = isValidWebhook(right) ? 0 : 1;
    } else if (mode === "invalid") {
      leftRank = isValidWebhook(left) ? 1 : 0;
      rightRank = isValidWebhook(right) ? 1 : 0;
    }

    if (leftRank !== rightRank) return leftRank - rightRank;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return left.id - right.id;
  });
  return ranked;
}

export function getPaymentTone(status: string): Tone {
  if (status === "captured" || status === "paid") return "emerald";
  if (status === "pending") return "amber";
  if (status === "failed" || status === "cancelled") return "rose";
  return "zinc";
}

export function getOrderTone(status: string | null): Tone {
  if (!status) return "zinc";
  if (status === "fulfilled") return "emerald";
  if (status === "refunded") return "rose";
  if (["paid", "in_escrow", "pending_payment"].includes(status)) return "blue";
  if (status === "disputed") return "amber";
  return "zinc";
}

export function getEscrowTone(status: string | null): Tone {
  if (!status) return "zinc";
  if (status === "released") return "emerald";
  if (status === "refunded") return "rose";
  if (status === "disputed") return "amber";
  if (["initiated", "funded", "held"].includes(status)) return "blue";
  return "zinc";
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function normalizeStatusLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\bescrow\b/gi, "settlement");
}
