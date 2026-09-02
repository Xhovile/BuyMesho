import type { Express } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

export type SellerApplicationRouteDeps = {
  db: any;
};

type SellerApplicationStatus = "pending" | "approved" | "rejected";

function normalizeSellerApplication(row: any) {
  if (!row) return null;

  return {
    status: (row.status ?? "pending") as SellerApplicationStatus,
    reviewed_at: row.reviewed_at ?? null,
    review_notes: row.review_notes ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function normalizeSellerProfile(row: any) {
  if (!row) return null;

  return {
    uid: row.uid,
    business_name: row.business_name ?? null,
    business_logo: row.business_logo ?? null,
    university: row.university ?? null,
    bio: row.bio ?? null,
    is_verified: !!row.is_verified,
    is_seller: !!row.is_seller,
    join_date: row.join_date ?? null,
    profile_views: Number(row.profile_views ?? 0),
  };
}

function isApplicationPayload(body: any) {
  return (
    typeof body?.full_legal_name === "string" ||
    typeof body?.proof_document_url === "string"
  );
}

export function registerSellerApplicationRoutes(app: Express, deps: SellerApplicationRouteDeps) {
  const { db } = deps;

  app.get("/api/profile/seller-application", requireAuth, (req, res) => {
    const uid = req.user!.uid;

    try {
      const row = db
        .prepare(
          `
            SELECT status, reviewed_at, review_notes, created_at, updated_at
            FROM seller_applications
            WHERE applicant_uid = ?
            ORDER BY id DESC
            LIMIT 1
          `
        )
        .get(uid);

      if (!row) {
        return res.json(null);
      }

      return res.json(normalizeSellerApplication(row));
    } catch (error) {
      console.error("Failed to load seller application", error);
      return res.status(500).json({ error: "Failed to load seller application" });
    }
  });

  app.post("/api/profile/become-seller", requireAuth, async (req, res) => {
    const uid = req.user!.uid;
    const email = req.user?.email || req.body?.email || "";

    try {
      if (isApplicationPayload(req.body)) {
        const fullLegalName = typeof req.body?.full_legal_name === "string" ? req.body.full_legal_name.trim() : "";
        const institution = typeof req.body?.institution === "string" ? req.body.institution.trim() : "";
        const applicantType = typeof req.body?.applicant_type === "string" ? req.body.applicant_type.trim() : "";
        const institutionIdNumber = typeof req.body?.institution_id_number === "string" ? req.body.institution_id_number.trim() : "";
        const whatsappNumber = typeof req.body?.whatsapp_number === "string" ? req.body.whatsapp_number.trim() : "";
        const businessName = typeof req.body?.business_name === "string" ? req.body.business_name.trim() : "";
        const whatToSell = typeof req.body?.what_to_sell === "string" ? req.body.what_to_sell.trim() : "";
        const businessDescription = typeof req.body?.business_description === "string" ? req.body.business_description.trim() : "";
        const proofDocumentUrl = typeof req.body?.proof_document_url === "string" ? req.body.proof_document_url.trim() : "";
        const agreedToRules = req.body?.agreed_to_rules === true || req.body?.agreed_to_rules === 1 || req.body?.agreed_to_rules === "1";

        const missingFields = [
          ["full_legal_name", fullLegalName],
          ["institution", institution],
          ["applicant_type", applicantType],
          ["institution_id_number", institutionIdNumber],
          ["business_name", businessName],
          ["what_to_sell", whatToSell],
          ["business_description", businessDescription],
          ["proof_document_url", proofDocumentUrl],
        ].filter(([, value]) => !value);

        if (missingFields.length > 0) {
          return res.status(400).json({
            error: `Missing required field(s): ${missingFields.map(([field]) => field).join(", ")}`,
          });
        }

        if (!agreedToRules) {
          return res.status(400).json({ error: "You must agree to the seller rules before submitting." });
        }

        db.prepare(
          `
            INSERT INTO sellers (
              uid,
              email,
              business_name,
              university,
              bio,
              is_verified,
              is_seller
            ) VALUES (?, ?, ?, ?, ?, ?, 0)
            ON CONFLICT(uid) DO UPDATE SET
              email = excluded.email,
              business_name = COALESCE(excluded.business_name, sellers.business_name),
              university = COALESCE(excluded.university, sellers.university),
              bio = COALESCE(excluded.bio, sellers.bio),
              is_verified = CASE
                WHEN excluded.is_verified = 1 THEN 1
                ELSE sellers.is_verified
              END
          `
        ).run(
          uid,
          email,
          businessName,
          institution,
          businessDescription,
          req.user?.email_verified ? 1 : 0,
        );

        db.prepare(
          `
            INSERT INTO seller_applications (
              applicant_uid,
              applicant_email,
              full_legal_name,
              institution,
              applicant_type,
              institution_id_number,
              whatsapp_number,
              business_name,
              what_to_sell,
              business_description,
              reason_for_applying,
              proof_document_url,
              agreed_to_rules,
              status,
              reviewed_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, CURRENT_TIMESTAMP)
          `
        ).run(
          uid,
          email,
          fullLegalName,
          institution,
          applicantType,
          institutionIdNumber,
          whatsappNumber,
          businessName,
          whatToSell,
          businessDescription,
          "",
          proofDocumentUrl,
          agreedToRules ? 1 : 0,
        );

        const applicationRow = db
          .prepare(
            `
              SELECT status, reviewed_at, review_notes, created_at, updated_at
              FROM seller_applications
              WHERE applicant_uid = ?
              ORDER BY id DESC
              LIMIT 1
            `
          )
          .get(uid);

        return res.json({ application: normalizeSellerApplication(applicationRow) });
      }

      const businessName = typeof req.body?.business_name === "string" ? req.body.business_name.trim() : "";
      const university = typeof req.body?.university === "string" ? req.body.university.trim() : "";
      const bio = typeof req.body?.bio === "string" ? req.body.bio.trim() : "";

      db.prepare(
        `
          INSERT INTO sellers (
            uid,
            email,
            business_name,
            university,
            bio,
            is_verified,
            is_seller
          ) VALUES (?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(uid) DO UPDATE SET
            email = excluded.email,
            business_name = COALESCE(excluded.business_name, sellers.business_name),
            university = COALESCE(excluded.university, sellers.university),
            bio = COALESCE(excluded.bio, sellers.bio),
            is_verified = CASE
              WHEN excluded.is_verified = 1 THEN 1
              ELSE sellers.is_verified
            END,
            is_seller = 1
        `
      ).run(
        uid,
        email,
        businessName || null,
        university || null,
        bio || null,
        req.user?.email_verified ? 1 : 0,
      );

      const profileRow = db
        .prepare(
          `
            SELECT uid, business_name, business_logo, university, bio, is_verified, is_seller, join_date, profile_views
            FROM sellers
            WHERE uid = ?
            LIMIT 1
          `
        )
        .get(uid);

      return res.json({ profile: normalizeSellerProfile(profileRow) });
    } catch (error) {
      console.error("Failed to create seller application", error);
      return res.status(500).json({ error: "Failed to submit seller application" });
    }
  });
}
