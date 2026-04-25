import express, { type Express, type NextFunction, type Request, type Response } from "express";
import nodemailer from "nodemailer";
import { getFirebaseAdmin } from "./firebaseAdmin.js";
import { registerAccountDeletionRoutes } from "./accountDeletionRoutes.js";

type VerifiedRequestUser = {
  uid: string;
  email: string | null;
  email_verified: boolean;
  is_admin: boolean;
};

const ROUTES_INSTALLED_FLAG = Symbol.for("buymesho.verificationEmailRoutesInstalled");

type SmtpConfig = {
  host: string;
  user: string;
  pass: string;
  from: string;
  replyTo: string;
  fromName: string;
  port: number;
  secure: boolean;
};

let transporter: nodemailer.Transporter | null = null;
let transporterConfigKey: string | null = null;

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getTransporter() {
  const smtp = getSmtpConfig();
  const configKey = JSON.stringify({
    host: smtp.host,
    user: smtp.user,
    pass: smtp.pass,
    port: smtp.port,
    secure: smtp.secure,
  });

  if (transporter && transporterConfigKey === configKey) {
    return { transporter, smtp };
  }

  if (!smtp.host || !smtp.user || !smtp.pass || !smtp.from) {
    throw new Error(
      "SMTP email settings are missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM."
    );
  }

  transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });
  transporterConfigKey = configKey;

  return { transporter, smtp };
}

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST?.trim() || "";
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS?.trim() || "";
  const from = process.env.SMTP_FROM?.trim() || user;
  const replyTo = process.env.SMTP_REPLY_TO?.trim() || from;
  const fromName = process.env.SMTP_FROM_NAME?.trim() || "BuyMesho";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = (process.env.SMTP_SECURE || (port === 465 ? "true" : "false")).toLowerCase() === "true";

  return {
    host,
    user,
    pass,
    from,
    replyTo,
    fromName,
    port,
    secure,
  };
}

function getAppUrl() {
  return process.env.APP_URL?.trim() || "http://localhost:3000";
}

async function verifyBearerIdentity(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    const decoded = await getFirebaseAdmin().auth().verifyIdToken(token.trim());

    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      email_verified: (decoded as any).email_verified === true,
      is_admin: (decoded as any).admin === true || (decoded as any).role === "admin",
    } as VerifiedRequestUser;

    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function sendVerificationEmail(params: { email: string; displayName?: string | null }) {
  const admin = getFirebaseAdmin();
  const loginUrl = `${getAppUrl().replace(/\/$/, "")}/login`;
  const verificationLink = await admin.auth().generateEmailVerificationLink(params.email, {
    url: loginUrl,
    handleCodeInApp: false,
  });
  const { transporter: mailer, smtp } = getTransporter();

  const recipientName = params.displayName?.trim() || params.email.split("@")[0] || "there";
  const subject = `${smtp.fromName} — verify your email`;
  const from = `"${smtp.fromName}" <${smtp.from}>`;
  const replyTo = smtp.replyTo;

  const text = [
    `Hello ${recipientName},`,
    "",
    `Please verify your email address for ${smtp.fromName}.`,
    `Open this link to complete verification: ${verificationLink}`,
    "",
    `If you did not create this account, you can ignore this email.`,
    "",
    `${smtp.fromName}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin: 0 0 16px;">Verify your email</h2>
      <p style="margin: 0 0 12px;">Hello ${escapeHtml(recipientName)},</p>
      <p style="margin: 0 0 16px;">
        Please verify your email address for <strong>${escapeHtml(smtp.fromName)}</strong>.
      </p>
      <p style="margin: 0 0 20px;">
        <a href="${escapeHtml(verificationLink)}"
           style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
          Verify email
        </a>
      </p>
      <p style="margin: 0 0 12px; font-size: 14px; color: #4b5563;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin: 0 0 16px; font-size: 14px; word-break: break-all; color: #2563eb;">${escapeHtml(verificationLink)}</p>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        If you did not create this account, ignore this email.
      </p>
    </div>
  `;

  await mailer.sendMail({
    from,
    to: params.email,
    replyTo,
    subject,
    text,
    html,
  });
}

async function verificationEmailHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  const email = user?.email?.trim();

  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!email) {
    return res.status(400).json({ error: "No email address is attached to this account" });
  }

  if (user.email_verified) {
    return res.json({ success: true, alreadyVerified: true, message: "Email is already verified." });
  }

  const displayName =
    typeof req.body?.display_name === "string" && req.body.display_name.trim().length > 0
      ? req.body.display_name.trim()
      : null;

  try {
    await sendVerificationEmail({ email, displayName });
    return res.json({
      success: true,
      message: "Verification email sent successfully.",
    });
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to send verification email",
    });
  }
}

function registerVerificationEmailRoutes(app: Express) {
  if ((app as any)[ROUTES_INSTALLED_FLAG]) {
    return;
  }

  app.post("/api/auth/send-verification-email", verifyBearerIdentity, verificationEmailHandler);
  app.post("/api/auth/resend-verification-email", verifyBearerIdentity, verificationEmailHandler);
  registerAccountDeletionRoutes(app);

  (app as any)[ROUTES_INSTALLED_FLAG] = true;
}

export { registerVerificationEmailRoutes };
