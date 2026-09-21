import { randomUUID } from "crypto";
import { getPaymentDb } from "../../postgresCompat.js";

export type ServicePaymentType = "graphic_design" | "website_development" | "both";
export type ServicePaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface ServicePaymentRecord {
  id: string;
  serviceType: ServicePaymentType;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  description: string;
  amount: number;
  currency: string;
  status: ServicePaymentStatus;
  paymentId: string | null;
  paymentReference: string | null;
  providerReference: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToRecord(row: Record<string, unknown>): ServicePaymentRecord {
  return {
    id: String(row.id),
    serviceType: row.service_type as ServicePaymentType,
    customerName: String(row.customer_name ?? ""),
    customerPhone: String(row.customer_phone ?? ""),
    customerEmail: row.customer_email ? String(row.customer_email) : null,
    description: String(row.description ?? ""),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "MWK"),
    status: row.status as ServicePaymentStatus,
    paymentId: row.payment_id ? String(row.payment_id) : null,
    paymentReference: row.payment_reference ? String(row.payment_reference) : null,
    providerReference: row.provider_reference ? String(row.provider_reference) : null,
    paidAt: row.paid_at ? String(row.paid_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class ServicePaymentRepository {
  private get db() {
    return getPaymentDb();
  }

  create(input: {
    serviceType: ServicePaymentType;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    description: string;
    amount: number;
    currency: string;
  }): ServicePaymentRecord {
    const now = new Date().toISOString();
    const record: ServicePaymentRecord = {
      id: `svc_${randomUUID()}`,
      serviceType: input.serviceType,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || null,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      status: "pending",
      paymentId: null,
      paymentReference: null,
      providerReference: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.db.prepare(`
      INSERT INTO service_payments (
        id, service_type, customer_name, customer_phone, customer_email,
        description, amount, currency, status, payment_id, payment_reference,
        provider_reference, paid_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.serviceType,
      record.customerName,
      record.customerPhone,
      record.customerEmail,
      record.description,
      record.amount,
      record.currency,
      record.status,
      null,
      null,
      null,
      null,
      record.createdAt,
      record.updatedAt,
    );

    return record;
  }

  findById(id: string): ServicePaymentRecord | undefined {
    const row = this.db.prepare("SELECT * FROM service_payments WHERE id = ? LIMIT 1").get(id) as Record<string, unknown> | undefined;
    return row ? rowToRecord(row) : undefined;
  }

  findByReference(reference: string): ServicePaymentRecord | undefined {
    const row = this.db.prepare("SELECT * FROM service_payments WHERE payment_reference = ? LIMIT 1").get(reference) as Record<string, unknown> | undefined;
    return row ? rowToRecord(row) : undefined;
  }

  attachPayment(input: {
    id: string;
    paymentId: string;
    reference: string;
    providerReference?: string | null;
  }): ServicePaymentRecord | undefined {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE service_payments
      SET payment_id = ?, payment_reference = ?, provider_reference = ?, updated_at = ?
      WHERE id = ?
    `).run(input.paymentId, input.reference, input.providerReference || null, now, input.id);
    return this.findById(input.id);
  }

  markPaid(reference: string, paidAt = new Date().toISOString()): ServicePaymentRecord | undefined {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE service_payments
      SET status = 'paid', paid_at = ?, updated_at = ?
      WHERE payment_reference = ?
    `).run(paidAt, now, reference);
    return this.findByReference(reference);
  }

  markFailedById(id: string): ServicePaymentRecord | undefined {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE service_payments
      SET status = 'failed', updated_at = ?
      WHERE id = ?
    `).run(now, id);
    return this.findById(id);
  }

  markFailed(reference: string): ServicePaymentRecord | undefined {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE service_payments
      SET status = 'failed', updated_at = ?
      WHERE payment_reference = ?
    `).run(now, reference);
    return this.findByReference(reference);
  }

  markRefunded(reference: string): ServicePaymentRecord | undefined {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE service_payments
      SET status = 'refunded', paid_at = NULL, updated_at = ?
      WHERE payment_reference = ?
    `).run(now, reference);
    return this.findByReference(reference);
  }
}

export const servicePaymentRepository = new ServicePaymentRepository();
