import type { Express } from "express";
import { getFirebaseAdmin } from "./firebaseAdmin.js";
import { requireFirebaseUser } from "../middleware/requireFirebaseUser.js";
import { postgresDb as db } from "../db.js";

const ROUTES_INSTALLED_FLAG = Symbol.for("buymesho.accountRoutesInstalled");

type UserType = "student" | "public";

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullable(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized || null;
}

export function registerAccountRoutes(app: Express) {
  if ((app as any)[ROUTES_INSTALLED_FLAG]) return;

  app.put("/api/account", requireFirebaseUser, async (req: any, res) => {
    const uid = String(req.user?.uid ?? "").trim();
    if (!uid) return res.status(401).json({ error: "Authentication required" });

    const firstName = normalizeString(req.body?.first_name);
    const surname = normalizeString(req.body?.surname);
    const otherNames = normalizeNullable(req.body?.other_names);
    const fullName = normalizeString(req.body?.full_name) || [firstName, otherNames, surname].filter(Boolean).join(" ");
    const userType = normalizeString(req.body?.user_type);
    const phone = normalizeString(req.body?.phone);
    const university = normalizeNullable(req.body?.university);
    const campus = normalizeNullable(req.body?.campus);
    const studentId = normalizeNullable(req.body?.student_id);
    const studentNumber = normalizeNullable(req.body?.student_number);
    const studentEmail = normalizeNullable(req.body?.student_email);
    const profilePicture = normalizeString(req.body?.profile_picture);
    const profileSetupComplete = req.body?.profile_setup_complete === true;
    const buyerDetails = req.body?.buyer_details && typeof req.body.buyer_details === "object" ? req.body.buyer_details : null;

    if (userType && userType !== "student" && userType !== "public") {
      return res.status(400).json({ error: "Invalid user type" });
    }
    if (!firstName || !surname) {
      return res.status(400).json({ error: "First name and surname are required" });
    }
    if (userType === "student" && (!university || !studentNumber || !studentEmail)) {
      return res.status(400).json({ error: "Institution, student number, and student email are required for student accounts" });
    }

    const hasBusinessFields =
      Object.prototype.hasOwnProperty.call(req.body ?? {}, "business_name") ||
      Object.prototype.hasOwnProperty.call(req.body ?? {}, "business_logo") ||
      Object.prototype.hasOwnProperty.call(req.body ?? {}, "bio");
    const businessName = normalizeString(req.body?.business_name);
    const businessLogo = normalizeString(req.body?.business_logo);
    const bio = normalizeString(req.body?.bio);

    try {
      const firebaseAdmin = getFirebaseAdmin();
      const profileData: Record<string, unknown> = {
        ...(firstName ? { first_name: firstName } : {}),
        ...(surname ? { surname } : {}),
        other_names: otherNames,
        full_name: fullName || null,
        ...(phone ? { phone } : {}),
        ...(userType ? { user_type: userType as UserType } : {}),
        ...(userType === "student" ? {
          university,
          campus,
          student_id: studentId,
          student_number: studentNumber,
          student_email: studentEmail,
        } : userType === "public" ? {
          university: null,
          campus: null,
          student_id: null,
          student_number: null,
          student_email: null,
        } : {}),
        profile_picture: profilePicture || null,
        ...(profileSetupComplete ? { profile_setup_complete: true } : {}),
        ...(buyerDetails ? {
          buyer_details: {
            fullName: normalizeString(buyerDetails.fullName) || fullName || null,
            phone: normalizeString(buyerDetails.phone) || phone || "",
            addressLine: normalizeString(buyerDetails.addressLine),
            area: normalizeString(buyerDetails.area),
            townOrDistrict: normalizeString(buyerDetails.townOrDistrict),
            landmark: normalizeString(buyerDetails.landmark),
          },
        } : {}),
        updated_at: new Date().toISOString(),
      };

      await firebaseAdmin.firestore().collection("users").doc(uid).set(profileData, { merge: true });

      if (university || hasBusinessFields) {
        try {
          const sellerUpdates: string[] = [];
          const sellerParams: unknown[] = [];

          if (university) {
            sellerUpdates.push("university = ?");
            sellerParams.push(university);
          }

          if (hasBusinessFields) {
            sellerUpdates.push("business_name = ?");
            sellerParams.push(businessName || null);
            sellerUpdates.push("business_logo = ?");
            sellerParams.push(businessLogo || null);
            sellerUpdates.push("bio = ?");
            sellerParams.push(bio || null);
          }

          if (sellerUpdates.length > 0) {
            sellerParams.push(uid);
            db.prepare(
              `UPDATE sellers
               SET ${sellerUpdates.join(", ")}
               WHERE uid = ?`,
            ).run(...sellerParams);
          }
        } catch (error) {
          console.warn("Failed to sync account fields to seller record", error);
        }
      }

      let seller: any = null;
      try {
        seller = db
          .prepare(
            `SELECT uid, email, business_name, business_logo, university, bio, is_verified, is_seller, join_date
             FROM sellers
             WHERE uid = ?
             LIMIT 1`,
          )
          .get(uid);
      } catch (error) {
        console.warn("Failed to reload seller record after account update", error);
      }

      return res.json({
        success: true,
        profile: {
          uid,
          email: seller?.email ?? req.user?.email ?? "",
          first_name: firstName || null,
          surname: surname || null,
          other_names: otherNames,
          full_name: fullName || null,
          phone: phone || null,
          user_type: userType || null,
          university: university || seller?.university || null,
          campus: campus || null,
          student_id: studentId,
          student_number: studentNumber,
          student_email: studentEmail,
          profile_picture: profilePicture || null,
          profile_setup_complete: profileSetupComplete,
          buyer_details: buyerDetails,
          business_name: seller?.business_name ?? null,
          business_logo: seller?.business_logo ?? null,
          bio: seller?.bio ?? null,
          is_verified: !!seller?.is_verified,
          is_seller: !!seller?.is_seller,
          join_date: seller?.join_date ?? null,
        },
      });
    } catch (error) {
      console.error("Failed to update account", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to update account",
      });
    }
  });

  (app as any)[ROUTES_INSTALLED_FLAG] = true;
}
