/// <reference types="vite/client" />

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Strict (but non-blocking) config validation — warns early without changing runtime behavior.
const requiredKeys = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
];

export const isConfigValid = requiredKeys.every(Boolean);

if (!isConfigValid) {
  console.error(
    "Firebase configuration is incomplete. Please set the required VITE_FIREBASE_* environment variables."
  );
}

// Keep initialization behavior the same (no gating) — just formatted + validated.
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Long polling helps in proxied/restricted networks; can be revisited for production hosting.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
