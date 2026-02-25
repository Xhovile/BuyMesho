/// <reference types="vite/client" />

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCzRPIVpCs_MC-5Tic5nT3yeLqSK7BjIS0",
  authDomain: "campusmarket-da919.firebaseapp.com",
  projectId: "campusmarket-da919",
  storageBucket: "campusmarket-da919.firebasestorage.app",
  messagingSenderId: "558704099855",
  appId: "1:558704099855:web:6c7f6e50ba7cf1fc13597a",
  measurementId: "G-1G3T8H9ZZT"
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
