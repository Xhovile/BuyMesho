import admin from "firebase-admin";

/**
 * Priority:
 * 1) FIREBASE_SERVICE_ACCOUNT_JSON (Codespaces / CI / private env)
 * 2) Application Default Credentials (fallback)
 */
function getCredential() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (json && json.trim().length > 0) {
    const serviceAccount = JSON.parse(json);

    return admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: (serviceAccount.private_key as string).replace(/\\n/g, "\n"),
    });
  }

  return admin.credential.applicationDefault();
}

export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: getCredential(),
    });
  }
  return admin;
}

export async function verifyIdToken(idToken: string) {
  const adminApp = getFirebaseAdmin();
  return adminApp.auth().verifyIdToken(idToken);
}
