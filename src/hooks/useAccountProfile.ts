import { useEffect, useRef, useState } from "react";
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
  // Only poll for seller-status updates when the user has a pending application.
  const [sellerApplicationPending, setSellerApplicationPending] = useState(false);
  const syncInFlight = useRef(false);

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
        let loadedProfile = snap.data() as UserProfile;

        // If Firestore doesn't have avatar_url (e.g. the updateDoc write in EditAccountPage
        // failed silently), fall back to the SQLite backend which is always updated first.
        if (!loadedProfile.avatar_url && !loadedProfile.business_logo) {
          try {
            const serverProfile = await apiFetch("/api/profile");
            if (serverProfile?.avatar_url) {
              loadedProfile = { ...loadedProfile, avatar_url: serverProfile.avatar_url };
              // Proactively sync the missing avatar_url back into Firestore so future reads
              // work correctly without needing this extra round-trip.
              setDoc(userRef, { avatar_url: serverProfile.avatar_url }, { merge: true }).catch(() => {});
            }
          } catch {
            // Server fallback unavailable – proceed with the Firestore data as-is.
          }
        }

        setProfile(loadedProfile);

        if (!loadedProfile.is_seller) {
          // Check application status on initial load to decide whether background
          // polling is needed, without forcing a token refresh.
          try {
            const application = await fetchSellerApplicationWithRetry();
            if (application?.status === "approved") {
              setSellerApplicationPending(false);
              setProfile((prev) => (prev ? { ...prev, is_seller: true } : prev));
              try {
                await setDoc(userRef, { is_seller: true }, { merge: true });
              } catch (firestoreWriteErr) {
                console.error("Failed to persist seller status to Firestore", firestoreWriteErr);
              }
            } else if (application?.status === "pending") {
              setSellerApplicationPending(true);
            }
            // null = no application; other statuses (rejected) do not need polling
          } catch {
            // Transient error: default to polling so an approved status is not missed.
            setSellerApplicationPending(true);
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

  useEffect(() => {
    if (authLoading || !firebaseUser || profile?.is_seller || !sellerApplicationPending) return;

    const syncApprovedSellerStatus = async () => {
      try {
        const sellerApplication = await fetchSellerApplicationWithRetry();

        if (sellerApplication?.status === "approved") {
          const userRef = doc(firestore, "users", firebaseUser.uid);
          await setDoc(userRef, { is_seller: true }, { merge: true });
          setProfile((prev) => (prev ? { ...prev, is_seller: true } : prev));
          setSellerApplicationPending(false);
          return;
        }

        if (sellerApplication?.status === "pending") {
          setSellerApplicationPending(true);
          return;
        }

        if (!sellerApplication || sellerApplication?.status === "rejected") {
          setSellerApplicationPending(false);
        }
      } catch (statusErr) {
        console.error("Background seller status sync failed", statusErr);
      }
    };

    void syncApprovedSellerStatus();

    const handleFocusSync = () => {
      void syncApprovedSellerStatus();
    };

    window.addEventListener("focus", handleFocusSync);
    window.addEventListener("popstate", handleFocusSync);
    const syncInterval = sellerApplicationPending
      ? window.setInterval(() => {
          void syncApprovedSellerStatus();
        }, 15000)
      : null;

    return () => {
      window.removeEventListener("focus", handleFocusSync);
      window.removeEventListener("popstate", handleFocusSync);
      if (syncInterval) {
        window.clearInterval(syncInterval);
      }
    };
  }, [authLoading, firebaseUser, profile?.is_seller, sellerApplicationPending]);

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
