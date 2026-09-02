import type { Express } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { hasAdminAccess } from "../auth/adminAccess.js";

export type SellerApplicationRouteDeps = { db: any };
type SellerApplicationStatus = "pending" | "approved" | "rejected";
type SellerType = "student" | "public" | "business";
type IdentityDocumentType = "national_id" | "passport";
type LaybyAudience = "students" | "everyone";

function normalizeStudentOfferCategories(value: unknown): string[] {
  let parsedValue = value;

  if (typeof parsedValue === "string") {
    try {
      parsedValue = JSON.parse(parsedValue);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsedValue)) return [];

  return parsedValue
    .filter((category: unknown): category is string => typeof category === "string")
    .map((category: string) => category.trim())
    .filter((category: string) => category.length > 0);
}

function normalizeSellerApplication(row: any) {
  if (!row) return null;
  const studentOfferCategories = normalizeStudentOfferCategories(row.student_offer_categories);

  return {
    id: row.id ?? null,
    applicant_uid: row.applicant_uid ?? null,
    applicant_email: row.applicant_email ?? null,
    full_legal_name: row.full_legal_name ?? null,
    seller_type: row.seller_type ?? row.applicant_type ?? null,
    institution: row.institution ?? null,
    student_number: row.student_number ?? null,
    whatsapp_number: row.whatsapp_number ?? null,
    business_name: row.business_name ?? null,
    what_to_sell: row.what_to_sell ?? null,
    business_description: row.business_description ?? null,
    identity_document_type: row.identity_document_type ?? null,
    identity_document_url: row.identity_document_url ?? null,
    student_id_document_url: row.student_id_document_url ?? null,
    business_registration_document_url: row.business_registration_document_url ?? null,
    offers_layby: !!row.offers_layby,
    layby_audience: row.layby_audience ?? null,
    offers_financing: !!row.offers_financing,
    provides_delivery: !!row.provides_delivery,
    offers_deals: !!row.offers_deals,
    participates_student_offers: !!row.participates_student_offers,
    student_offer_categories: studentOfferCategories,
    student_offer_percentage: row.student_offer_percentage ?? null,
    agreed_to_rules: !!row.agreed_to_rules,
    status: (row.status ?? "pending") as SellerApplicationStatus,
    reviewed_at: row.reviewed_at ?? null,
    review_notes: row.review_notes ?? null,
    reviewed_by_uid: row.reviewed_by_uid ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function ensureSellerApplicationSchema(db: any) {
  db.exec(`
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS seller_type TEXT;
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS student_number TEXT;
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS identity_document_type TEXT;
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS identity_document_url TEXT;
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS student_id_document_url TEXT;
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS business_registration_document_url TEXT;
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS offers_layby INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS layby_audience TEXT;
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS offers_financing INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS provides_delivery INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS offers_deals INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS participates_student_offers INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS student_offer_categories TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS student_offer_percentage INTEGER;
    UPDATE seller_applications SET seller_type = applicant_type WHERE seller_type IS NULL;
  `);
}

function isApplicationPayload(body: any) {
  return typeof body?.full_legal_name === "string" || typeof body?.seller_type === "string" || typeof body?.identity_document_url === "string";
}

const STUDENT_OFFER_CATEGORIES = new Set<string>([
  "Phones & Accessories",
  "Laptops",
  "Stationery",
  "Clothes",
  "Accommodation",
  "Food",
  "Transport",
  "Printing",
  "Internet / Data",
  "Beauty Services",
  "Electronics",
  "Agricultural Products",
  "Financial Services",
]);

export function registerSellerApplicationRoutes(app: Express, deps: SellerApplicationRouteDeps) {
  const { db } = deps;
  ensureSellerApplicationSchema(db);

  app.get("/api/profile/seller-application", requireAuth, (req, res) => {
    const uid = req.user!.uid;
    try {
      const row = db.prepare(`SELECT * FROM seller_applications WHERE applicant_uid = ? ORDER BY id DESC LIMIT 1`).get(uid);
      return res.json(row ? normalizeSellerApplication(row) : null);
    } catch (error) {
      console.error("Failed to load seller application", error);
      return res.status(500).json({ error: "Failed to load seller application" });
    }
  });

  app.get("/api/admin/seller-applications", requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) return res.status(403).json({ error: "Forbidden: admin access required" });
    try {
      const rows = db.prepare(`SELECT * FROM seller_applications ORDER BY created_at DESC`).all();
      return res.json(rows.map(normalizeSellerApplication));
    } catch (error) {
      console.error("Admin seller applications fetch error", error);
      return res.status(500).json({ error: "Failed to load seller applications" });
    }
  });

  app.post("/api/profile/become-seller", requireAuth, async (req, res) => {
    const uid = req.user!.uid;
    const email = req.user?.email || req.body?.email || "";
    try {
      if (!isApplicationPayload(req.body)) {
        return res.status(410).json({ error: "Direct seller activation is no longer available. Please submit a seller application." });
      }

      const sellerType = typeof req.body?.seller_type === "string" ? req.body.seller_type.trim() as SellerType : "";
      const fullLegalName = typeof req.body?.full_legal_name === "string" ? req.body.full_legal_name.trim() : "";
      const institution = typeof req.body?.institution === "string" ? req.body.institution.trim() : "";
      const studentNumber = typeof req.body?.student_number === "string" ? req.body.student_number.trim() : "";
      const whatsappNumber = typeof req.body?.whatsapp_number === "string" ? req.body.whatsapp_number.trim() : "";
      const businessName = typeof req.body?.business_name === "string" ? req.body.business_name.trim() : "";
      const whatToSell = typeof req.body?.what_to_sell === "string" ? req.body.what_to_sell.trim() : "";
      const businessDescription = typeof req.body?.business_description === "string" ? req.body.business_description.trim() : "";
      const identityDocumentType = typeof req.body?.identity_document_type === "string" ? req.body.identity_document_type.trim() as IdentityDocumentType : "";
      const identityDocumentUrl = typeof req.body?.identity_document_url === "string" ? req.body.identity_document_url.trim() : "";
      const studentIdDocumentUrl = typeof req.body?.student_id_document_url === "string" ? req.body.student_id_document_url.trim() : "";
      const businessRegistrationDocumentUrl = typeof req.body?.business_registration_document_url === "string" ? req.body.business_registration_document_url.trim() : "";
      const offersLayby = req.body?.offers_layby === true;
      const laybyAudience = typeof req.body?.layby_audience === "string" ? req.body.layby_audience.trim() as LaybyAudience : null;
      const offersFinancing = req.body?.offers_financing === true;
      const providesDelivery = req.body?.provides_delivery === true;
      const offersDeals = req.body?.offers_deals === true;
      const participatesStudentOffers = req.body?.participates_student_offers === true;
      const studentOfferCategories: string[] = Array.isArray(req.body?.student_offer_categories)
        ? [...new Set(req.body.student_offer_categories.filter((value: unknown): value is string => typeof value === "string").map((value: string) => value.trim()).filter((value: string) => value.length > 0))]
        : [];
      const studentOfferPercentage = Number(req.body?.student_offer_percentage);
      const agreedToRules = req.body?.agreed_to_rules === true || req.body?.agreed_to_rules === 1 || req.body?.agreed_to_rules === "1";

      if (!["student", "public", "business"].includes(sellerType)) return res.status(400).json({ error: "Please select a valid seller type." });
      if (!fullLegalName) return res.status(400).json({ error: "Full legal name is required." });
      if (!whatsappNumber) return res.status(400).json({ error: "Phone / WhatsApp number is required." });
      if (!businessName) return res.status(400).json({ error: "Seller / business name is required." });
      if (!whatToSell) return res.status(400).json({ error: "Please state what products or services you sell." });
      if (!businessDescription) return res.status(400).json({ error: "A brief description of your products or services is required." });
      if (!["national_id", "passport"].includes(identityDocumentType)) return res.status(400).json({ error: "Please select National ID or Passport." });
      if (!identityDocumentUrl) return res.status(400).json({ error: "National ID or Passport is required." });
      if (sellerType === "student" && (!institution || !studentNumber || !studentIdDocumentUrl)) return res.status(400).json({ error: "Student sellers must provide institution, student number, and Student ID." });
      if (sellerType === "business" && !businessRegistrationDocumentUrl) return res.status(400).json({ error: "Business applicants must provide proof of business registration." });
      if (offersLayby && laybyAudience && !["students", "everyone"].includes(laybyAudience)) return res.status(400).json({ error: "Please select who can use your lay-by service." });
      if (participatesStudentOffers && studentOfferCategories.length < 2) return res.status(400).json({ error: "Select at least two student-related categories for the Student Offer Program." });
      if (participatesStudentOffers && studentOfferCategories.some((category: string) => !STUDENT_OFFER_CATEGORIES.has(category))) return res.status(400).json({ error: "One or more Student Offer categories are invalid." });
      if (participatesStudentOffers && (![5, 10, 15, 20, 25].includes(studentOfferPercentage))) return res.status(400).json({ error: "Select a supported Student Offer percentage." });
      if (!agreedToRules) return res.status(400).json({ error: "You must agree to the seller rules before submitting." });

      db.prepare(`
        INSERT INTO sellers (uid, email, business_name, university, bio, is_verified, is_seller)
        VALUES (?, ?, ?, ?, ?, ?, 0)
        ON CONFLICT(uid) DO UPDATE SET
          email = excluded.email,
          business_name = COALESCE(excluded.business_name, sellers.business_name),
          university = CASE WHEN excluded.university IS NULL OR excluded.university = '' THEN sellers.university ELSE excluded.university END,
          bio = COALESCE(excluded.bio, sellers.bio),
          is_verified = CASE WHEN excluded.is_verified = 1 THEN 1 ELSE sellers.is_verified END
      `).run(uid, email, businessName, institution || null, businessDescription, req.user?.email_verified ? 1 : 0);

      db.prepare(`
        INSERT INTO seller_applications (
          applicant_uid, applicant_email, full_legal_name, institution, applicant_type,
          institution_id_number, whatsapp_number, business_name, what_to_sell, business_description,
          reason_for_applying, proof_document_url, agreed_to_rules, status, reviewed_at, updated_at,
          seller_type, student_number, identity_document_type, identity_document_url,
          student_id_document_url, business_registration_document_url, offers_layby,
          layby_audience, offers_financing, provides_delivery, offers_deals,
          participates_student_offers, student_offer_categories, student_offer_percentage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, 'pending', NULL, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uid, email, fullLegalName, institution || '', sellerType, studentNumber || '', whatsappNumber,
        businessName, whatToSell, businessDescription, identityDocumentUrl, agreedToRules ? 1 : 0,
        sellerType, studentNumber || null, identityDocumentType, identityDocumentUrl,
        studentIdDocumentUrl || null, businessRegistrationDocumentUrl || null,
        offersLayby ? 1 : 0, offersLayby ? laybyAudience : null, offersFinancing ? 1 : 0,
        providesDelivery ? 1 : 0, offersDeals ? 1 : 0, participatesStudentOffers ? 1 : 0,
        JSON.stringify(participatesStudentOffers ? studentOfferCategories : []),
        participatesStudentOffers ? studentOfferPercentage : null,
      );

      const applicationRow = db.prepare(`SELECT * FROM seller_applications WHERE applicant_uid = ? ORDER BY id DESC LIMIT 1`).get(uid);
      return res.json({ application: normalizeSellerApplication(applicationRow) });
    } catch (error) {
      console.error("Failed to create seller application", error);
      return res.status(500).json({ error: "Failed to submit seller application" });
    }
  });
}
