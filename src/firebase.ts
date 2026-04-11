/// <reference types="vite/client" />

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDlT_IH_p6XBwEc_8gwG_2IWUXmcitAmLM",
  authDomain: "campusmarket-da919.firebaseapp.com",
  projectId: "campusmarket-da919",
  storageBucket: "campusmarket-da919.firebasestorage.app",
  messagingSenderId: "558704099855",
  appId: "1:558704099855:web:6c7f6e50ba7cf1fc13597a",
  measurementId: "G-1G3T8H9ZZT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let analytics: ReturnType<typeof getAnalytics> | null = null;
try {
  analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
} catch (error) {
  console.warn("Firebase Analytics unavailable, continuing without analytics.", error);
  analytics = null;
}

export { analytics };

// Long polling helps in proxied/restricted networks
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const isConfigValid = true;
