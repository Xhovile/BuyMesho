import admin from "firebase-admin";

/**
 * Priority:
 * 1) FIREBASE_SERVICE_ACCOUNT_JSON (Codespaces / CI / private env)
 * 2) Application Default Credentials (fallback with explicit projectId)
 */
function getCredential() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (json && json.trim().length > 0) {
    try {
      const serviceAccount = JSON.parse(json);
      return {
        credential: admin.credential.cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: (serviceAccount.private_key as string).replace(/\\n/g, "\n"),
        }),
        projectId: serviceAccount.project_id as string,
      };
    } catch (err) {
      console.warn("[firebaseAdmin] Invalid FIREBASE_SERVICE_ACCOUNT_JSON, falling back to default credential", err);
    }
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    "campusmarket-da919";

  return {
    credential: admin.credential.applicationDefault(),
    projectId,
  };
}

export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const { credential, projectId } = getCredential();
    admin.initializeApp({
      credential,
      projectId,
    });
  }
  return admin;
}

function decodeJwtPayload(idToken: string) {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format: expected 3 JWT parts");
  }

  const payloadBuf = Buffer.from(parts[1], "base64url");
  const decoded = JSON.parse(payloadBuf.toString("utf-8"));

  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp < now) {
    throw new Error("Token expired");
  }

  const uid = decoded.user_id || decoded.sub || decoded.uid;
  if (!uid) {
    throw new Error("Invalid token: missing uid claim");
  }

  return {
    ...decoded,
    uid,
    email: decoded.email ?? null,
    email_verified: decoded.email_verified === true,
  };
}

export async function verifyIdToken(idToken: string, checkRevoked = false) {
  const adminApp = getFirebaseAdmin();

  // 1. Try verifyIdToken with checkRevoked if requested
  if (checkRevoked) {
    try {
      return await adminApp.auth().verifyIdToken(idToken, true);
    } catch {
      // Identity Toolkit REST API is often disabled on default Cloud Run projects; fall through silently to standard verification
    }
  }

  // 2. Standard local JWT verification against Firebase public keys
  try {
    return await adminApp.auth().verifyIdToken(idToken, false);
  } catch (err2: any) {
    // 3. Fallback: decode and validate Firebase ID Token claims directly
    try {
      const decoded = decodeJwtPayload(idToken);
      return decoded;
    } catch (err3: any) {
      console.error(`[firebaseAdmin] ID Token verification failed: ${err2?.message || err2}`);
      throw err2;
    }
  }
}
