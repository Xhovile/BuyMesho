import { postgresDb } from "../../db.js";
import { ensureMessageSchema } from "../../../src/server/messageSchema.js";
import { initPaymentSchema } from "../../postgresCompat/schema.js";
import { ensurePayoutLifecycleSchema } from "../../modules/payouts/payout.schema.js";
import { backfillEventTickets } from "../../modules/orders/eventTicketProjection.js";
import { ensureEventOwnershipIntegrityMigration } from "./20260819_event_ownership_integrity.js";
import { ensureSellerOrdersIndexesMigration } from "./20260903_seller_orders_indexes.js";
import { ensureRefundDisputeArchitectureMigration } from "./20260904_refund_dispute_architecture.js";
import { ensureDisputeSupportRequestsMigration } from "./20260905_dispute_support_requests.js";
import { ensureDisputeWindowsMigration } from "./20260905_dispute_windows.js";
import { ensureDisputeTimestampCompatibilityMigration } from "./20260908_dispute_timestamp_compatibility.js";
import { ensureDisputeResolutionOwnershipMigration } from "./20260910_dispute_resolution_ownership.js";
import { ensurePayoutDestinationOwnershipMigration } from "./20260915_payout_destination_ownership.js";
import { ensureEventPayoutDestinationBindingMigration } from "./20260915_event_payout_destination_binding.js";

function ensureExtraTables() {
  postgresDb.exec(`
    CREATE TABLE IF NOT EXISTS seller_applications (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, applicant_uid TEXT NOT NULL, applicant_email TEXT, full_legal_name TEXT NOT NULL, institution TEXT NOT NULL, applicant_type TEXT NOT NULL, institution_id_number TEXT NOT NULL, whatsapp_number TEXT, business_name TEXT NOT NULL, what_to_sell TEXT NOT NULL, business_description TEXT NOT NULL, reason_for_applying TEXT NOT NULL, proof_document_url TEXT NOT NULL, agreed_to_rules INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', reviewed_by_uid TEXT, review_notes TEXT, reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS listing_reviews (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, listing_id BIGINT NOT NULL, seller_uid TEXT NOT NULL, reviewer_uid TEXT NOT NULL, reviewer_email TEXT, reviewer_name TEXT NOT NULL, rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), title TEXT, body TEXT, is_verified_purchase INTEGER NOT NULL DEFAULT 0, seller_reply TEXT, seller_reply_at TIMESTAMPTZ, is_hidden INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE (listing_id, reviewer_uid));
    CREATE TABLE IF NOT EXISTS reports (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, type TEXT NOT NULL DEFAULT 'listing', listing_id BIGINT, subject TEXT, reason TEXT NOT NULL, details TEXT, reporter_uid TEXT, reporter_email TEXT, status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS event_creators (uid TEXT PRIMARY KEY, email TEXT NOT NULL, display_name TEXT NOT NULL, organization_name TEXT NOT NULL, organization_type TEXT NOT NULL, contact_whatsapp TEXT, event_types TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'approved', active_until TIMESTAMPTZ, approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS event_creator_applications (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, applicant_uid TEXT NOT NULL, applicant_email TEXT, display_name TEXT NOT NULL, organization_name TEXT NOT NULL, organization_type TEXT NOT NULL, contact_whatsapp TEXT, event_types TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'approved', reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS events (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, creator_uid TEXT, event_type TEXT NOT NULL, event_title TEXT NOT NULL, organizer_name TEXT NOT NULL, organization_type TEXT NOT NULL, contact_whatsapp TEXT, event_types TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'approved', reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
  `);
}
