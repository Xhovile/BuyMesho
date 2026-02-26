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

console.log("Firebase: Initializing with config", { projectId: firebaseConfig.projectId });
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

console.log("Firebase: Initializing Firestore...");
// Long polling helps in proxied/restricted networks
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
console.log("Firebase: Initialization complete");

export const isConfigValid = true;
