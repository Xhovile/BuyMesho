import { getFirebaseAdmin } from "../../auth/firebaseAdmin.js";
import { query } from "../../postgres.js";

export type NotificationRecipient = {
  email: string;
  displayName: string;
};

type FirebaseUser = {
  email?: string | null;
  displayName?: string | null;
};

type RecipientDependencies = {
  lookupUser?: (uid: string) => Promise<FirebaseUser>;
};

async function getProfileEmail(uid: string): Promise<string> {
  try {
    const result = await query<{ email?: string | null }>(
      "SELECT email FROM sellers WHERE uid = $1 LIMIT 1",
      [uid],
    );
    return result.rows[0]?.email?.trim() || "";
  } catch (error) {
    console.warn("Failed to load local email for notification recipient", error);
    return "";
  }
}

export async function resolveNotificationRecipient(
  uid: string,
  dependencies: RecipientDependencies = {},
): Promise<NotificationRecipient> {
  const profileEmail = await getProfileEmail(uid);
  const lookupUser = dependencies.lookupUser ?? (async (userUid: string) => getFirebaseAdmin().auth().getUser(userUid));

  try {
    const user = await lookupUser(uid);
    return {
      email: user.email?.trim() || profileEmail,
      displayName: user.displayName?.trim() || "",
    };
  } catch (error) {
    if (!profileEmail) throw error;
    return { email: profileEmail, displayName: "" };
  }
}
