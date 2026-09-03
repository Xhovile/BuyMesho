import { getFirebaseAdmin } from "../../auth/firebaseAdmin.js";
import { query } from "../../postgres.js";
import { sendEmail } from "../email/email.service.js";
import { renderOrderDisputedEmail } from "../email/templates/order-disputed.js";
import {
  claimEmailNotification,
  markEmailNotificationSent,
  releaseEmailNotification,
} from "./email-delivery.repository.js";

type RecipientRole = "buyer" | "seller";
type SendEmail = typeof sendEmail;
type FirebaseUser = { email?: string | null; displayName?: string | null };

type DeliveryDependencies = {
  send?: SendEmail;
  claim?: (notificationType: string, dedupeKey: string) => boolean;
  markSent?: (notificationType: string, dedupeKey: string) => void;
  release?: (notificationType: string, dedupeKey: string) => void;
  lookupUser?: (uid: string) => Promise<FirebaseUser>;
  lookupSellerBusinessName?: (uid: string) => Promise<string | null>;
};

export type OrderDisputedInput = {
  orderId: string;
  disputeId: string;
  buyerId: string;
  sellerId: string;
  reason: string;
};

async function getUserEmail(uid: string): Promise<FirebaseUser> {
  const user = await getFirebaseAdmin().auth().getUser(uid);
  return { email: user.email?.trim() || "", displayName: user.displayName?.trim() || "" };
}

async function getSellerBusinessName(sellerUid: string): Promise<string | null> {
  try {
    const result = await query<{ business_name?: string | null }>(
      "SELECT business_name FROM sellers WHERE uid = $1 LIMIT 1",
      [sellerUid],
    );
    return result.rows[0]?.business_name?.trim() || null;
  } catch (error) {
    console.warn("Failed to load seller business name for dispute email", error);
    return null;
  }
}

async function sendOrderDisputedEmail(
  input: OrderDisputedInput,
  role: RecipientRole,
  dependencies: DeliveryDependencies,
): Promise<boolean> {
  const recipientId = role === "buyer" ? input.buyerId : input.sellerId;
  const lookupUser = dependencies.lookupUser ?? getUserEmail;
  const recipient = await lookupUser(recipientId);
  const email = recipient.email?.trim() || "";
  if (!email) return false;

  const lookupSellerBusinessName = dependencies.lookupSellerBusinessName ?? getSellerBusinessName;
  const sellerBusinessName = (await lookupSellerBusinessName(input.sellerId)) || "BuyMesho seller";
  const buyerName = role === "buyer" ? recipient.displayName?.trim() || "there" : "BuyMesho customer";
  const recipientName = role === "buyer" ? buyerName : sellerBusinessName;
  const counterpartyName = role === "buyer" ? sellerBusinessName : buyerName;
  const actionUrl = `https://buymesho.app/orders/${encodeURIComponent(input.orderId)}`;
  const dedupeKey = `${input.disputeId}:${role}`;
  const claim = dependencies.claim ?? claimEmailNotification;
  const markSent = dependencies.markSent ?? markEmailNotificationSent;
  const release = dependencies.release ?? releaseEmailNotification;

  if (!claim("order_disputed", dedupeKey)) return false;

  try {
    const { text, html } = renderOrderDisputedEmail({
      recipientName,
      role,
      orderId: input.orderId,
      counterpartyName,
      reason: input.reason,
      actionUrl,
    });

    await (dependencies.send ?? sendEmail)({
      sender: "notifications",
      to: { email, name: recipientName },
      subject: "BuyMesho order dispute opened",
      text,
      html,
    });
    markSent("order_disputed", dedupeKey);
    return true;
  } catch (error) {
    release("order_disputed", dedupeKey);
    throw error;
  }
}

export async function notifyOrderDisputed(
  input: OrderDisputedInput,
  dependencies: DeliveryDependencies = {},
): Promise<void> {
  await Promise.allSettled([
    sendOrderDisputedEmail(input, "buyer", dependencies),
    sendOrderDisputedEmail(input, "seller", dependencies),
  ]);
}
