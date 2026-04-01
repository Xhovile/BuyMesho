import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db as firestore } from "../firebase";
import { useAuthUser } from "./useAuthUser";
import { UNIVERSITIES } from "../constants";
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
      const userRef = doc(firestore, "users", firebaseUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        const fallbackProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          university: UNIVERSITIES[0],
          avatar_url: "",
          is_verified: false,
          is_seller: false,
          join_date: new Date().toISOString(),
        };
        await setDoc(userRef, fallbackProfile);
        setProfile(fallbackProfile);
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
