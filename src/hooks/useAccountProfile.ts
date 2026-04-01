import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db as firestore } from "../firebase";
import { useAuthUser } from "./useAuthUser";
import { UNIVERSITIES } from "../constants";
import { apiFetch } from "../lib/api";
import type { UserProfile } from "../types";

const SELLER_STATUS_RETRY_DELAYS_MS = [0, 800, 1800];

async function fetchSellerApplicationWithRetry() {
  let lastError: unknown = null;

  for (const delayMs of SELLER_STATUS_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    try {
      return await apiFetch("/api/profile/seller-application");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export function useAccountProfile() {
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!firebaseUser) {
      setProfile(null);
      setProfileLoading(false);
      setError(null);
      return;
    }

    setProfileLoading(true);
    try {
      const fallbackProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        university: UNIVERSITIES[0],
        avatar_url: "",
        is_verified: false,
        is_seller: false,
        join_date: new Date().toISOString(),
      };
      const userRef = doc(firestore, "users", firebaseUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const loadedProfile = snap.data() as UserProfile;
        setProfile(loadedProfile);

        if (!loadedProfile.is_seller) {
          try {
            const sellerApplication = await fetchSellerApplicationWithRetry();
            if (sellerApplication?.status === "approved") {
              await setDoc(userRef, { is_seller: true }, { merge: true });
              setProfile((prev) => (prev ? { ...prev, is_seller: true } : prev));
            }
          } catch (statusErr) {
            console.error("Failed to sync seller status from application after retries", statusErr);
          }
        }
      } else {
        try {
          await setDoc(userRef, fallbackProfile);
        } catch (firestoreWriteErr) {
          console.warn("Firestore profile bootstrap failed, using server fallback", firestoreWriteErr);
          const token = await firebaseUser.getIdToken(true);
          const bootstrapRes = await fetch("/api/profile/bootstrap", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              university: fallbackProfile.university,
            }),
          });
          if (!bootstrapRes.ok) {
            throw new Error(`Profile bootstrap failed (${bootstrapRes.status})`);
          }
        }
        setProfile(fallbackProfile);
      }
      setError(null);
    } catch (err: any) {
      console.error("Failed to load account profile", err);
      try {
        const token = await firebaseUser.getIdToken(true);
        const bootstrapRes = await fetch("/api/profile/bootstrap", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            university: UNIVERSITIES[0],
          }),
        });

        if (!bootstrapRes.ok) {
          throw new Error(`Profile bootstrap failed (${bootstrapRes.status})`);
        }

        const bootstrapData = await bootstrapRes.json();
        if (bootstrapData?.profile) {
          setProfile(bootstrapData.profile as UserProfile);
          setError(null);
        } else {
          setProfile(null);
          setError(err?.message || "Failed to load profile");
        }
      } catch (bootstrapErr: any) {
        console.error("Profile bootstrap after read failure failed", bootstrapErr);
        setProfile(null);
        setError(bootstrapErr?.message || err?.message || "Failed to load profile");
      }
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void loadProfile();
  }, [firebaseUser, authLoading]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!firebaseUser) return;

    try {
      const userRef = doc(firestore, "users", firebaseUser.uid);
      await setDoc(userRef, updates, { merge: true });
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      setError(null);
    } catch (err: any) {
      console.error("Failed to update account profile", err);
      setError(err?.message || "Failed to update profile");
      throw err;
    }
  };

  return {
    firebaseUser,
    authLoading,
    profile,
    setProfile,
    profileLoading,
    error,
    refreshProfile: loadProfile,
    updateProfile,
    emailVerified: !!auth.currentUser?.emailVerified,
  };
}
