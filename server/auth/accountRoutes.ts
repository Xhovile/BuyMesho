import type { Express } from "express";
import { getFirebaseAdmin } from "./firebaseAdmin.js";
import { requireFirebaseUser } from "../middleware/requireFirebaseUser.js";
import { postgresDb as db } from "../db.js";

const ROUTES_INSTALLED_FLAG = Symbol.for("buymesho.accountRoutesInstalled");
type UserType = "student" | "public";
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const nullable = (value: unknown) => text(value) || null;

export function registerAccountRoutes(app: Express) {
  if ((app as any)[ROUTES_INSTALLED_FLAG]) return;

  app.put("/api/account", requireFirebaseUser, async (req: any, res) => {
    const uid = text(req.user?.uid);
    if (!uid) return res.status(401).json({ error: "Authentication required" });

    const firstName = text(req.body?.first_name);
    const surname = text(req.body?.surname);
    const otherNames = nullable(req.body?.other_names);
    const fullName = text(req.body?.full_name) || [firstName, otherNames, surname].filter(Boolean).join(" ");
    const userType = text(req.body?.user_type);
    const phone = text(req.body?.phone);
    const university = nullable(req.body?.university);
    const campus = nullable(req.body?.campus);
    const studentId = nullable(req.body?.student_id);
    const studentNumber = nullable(req.body?.student_number);
    const studentEmail = nullable(req.body?.student_email);
    const profilePicture = text(req.body?.profile_picture);
    const profileSetupComplete = req.body?.profile_setup_complete === true;
    const buyerDetails = req.body?.buyer_details && typeof req.body.buyer_details === "object" ? req.body.buyer_details : null;
    const studentNumberProvided = Object.prototype.hasOwnProperty.call(req.body ?? {}, "student_number");

    if (userType && userType !== "student" && userType !== "public") return res.status(400).json({ error: "Invalid user type" });
    if (!firstName || !surname) return res.status(400).json({ error: "First name and surname are required" });
    if (userType === "student" && (!university || !studentId || !studentEmail)) {
      return res.status(400).json({ error: "Institution, Student ID, and student email are required for student accounts" });
    }

    const hasBusinessFields = ["business_name", "business_logo", "bio"].some((key) => Object.prototype.hasOwnProperty.call(req.body ?? {}, key));
    const businessName = text(req.body?.business_name);
    const businessLogo = text(req.body?.business_logo);
    const bio = text(req.body?.bio);

    try {
      const firebaseAdmin = getFirebaseAdmin();
      const studentFields: Record<string, unknown> = {
        university,
        campus,
        student_id: studentId,
        student_email: studentEmail,
      };
      if (studentNumberProvided) studentFields.student_number = studentNumber;

      const profileData: Record<string, unknown> = {
        first_name: firstName,
        surname,
        other_names: otherNames,
        full_name: fullName || null,
        ...(phone ? { phone } : {}),
        ...(userType ? { user_type: userType as UserType } : {}),
        ...(userType === "student" ? studentFields : userType === "public" ? {
          university: null,
          campus: null,
          student_id: null,
          student_email: null,
          ...(studentNumberProvided ? { student_number: null } : {}),
        } : {}),
        profile_picture: profilePicture || null,
        ...(profileSetupComplete ? { profile_setup_complete: true } : {}),
        ...(buyerDetails ? {
          buyer_details: {
            fullName: text(buyerDetails.fullName) || fullName || null,
            phone: text(buyerDetails.phone) || phone || "",
            addressLine: text(buyerDetails.addressLine),
            area: text(buyerDetails.area),
            townOrDistrict: text(buyerDetails.townOrDistrict),
            landmark: text(buyerDetails.landmark),
          },
        } : {}),
        updated_at: new Date().toISOString(),
      };

      await firebaseAdmin.firestore().collection("users").doc(uid).set(profileData, { merge: true });

      if (university || hasBusinessFields) {
        try {
          const updates: string[] = [];
          const params: unknown[] = [];
          if (university) { updates.push("university = ?"); params.push(university); }
          if (hasBusinessFields) {
            updates.push("business_name = ?", "business_logo = ?", "bio = ?");
            params.push(businessName || null, businessLogo || null, bio || null);
          }
          params.push(uid);
          db.prepare(`UPDATE sellers SET ${updates.join(", ")} WHERE uid = ?`).run(...params);
        } catch (error) {
          console.warn("Failed to sync account fields to seller record", error);
        }
      }

      let seller: any = null;
      try {
        seller = db.prepare(`SELECT uid, email, business_name, business_logo, university, bio, is_verified, is_seller, join_date FROM sellers WHERE uid = ? LIMIT 1`).get(uid);
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
          ...(studentNumberProvided ? { student_number: studentNumber } : {}),
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
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update account" });
    }
  });

  (app as any)[ROUTES_INSTALLED_FLAG] = true;
}
