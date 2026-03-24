import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db as firestore } from "../firebase";
import { useAuthUser } from "./useAuthUser";
import type { UserProfile } from "../types";

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
      const snap = await getDoc(doc(firestore, "users", firebaseUser.uid));
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        setProfile(null);
      }
      setError(null);
    } catch (err: any) {
      console.error("Failed to load account profile", err);
      setProfile(null);
      setError(err?.message || "Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void loadProfile();
  }, [firebaseUser, authLoading]);

  return {
    firebaseUser,
    authLoading,
    profile,
    setProfile,
    profileLoading,
    error,
    refreshProfile: loadProfile,
    emailVerified: !!auth.currentUser?.emailVerified,
  };
}
