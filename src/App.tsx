import React, { useState, useEffect } from 'react';
import ConfirmModal from "./components/ConfirmModal";
import PasswordPromptModal from "./components/PasswordPromptModal";
import FormDropdown from "./components/FormDropdown";
import {  
  User, 
  ShieldCheck, 
  AlertTriangle, 
  X,
  Camera,
  MapPin,
  LogOut,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw, 
  Package, 
  Loader2,
  Settings,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Listing, UserProfile, University, Category, SellerDashboardData } from './types';
import HeroSection from "./sections/HeroSection";
import FeedbackModal from "./components/FeedbackModal";
import { UNIVERSITIES, CATEGORIES } from './constants';
import {
  getListingIdFromUrl,
  syncListingParamInUrl,
  clearListingParamFromUrl
} from "./lib/listingUrl";
import MarketSection from "./sections/MarketSection";
import { auth, db as firestore } from './firebase';
import ListingCard from "./components/ListingCard";
import Header from "./components/Header";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification, 
  sendPasswordResetEmail,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { useAuthUser } from "./hooks/useAuthUser";
import { apiFetch } from "./lib/api"; 
import EditListingModal from "./components/EditListingModal";
import SettingsModal from "./components/SettingsModal";
import PrivacyPolicyPage from "./components/PrivacyPolicyPage";
import TermsPage from "./components/TermsPage";
import SafetyTipsPage from "./components/SafetyTipsPage";
import ReportProblemPage from "./components/ReportProblemPage";
import ChangePasswordModal from "./components/ChangePasswordModal";
import ReportListingModal from "./components/ReportListingModal";
import AdminReportsModal from "./components/AdminReportsModal";
                
// --- Main App ---

type SellerRatingSummary = {
  averageRating: number;
  ratingCount: number;
  myRating: number | null;
};

export default function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUniv, setSelectedUniv] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [settingsView, setSettingsView] = useState<"menu" | "privacy" | "terms" | "safety" | "report">("menu");
  const [settingsEntrySource, setSettingsEntrySource] = useState<"settings" | "footer">("settings");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot' | 'profile' | 'editProfile' | 'editAccount' | 'becomeSeller'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
const [showMyListingsModal, setShowMyListingsModal] = useState(false);
const [myListings, setMyListings] = useState<Listing[]>([]);
const [myListingsLoading, setMyListingsLoading] = useState(false);
const [publicProfileOpen, setPublicProfileOpen] = useState(false);
const [publicProfile, setPublicProfile] = useState<any | null>(null);
const [publicProfileListings, setPublicProfileListings] = useState<Listing[]>([]);
const [publicProfileLoading, setPublicProfileLoading] = useState(false);
const [ratingSummary, setRatingSummary] = useState<SellerRatingSummary | null>(null);
const [ratingLoading, setRatingLoading] = useState(false);
const [ratingSubmitting, setRatingSubmitting] = useState(false);
const [detailsOpen, setDetailsOpen] = useState(false);
const [detailsListing, setDetailsListing] = useState<Listing | null>(null);
const [galleryIndex, setGalleryIndex] = useState(0); 
const [reportListingId, setReportListingId] = useState<number | null>(null);
const [savedListingIds, setSavedListingIds] = useState<number[]>([]);
const [showSavedModal, setShowSavedModal] = useState(false);
const [showAdminReportsModal, setShowAdminReportsModal] = useState(false);
const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
const [reauthPassword, setReauthPassword] = useState("");
const [pendingDeleteAfterReauth, setPendingDeleteAfterReauth] = useState(false);
const [sellerDashboard, setSellerDashboard] = useState<SellerDashboardData | null>(null);
const [sellerDashboardLoading, setSellerDashboardLoading] = useState(false);
const [detailsSellerProfile, setDetailsSellerProfile] = useState<any | null>(null);
const [detailsRatingSummary, setDetailsRatingSummary] = useState<SellerRatingSummary | null>(null);
const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
const [detailsLoadingExtra, setDetailsLoadingExtra] = useState(false);  
  
// Local-only hides (no backend needed)

const [hiddenSellerUids, setHiddenSellerUids] = useState<string[]>(() => {
  try {
    const raw = localStorage.getItem("hiddenSellerUids");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
});
const [confirmState, setConfirmState] = useState<{
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: (() => void) | null;
} | null>(null);

const [feedback, setFeedback] = useState<{
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null>(null);

  const [editAccountForm, setEditAccountForm] = useState({
  university: UNIVERSITIES[0] as University,
  avatarUrl: "",
});

const showFeedback = (
  type: "success" | "error" | "info",
  title: string,
  message: string
) => {
  setFeedback({
    open: true,
    type,
    title,
    message,
  });
};
const closeFeedback = () => {
  setFeedback(null);
};

const askConfirm = ({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
}) => {
  setConfirmState({
    open: true,
    title,
    message,
    confirmText,
    cancelText,
    danger,
    onConfirm,
  });
};

const closeConfirm = () => {
  setConfirmState(null);
};
  
const hideSellerLocal = (uid: string) => {
  if (!uid || typeof uid !== "string") return;

  setHiddenSellerUids((prev) => {
    if (prev.includes(uid)) return prev;
    const next = [...prev, uid];
    localStorage.setItem("hiddenSellerUids", JSON.stringify(next));
    return next;
  });
};

const unhideSellerLocal = (uid: string) => {
  setHiddenSellerUids((prev) => {
    const next = prev.filter((x) => x !== uid);
    localStorage.setItem("hiddenSellerUids", JSON.stringify(next));
    return next;
  });
};
  
  const sellerNameMap = React.useMemo(() => {
  const map: Record<string, string> = {};

  for (const listing of listings) {
    if (listing.seller_uid && listing.business_name) {
      map[listing.seller_uid] = listing.business_name;
    }
  }

  if (userProfile?.uid && userProfile?.business_name) {
    map[userProfile.uid] = userProfile.business_name;
  }

  if (publicProfile?.uid && publicProfile?.business_name) {
    map[publicProfile.uid] = publicProfile.business_name;
  }

  return map;
}, [listings, userProfile, publicProfile]);
  
const openDetails = (listing: Listing, startIndex = 0) => {
  setDetailsListing(listing);
  setGalleryIndex(startIndex);
  setDetailsOpen(true);
  syncListingParamInUrl(listing.id);
  void trackListingView(listing.id);
  void loadDetailsExtras(listing);
};

const closeDetails = () => {
  setDetailsOpen(false);
  setDetailsListing(null);
  setGalleryIndex(0);
  clearListingParamFromUrl();
  setDetailsSellerProfile(null);
  setDetailsRatingSummary(null);
  setRelatedListings([]);
  setDetailsLoadingExtra(false);
};

useEffect(() => {
  if (!listings.length) return;

  const listingId = getListingIdFromUrl();
  if (!listingId) return;

  const foundListing = listings.find(
    (item) => String(item.id) === String(listingId)
  );

  if (foundListing) {
    setDetailsListing(foundListing);
    setGalleryIndex(0);
    setDetailsOpen(true);
  }
}, [listings]);

  const isFirebaseConfigured = true; // Hardcoded in firebase.ts
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const savedStorageKey = firebaseUser ? `savedListingIds:${firebaseUser.uid}` : "savedListingIds:guest";

  const isAdminUser =
    !!firebaseUser?.email &&
    firebaseUser.email.toLowerCase() === "isaacmtsiriza310@gmail.com";
  const isSellerAccount = !!userProfile?.is_seller;

  // Form states
  const [newListing, setNewListing] = useState({
    name: "",
    price: "",
    description: "",
    category: CATEGORIES[0] as Category,
    university: UNIVERSITIES[0] as University,
    photos: [] as string[],
    video_url: "",
    whatsapp_number: "",
    status: "available" as "available" | "sold",
    condition: "used" as "new" | "used" | "refurbished"
  });

  const [authForm, setAuthForm] = useState({
  email: "",
  password: "",
  university: UNIVERSITIES[0] as University,
});
  
  const [sellerUpgradeForm, setSellerUpgradeForm] = useState({
  businessName: "",
  university: UNIVERSITIES[0] as University,
  logoUrl: "",
  bio: "",
  whatsappNumber: ""
});
  
const [editProfileForm, setEditProfileForm] = useState({
  businessName: "",
  university: UNIVERSITIES[0] as University,
  logoUrl: "",
  bio: "",
  whatsappNumber: ""
});
  
  useEffect(() => {
  if (authLoading) return; // wait until Firebase finishes checking

  setProfileLoading(true);

  (async () => {
    try {
      if (firebaseUser) {
        try {
          setFirestoreError(null);
          console.log("Firestore: Fetching profile for", firebaseUser.uid);

          const docRef = doc(firestore, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
         const profile = docSnap.data() as UserProfile;
            console.log("Firestore: Profile found", profile.business_name);
            setUserProfile(profile);

            // Sync with SQLite backend
            try {
              try {
  await apiFetch("/api/sellers", {
    method: "POST",
    body: JSON.stringify(profile),
  });
} catch (e: any) {
  console.error("SQLite: Sync failed", e?.message || e);
}
            } catch (syncErr) {
              console.error("SQLite: Sync error", syncErr);
            }

            setAuthView("profile");
          } else {
            console.warn("Firestore: No profile document found for UID:", firebaseUser.uid);
            setUserProfile(null);
            setAuthView("signup");
          }
        } catch (firestoreErr: any) {
          console.error("Firestore: Error fetching profile", firestoreErr);
          setFirestoreError(firestoreErr.message || "Unknown Firestore error");
        }
      } else {
        setUserProfile(null);
        setAuthView((prev) => (prev === "signup" || prev === "forgot" ? prev : "login"));
      }
    } finally {
      setProfileLoading(false);
    }
  })();
}, [firebaseUser, authLoading]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(savedStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedListingIds(
        Array.isArray(parsed)
          ? parsed.filter((x) => Number.isInteger(x))
          : []
      );
    } catch {
      setSavedListingIds([]);
    }
  }, [savedStorageKey]);

  useEffect(() => {
    if (!publicProfileOpen) {
      setRatingSummary(null);
      setRatingLoading(false);
      setRatingSubmitting(false);
    }
  }, [publicProfileOpen]);
  
  useEffect(() => {
    fetchListings();
  }, [selectedUniv, selectedCat, search, sortBy]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedUniv) params.append("university", selectedUniv);
      if (selectedCat) params.append("category", selectedCat);
      if (search) params.append("search", search);
      if (sortBy) params.append("sortBy", sortBy);
      
      const res = await fetch(`/api/listings?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setListings(data);
    } catch (err) {
      console.error("Fetch listings error:", err);
    } finally {
      setLoading(false);
    }
  };

  const trackListingView = async (listingId: number) => {
  try {
    await fetch(`/api/listings/${listingId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Failed to track listing view", e);
  }
};

  const trackSellerProfileView = async (sellerUid: string) => {
  try {
    await fetch(`/api/users/${sellerUid}/profile-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        viewer_uid: firebaseUser?.uid || null,
      }),
    });
  } catch (e) {
    console.error("Failed to track seller profile view", e);
  }
}; 

const loadDetailsExtras = async (listing: Listing) => {
  setDetailsLoadingExtra(true);

  try {
    const [sellerProfile, allListings] = await Promise.all([
      apiFetch(`/api/users/${listing.seller_uid}`),
      apiFetch("/api/listings"),
    ]);

    setDetailsSellerProfile(sellerProfile || null);

    if (firebaseUser) {
      try {
        const summary = await apiFetch(`/api/users/${listing.seller_uid}/rating-summary`);
        setDetailsRatingSummary(summary || null);
      } catch {
        setDetailsRatingSummary(null);
      }
    } else {
      setDetailsRatingSummary(null);
    }

    const related = Array.isArray(allListings)
      ? allListings
          .filter((item: Listing) =>
            item.id !== listing.id &&
            item.category === listing.category &&
            item.university === listing.university
          )
          .slice(0, 6)
      : [];

    setRelatedListings(related);
  } catch (e) {
    console.error("Failed to load detail extras", e);
    setDetailsSellerProfile(null);
    setDetailsRatingSummary(null);
    setRelatedListings([]);
  } finally {
    setDetailsLoadingExtra(false);
  }
};

const fetchSellerDashboard = async () => {
  if (!firebaseUser || !userProfile?.is_seller) {
    setSellerDashboard(null);
    return;
  }

  setSellerDashboardLoading(true);
  try {
    const data = await apiFetch("/api/seller/dashboard");
    setSellerDashboard(data);
  } catch (err) {
    console.error("Failed to load seller dashboard", err);
    setSellerDashboard(null);
  } finally {
    setSellerDashboardLoading(false);
  }
};

  
  useEffect(() => {
  if (firebaseUser && userProfile?.is_seller) {
    void fetchSellerDashboard();
  } else {
    setSellerDashboard(null);
  }
}, [firebaseUser, userProfile?.is_seller]);


const fetchMyListings = async () => {
  if (!firebaseUser) return;

  setMyListingsLoading(true);
  try {
    const data = await apiFetch(`/api/users/${firebaseUser.uid}/listings`);
    setMyListings(Array.isArray(data) ? data : []);
  } catch (err: any) {
    showFeedback(
  "error",
  "Could not load listings",
  err?.message || "We could not load your listings."
);
  } finally {
    setMyListingsLoading(false);
  }
};

const openMyListings = async () => {
  if (!firebaseUser) {
    setShowProfileModal(true);
    setAuthView("login");
    return;
  }

  setShowProfileModal(false);
  setShowMyListingsModal(true);
  await fetchMyListings();
};

const openSettings = () => {
  setShowProfileModal(false);
  setSettingsEntrySource("settings");
  setSettingsView("menu");
  setShowSettingsModal(true);
};

const closeSettings = () => {
  setShowSettingsModal(false);
  setSettingsView("menu");
  setSettingsEntrySource("settings");
};

const openFooterView = (view: "privacy" | "terms" | "safety" | "report") => {
  setShowProfileModal(false);
  setSettingsEntrySource("footer");
  setShowSettingsModal(true);
  setSettingsView(view);
};

const promptSellerUpgrade = () => {
  setShowAddModal(false);

  if (!firebaseUser) {
    setShowProfileModal(true);
    setAuthView("signup");
    return;
  }

  if (!userProfile) {
    setShowProfileModal(true);
    setAuthView("signup");
    return;
  }

  if (!userProfile.is_seller) {
    setShowProfileModal(true);
    setAuthView("profile");
    return;
  }

  setNewListing((prev) => ({
    ...prev,
    whatsapp_number: userProfile?.whatsapp_number || "",
  }));
  setShowAddModal(true);
};

const openEditProfileFromSettings = () => {
  if (!userProfile) return;

  setEditProfileForm({
    businessName: userProfile.business_name || "",
    university: userProfile.university || UNIVERSITIES[0],
    logoUrl: userProfile.business_logo || "",
    bio: userProfile.bio || "",
    whatsappNumber: userProfile.whatsapp_number || "",
  });

  setShowSettingsModal(false);
  setShowProfileModal(true);
  setAuthView("editProfile");
};

const openChangePassword = () => {
  setShowChangePasswordModal(true);
};

const fetchRatingSummary = async (sellerUid: string) => {
  if (!firebaseUser) {
    setRatingSummary(null);
    return;
  }

  setRatingLoading(true);
  try {
    const summary = await apiFetch(`/api/users/${sellerUid}/rating-summary`);
    setRatingSummary(summary);
  } catch (e) {
    console.error("Failed to load rating summary", e);
    setRatingSummary(null);
  } finally {
    setRatingLoading(false);
  }
};

const handleRateSeller = async (sellerUid: string, stars: number) => {
  if (!firebaseUser) {
    setShowProfileModal(true);
    setAuthView("login");
    return;
  }

  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return;

  setRatingSubmitting(true);
  try {
    const summary = await apiFetch(`/api/users/${sellerUid}/rating`, {
      method: "POST",
      body: JSON.stringify({ stars }),
    });
    setRatingSummary(summary);
  } catch (e: any) {
    showFeedback(
      "error",
      "Rating failed",
      e?.message || "We could not save your rating."
    );
  } finally {
    setRatingSubmitting(false);
  }
};

const handleRemoveSellerRating = async (sellerUid: string) => {
  if (!firebaseUser) {
    setShowProfileModal(true);
    setAuthView("login");
    return;
  }

  setRatingSubmitting(true);
  try {
    const summary = await apiFetch(`/api/users/${sellerUid}/rating`, {
      method: "DELETE",
    });
    setRatingSummary(summary);
  } catch (e: any) {
    showFeedback(
      "error",
      "Remove rating failed",
      e?.message || "We could not remove your rating."
    );
  } finally {
    setRatingSubmitting(false);
  }
};

const openPublicProfile = async (uid: string) => {
  setPublicProfileOpen(true);
  setPublicProfileLoading(true);
  setRatingSummary(null);
  void trackSellerProfileView(uid);

  try {
    const profile = await apiFetch(`/api/users/${uid}`);
    const listings = await apiFetch(`/api/users/${uid}/listings`);

    setPublicProfile(profile);
    setPublicProfileListings(listings || []);

    if (firebaseUser) {
      await fetchRatingSummary(uid);
    } else {
      setRatingSummary(null);
    }
  } catch (e: any) {
    showFeedback(
     "error",
     "Profile load failed",
     e?.message || "We could not load this profile."
   );
    setPublicProfileOpen(false);
  } finally {
    setPublicProfileLoading(false);
  }
};

const toggleSavedListing = (listingId: number) => {
  if (!firebaseUser) {
    setShowProfileModal(true);
    setAuthView("login");
    return;
  }

  setSavedListingIds((prev) => {
    const next = prev.includes(listingId)
      ? prev.filter((id) => id !== listingId)
      : [...prev, listingId];

    localStorage.setItem(savedStorageKey, JSON.stringify(next));
    return next;
  });
};

const requireLoginForContact = () => {
  setShowProfileModal(true);
  setAuthView("login");
};

const savedListings = React.useMemo(() => {
  return listings.filter((listing) => savedListingIds.includes(listing.id));
}, [listings, savedListingIds]);
  
  const performDeleteListing = async (listingId: number) => {
  try {
    await apiFetch(`/api/listings/${listingId}`, { method: "DELETE" });

    fetchListings();

    if (showMyListingsModal && firebaseUser) {
      fetchMyListings();
    }
    void fetchSellerDashboard();

    showFeedback(
      "success",
      "Listing deleted",
      "The listing was deleted successfully."
    );
  } catch (err: any) {
    showFeedback(
      "error",
      "Delete failed",
      err?.message || "We could not delete the listing."
    );
  }
};

const handleDeleteListing = async (listingId: number) => {
  askConfirm({
    title: "Delete listing",
    message: "Are you sure you want to delete this listing?",
    confirmText: "Delete",
    cancelText: "Cancel",
    danger: true,
    onConfirm: () => {
      closeConfirm();
      void performDeleteListing(listingId);
    },
  });
};

const handleEditListing = (listing: Listing) => {
  setEditingListing(listing);
};

const handleUpdateListing = async (listingId: number, updated: Partial<Listing>) => {
  const existing =
    listings.find((l) => l.id === listingId) ||
    myListings.find((l) => l.id === listingId);

  if (!existing) {
    showFeedback(
      "error",
      "Listing not found",
      "Refresh the page and try again."
    );
    return;
  }

  const payload = {
    name: updated.name ?? existing.name,
    price: Number(updated.price ?? existing.price),
    description: updated.description ?? existing.description ?? "",
    category: updated.category ?? existing.category,
    university: updated.university ?? existing.university,
    photos: updated.photos ?? existing.photos ?? [],
    video_url: updated.video_url ?? existing.video_url ?? null,
    whatsapp_number: updated.whatsapp_number ?? existing.whatsapp_number,
    status: updated.status ?? existing.status ?? "available",
    condition: updated.condition ?? existing.condition ?? "used",
  };

  try {
    await apiFetch(`/api/listings/${listingId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    fetchListings();

    if (showMyListingsModal && firebaseUser) {
      fetchMyListings();
    }
    void fetchSellerDashboard();

    setEditingListing(null);
  } catch (err: any) {
    showFeedback(
      "error",
      "Update failed",
      err?.message || "We could not update the listing."
    );
  }
};

const handleToggleListingStatus = async (listing: Listing) => {
  const nextStatus = listing.status === "sold" ? "available" : "sold";

  try {
    await handleUpdateListing(listing.id, {
      ...listing,
      status: nextStatus,
    });
  } catch (err: any) {
    showFeedback(
      "error",
      "Status update failed",
      err?.message || "We could not update the listing status."
    );
  }
};

  const handleDetailWhatsappClick = async (listing: Listing) => {
  try {
    await fetch(`/api/listings/${listing.id}/whatsapp-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Failed to track detail WhatsApp click", e);
  }

  const message = encodeURIComponent(
    `Hi, I'm interested in your "${listing.name}" on BuyMesho. Is it still available?`
  );

  window.open(`https://wa.me/${listing.whatsapp_number}?text=${message}`, "_blank", "noopener,noreferrer");
};
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("Auth: Starting signup for", authForm.email);

    try {
      let user = auth.currentUser;

      if (!user) {
        console.log("Auth: Creating new user in Firebase...");
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          authForm.email,
          authForm.password
        );
        user = userCredential.user;
        console.log("Auth: User created successfully", user.uid);

        console.log("Auth: Sending verification email...");
        await sendEmailVerification(user);
        console.log("Auth: Verification email sent");
      } else {
        console.log("Auth: User already authenticated, skipping creation", user.uid);
      }

      const profile: UserProfile = {
        uid: user.uid,
        email: authForm.email,
        university: authForm.university,
        avatar_url: "",
        is_verified: false,
        is_seller: false,
        join_date: new Date().toISOString(),
      };

      console.log("Auth: Saving profile to Firestore...");
      await setDoc(doc(firestore, "users", user.uid), profile);
      console.log("Auth: Profile saved to Firestore");

      console.log("Auth: Syncing to SQLite...");
      try {
        await apiFetch("/api/sellers", {
          method: "POST",
          body: JSON.stringify(profile),
        });
      } catch (e: any) {
        console.warn("Auth: SQLite sync failed", e?.message || e);
      }

      setUserProfile(profile);
      showFeedback(
        "success",
        "Account created",
        "Please check your email and verify your account."
      );
      setAuthView("profile");
    } catch (err: any) {
      console.error("Auth: Signup failed", err);
      let message = err.message;

      if (err.code === "auth/email-already-in-use") {
        askConfirm({
          title: "Account already exists",
          message: "This email is already registered. Would you like to log in instead?",
          confirmText: "Go to login",
          cancelText: "Stay here",
          danger: false,
          onConfirm: () => {
            closeConfirm();
            setAuthView("login");
          },
        });
        return;
      }

      if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }

      if (err.code === "auth/weak-password") {
        message = "Password should be at least 6 characters.";
      }

      if (err.message && err.message.includes("blocked")) {
        message = "API Connection Error. Please check your Firebase configuration.";
      }

      showFeedback("error", "Signup failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFirebaseConfigured) {
      showFeedback(
        "error",
        "Firebase not configured",
        "Please add your VITE_FIREBASE_* secrets."
      );
      return;
    }

    setLoading(true);
    console.log("Auth: Attempting login for", authForm.email);

    try {
      console.log("Auth: Calling signInWithEmailAndPassword...");
      const userCredential = await signInWithEmailAndPassword(
        auth,
        authForm.email,
        authForm.password
      );
      console.log("Auth: Login successful", userCredential.user.uid);
    } catch (err: any) {
      console.error("Auth: Login failed", err);
      let message = "Invalid email or password. Please try again.";

      if (err.code === "auth/invalid-credential") {
        askConfirm({
          title: "Login failed",
          message:
            "Invalid email or password. If you've forgotten your password, would you like to reset it now?",
          confirmText: "Reset password",
          cancelText: "Try again",
          danger: false,
          onConfirm: () => {
            closeConfirm();
            setAuthView("forgot");
          },
        });
        return;
      } else if (err.code === "auth/user-not-found") {
        message = "No account found with this email. Please sign up first.";
      } else if (err.code === "auth/wrong-password") {
        message = "Incorrect password. Please try again.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later.";
      } else if (err.message && err.message.includes("blocked")) {
        message = "API Connection Error. Please check your Firebase configuration.";
      }

      showFeedback("error", "Login failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!authForm.email) {
    showFeedback(
      "info",
      "Email required",
      "Please enter your email address first."
    );
    return;
  }

  try {
    await sendPasswordResetEmail(auth, authForm.email);
    showFeedback(
      "success",
      "Reset email sent",
      "Check your email inbox for the password reset link."
    );
    setAuthView("login");
  } catch (err: any) {
    showFeedback(
      "error",
      "Reset failed",
      err?.message || "We could not send the reset email."
    );
  }
};
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (err: any) {
      showFeedback(
        "error",
        "Logout failed",
        err?.message || "We could not log you out."
      );
    }
  };
  const refreshVerificationStatus = async () => {
  if (!firebaseUser) return;

  try {
    // 1) refresh the firebase user object
    await firebaseUser.reload();
    const refreshedUser = auth.currentUser;
    
      if (!refreshedUser?.emailVerified) {
      showFeedback(
       "info",
       "Verification still pending",
       "Please click the verification link in your email, then try again."
    );
      return;
    }

    // 2) update Firestore users/{uid}
    const userRef = doc(firestore, "users", firebaseUser.uid);
    await updateDoc(userRef, { is_verified: true });

    // 3) update your local state so UI updates instantly
    setUserProfile((prev: any) => (prev ? { ...prev, is_verified: true } : prev));

    // 4) sync to SQLite backend (server)
    await apiFetch("/api/sellers", {
  method: "POST",
  body: JSON.stringify({
    email: firebaseUser?.email,
    business_name: userProfile?.business_name || "",
    business_logo: userProfile?.business_logo || "",
    university: userProfile?.university || "",
    bio: userProfile?.bio || "",
    whatsapp_number: userProfile?.whatsapp_number || "",
    is_verified: true,
    is_seller: userProfile?.is_seller ?? true,
    join_date: userProfile?.join_date || new Date().toISOString(),
  }),
});

    showFeedback(
  "success",
  "Email verified",
  "Your account is now verified. You can start selling."
);
  } catch (e: any) {
    console.error(e);
    showFeedback(
      "error",
      "Verification refresh failed",
      e?.message || "We could not refresh your verification status."
    );
  }
};

  const handlePasswordPromptSubmit = async () => {
  try {
    if (!firebaseUser?.email) {
      throw new Error("No email found for this account.");
    }

    if (!reauthPassword.trim()) {
      showFeedback(
        "info",
        "Password required",
        "Please enter your password to continue."
      );
      return;
    }

    const credential = EmailAuthProvider.credential(
      firebaseUser.email,
      reauthPassword
    );

    await reauthenticateWithCredential(auth.currentUser!, credential);

    setPasswordPromptOpen(false);
    setReauthPassword("");

    if (pendingDeleteAfterReauth) {
      setPendingDeleteAfterReauth(false);
      await performDeleteAccount();
    }
  } catch (err: any) {
    showFeedback(
      "error",
      "Reauthentication failed",
      err?.message || "We could not verify your password."
    );
  }
};

const closePasswordPrompt = () => {
  setPasswordPromptOpen(false);
  setReauthPassword("");
  setPendingDeleteAfterReauth(false);
};

const performDeleteAccount = async () => {
  if (!firebaseUser) return;

  try {
    if (!firebaseUser.email) {
      throw new Error("No email found for this account.");
    }

    try {
      await deleteUser(firebaseUser);
    } catch (authErr: any) {
      if (authErr?.code === "auth/requires-recent-login") {
        setPendingDeleteAfterReauth(true);
        setPasswordPromptOpen(true);
        return;
      }
      throw authErr;
    }

    try {
      await apiFetch("/api/profile", { method: "DELETE" });
    } catch (apiErr) {
      console.warn("Backend profile deletion failed:", apiErr);
    }

    try {
      await deleteDoc(doc(firestore, "users", firebaseUser.uid));
    } catch (firestoreErr) {
      console.warn("Firestore profile deletion failed:", firestoreErr);
    }

    showFeedback(
      "success",
      "Account deleted",
      "Your account and profile were removed successfully."
    );
  } catch (err: any) {
    showFeedback(
      "error",
      "Delete account failed",
      err?.message || "We could not delete your account."
    );
  }
};

const handleDeleteAccount = async () => {
  askConfirm({
    title: "Delete account",
    message:
      "Are you sure you want to delete your account? This will permanently remove your profile and all your listings.",
    confirmText: "Delete account",
    cancelText: "Cancel",
    danger: true,
    onConfirm: () => {
      closeConfirm();
      void performDeleteAccount();
    },
  });
};

  const handleSaveAccount = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!firebaseUser || !userProfile) return;

  const updatedProfile: UserProfile = {
    ...userProfile,
    university: editAccountForm.university,
    avatar_url: editAccountForm.avatarUrl,
  };

  try {
    await updateDoc(doc(firestore, "users", firebaseUser.uid), {
      university: updatedProfile.university,
      avatar_url: updatedProfile.avatar_url || "",
    });

    await apiFetch("/api/sellers", {
      method: "POST",
      body: JSON.stringify(updatedProfile),
    });

    setUserProfile(updatedProfile);
    setAuthView("profile");
    showFeedback(
     "success",
     "Account updated",
     "Your account details were saved successfully."
   );
  } catch (err: any) {
    showFeedback(
      "error",
      "Account update failed",
      err?.message || "We could not update your account."
    );
  }
};
  
  const handleSaveProfile = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!firebaseUser || !userProfile) return;

  const updatedProfile: UserProfile = {
    ...userProfile,
    business_name: editProfileForm.businessName,
    business_logo: editProfileForm.logoUrl,
    university: editProfileForm.university,
    bio: editProfileForm.bio,
    whatsapp_number: editProfileForm.whatsappNumber,
  };

  try {
    await updateDoc(doc(firestore, "users", firebaseUser.uid), {
      business_name: updatedProfile.business_name,
      business_logo: updatedProfile.business_logo,
      university: updatedProfile.university,
      bio: updatedProfile.bio || "",
      whatsapp_number: updatedProfile.whatsapp_number || "",
    });

    await apiFetch("/api/profile", {
      method: "PUT",
      body: JSON.stringify({
        business_name: updatedProfile.business_name,
        business_logo: updatedProfile.business_logo,
        university: updatedProfile.university,
        bio: updatedProfile.bio || "",
        whatsapp_number: updatedProfile.whatsapp_number || "",
      }),
    });

    setUserProfile(updatedProfile);
    setAuthView("profile");
    showFeedback(
     "success",
     "Profile updated",
     "Your seller profile was saved successfully."
   );
  } catch (err: any) {
    showFeedback(
      "error",
      "Profile update failed",
      err?.message || "We could not update your profile."
    );
  }
};
  
  const handleBecomeSeller = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!firebaseUser || !userProfile) return;

  try {
    const updatedProfile: UserProfile = {
      ...userProfile,
      is_seller: true,
      business_name: sellerUpgradeForm.businessName,
      business_logo: sellerUpgradeForm.logoUrl,
      university: sellerUpgradeForm.university,
      bio: sellerUpgradeForm.bio,
      whatsapp_number: sellerUpgradeForm.whatsappNumber,
    };

    await updateDoc(doc(firestore, "users", firebaseUser.uid), {
      is_seller: true,
      business_name: updatedProfile.business_name,
      business_logo: updatedProfile.business_logo,
      university: updatedProfile.university,
      bio: updatedProfile.bio || "",
      whatsapp_number: updatedProfile.whatsapp_number || "",
    });

    const upgraded = await apiFetch("/api/profile/become-seller", {
      method: "POST",
      body: JSON.stringify({
        business_name: updatedProfile.business_name,
        business_logo: updatedProfile.business_logo,
        university: updatedProfile.university,
        bio: updatedProfile.bio || "",
        whatsapp_number: updatedProfile.whatsapp_number || "",
      }),
    });

    setUserProfile({
      ...updatedProfile,
      ...(upgraded || {}),
      is_seller: true,
    });

    showFeedback(
      "success",
      "Seller account activated",
      "Your seller profile is now active."
    );
    setAuthView("profile");
  } catch (err: any) {
    showFeedback(
     "error",
     "Seller upgrade failed",
     err?.message || "We could not activate your seller account."
   );
  }
};
  
  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  const remaining = 5 - newListing.photos.length;
  const selected = files.slice(0, remaining);

  if (selected.length < files.length) {
    showFeedback(
      "info",
      "Photo limit reached",
      "You can upload a maximum of 5 photos per listing."
    );
  }

  setUploading(true);
  try {
    const uploadedUrls: string[] = [];

    for (const file of selected) {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/upload/", { method: "POST", body: formData });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(data?.error || "Upload failed");
      uploadedUrls.push(data.url);
    }

    setNewListing((prev) => ({
      ...prev,
      photos: [...prev.photos, ...uploadedUrls].slice(0, 5),
    }));
  } catch (err: any) {
    showFeedback(
  "error",
  "Image upload failed",
  err?.message || "We could not upload the images."
);
  } finally {
    setUploading(false);
    e.target.value = "";
  }
};

const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setUploading(true);
  try {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("/api/upload/", { method: "POST", body: formData });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) throw new Error(data?.error || "Upload failed");

    setNewListing((prev) => ({ ...prev, video_url: data.url }));
  } catch (err: any) {
    showFeedback(
  "error",
  "Video upload failed",
  err?.message || "We could not upload the video."
);
  } finally {
    setUploading(false);
    e.target.value = "";
  }
};
  
  const handleCreateListing = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!userProfile || !firebaseUser) return;

  if (!isSellerAccount) {
  promptSellerUpgrade();
  return;
  }

  try {
    await apiFetch("/api/listings", {
      method: "POST",
      body: JSON.stringify({
        ...newListing,
        price: parseFloat(newListing.price),
        photos: newListing.photos.slice(0, 5),
        video_url: newListing.video_url?.trim() || null,
      }),
    });

    setShowAddModal(false);
    setNewListing({
      name: "",
      price: "",
      description: "",
      category: CATEGORIES[0] as Category,
      university: UNIVERSITIES[0] as University,
      photos: [] as string[],
      video_url: "",
      whatsapp_number: userProfile?.whatsapp_number || "",
      status: "available",
      condition: "used",
    });

    fetchListings();
    void fetchSellerDashboard();
  } catch (err: any) {
    showFeedback(
     "error",
     "Listing creation failed",
     err?.message || "We could not create your listing."
   );
  }
};
  
  const handleReport = (listingId: number) => {
  setReportListingId(listingId);
};

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload/", {
        method: "POST",
        body: formData,
      });
      
      const contentType = res.headers.get("content-type");
      const responseText = await res.text();
      
      if (!res.ok) {
        let errorMessage = "Upload failed";
        try {
          if (contentType && contentType.includes("application/json")) {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            errorMessage = `Server error: ${res.status} ${res.statusText}`;
          }
        } catch (e) {
          errorMessage = `Server error (${res.status}): ${responseText.substring(0, 100)}`;
        }
        throw new Error(errorMessage);
      }

      try {
        if (contentType && contentType.includes("application/json")) {
          const data = JSON.parse(responseText);
        if (data.url) {
           if (authView === "editProfile") {
             setEditProfileForm((prev) => ({ ...prev, logoUrl: data.url }));
           } else if (authView === "becomeSeller") {
             setSellerUpgradeForm((prev) => ({ ...prev, logoUrl: data.url }));
           } else if (authView === "editAccount") {
             setEditAccountForm((prev) => ({ ...prev, avatarUrl: data.url }));
           }
        }
        } else {
          console.error("Non-JSON response:", responseText);
          throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 50)}...`);
        }
      } catch (err) {
        console.error("Parse error:", err, "Response was:", responseText);
        throw new Error("Failed to parse server response");
      }
    } catch (err) {
      console.error("Upload failed", err);
      showFeedback(
       "error",
       "Upload failed",
       err instanceof Error ? err.message : "Image upload failed. Please try again."
     );
    } finally {
      setUploading(false);
    }
  };

  return (
   <div className="min-h-screen pb-20 bg-zinc-100">
      <Header 
        onSearch={setSearch} 
        onAddListing={() => {
  if (!isSellerAccount) {
    promptSellerUpgrade();
    return;
  }

  setNewListing((prev) => ({
    ...prev,
    whatsapp_number: userProfile?.whatsapp_number || ""
  }));
  setShowAddModal(true);
}}
          onProfileClick={() => setShowProfileModal(true)}
          userProfile={userProfile}
          firebaseUser={firebaseUser}
      />

      <main className="max-w-7xl mx-auto px-4">
        <HeroSection
    onStartSelling={() => {
  if (!isSellerAccount) {
    promptSellerUpgrade();
    return;
  }

  setNewListing((prev) => ({
    ...prev,
    whatsapp_number: userProfile?.whatsapp_number || "",
  }));
  setShowAddModal(true);
}}
  />     
        <MarketSection
  loading={loading}
  listings={listings}
  hiddenSellerUids={hiddenSellerUids}
  selectedUniv={selectedUniv}
  setSelectedUniv={setSelectedUniv}
  selectedCat={selectedCat}
  setSelectedCat={setSelectedCat}
  sortBy={sortBy}
  setSortBy={setSortBy}
  firebaseUserUid={firebaseUser?.uid}
  isLoggedIn={!!firebaseUser}
  savedListingIds={savedListingIds}
  onReport={handleReport}
  onDelete={handleDeleteListing}
  onOpenProfile={openPublicProfile}
  onEdit={handleEditListing}
  onOpenDetails={openDetails}
  onHideSeller={hideSellerLocal}
  onToggleStatus={handleToggleListingStatus}
  onToggleSave={toggleSavedListing}
  requireLoginForContact={requireLoginForContact}
/>
      </main>

      <footer className="mt-20 border-t border-zinc-100 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-900 rounded-xl flex items-center justify-center text-white font-extrabold text-sm">
              B
            </div>
            <span className="text-sm font-bold text-zinc-900">
              <span className="text-red-900">Buy</span><span className="text-zinc-700">Mesho</span> Malawi
            </span>
          </div>
          
          <div className="flex items-center gap-8 text-xs font-bold text-zinc-400 uppercase tracking-widest">
            <button
              type="button"
              onClick={() => openFooterView("privacy")}
              className="hover:text-primary transition-colors"
            >
              Privacy
            </button>

            <button
              type="button"
              onClick={() => openFooterView("terms")}
              className="hover:text-primary transition-colors"
            >
              Terms
            </button>

            <button
              type="button"
              onClick={() => openFooterView("safety")}
              className="hover:text-primary transition-colors"
            >
              Safety
            </button>

            <button
              type="button"
              onClick={() => openFooterView("report")}
              className="hover:text-primary transition-colors"
            >
              Contact
            </button>
          </div>

          <div className="text-xs font-bold text-zinc-300">
            © 2026 Crafted for Students
          </div>
        </div>
      </footer>

      {/* --- Modals --- */}

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Create Listing</h2>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Post your item to the campus</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2.5 hover:bg-white hover:shadow-md rounded-2xl transition-all border border-transparent hover:border-zinc-100">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {!isSellerAccount ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Seller Account Required</h3>
                  <p className="text-zinc-500 mb-6">
                    You need a seller account before you can post listings.
                  </p>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setShowProfileModal(true);
                    }}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors"
                  >
                    Back to Profile
                  </button>
                </div>
              ) : !userProfile ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Seller Profile Required</h3>
                  <p className="text-zinc-500 mb-6">You need to create a business profile before you can post listings.</p>
                  <button 
                    onClick={() => { setShowAddModal(false); setShowProfileModal(true); }}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors"
                  >
                    Create Profile
                  </button>
                </div>
              ) : !firebaseUser?.emailVerified ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Email Verification Required</h3>
                  <p className="text-zinc-500 mb-6">Please verify your email to post listings. Check your inbox for the verification link.</p>
                  <div className="space-y-3">
                    <button 
                      onClick={refreshVerificationStatus}
                      className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> I've Verified
                    </button>
                    <button 
                      onClick={async () => {
                        if (firebaseUser) {
                          await sendEmailVerification(firebaseUser);
                         showFeedback(
                           "success",
                           "Verification email resent",
                           "Check your inbox for the new verification email."
                         );
                        }
                      }}
                      className="text-primary text-sm font-bold hover:underline"
                    >
                      Resend Verification Email
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateListing} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Product Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                      value={newListing.name}
                      onChange={e => setNewListing({...newListing, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Price (MK)</label>
                      <input 
                        required
                        type="number" 
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                        value={newListing.price}
                        onChange={e => setNewListing({...newListing, price: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">WhatsApp Number</label>
                      <input 
                        required
                        type="text" 
                        placeholder="265..."
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                        value={newListing.whatsapp_number}
                        onChange={e => setNewListing({...newListing, whatsapp_number: e.target.value})}
                      />
                    </div>
                  </div>
                  <FormDropdown
                    label="Condition"
                    value={newListing.condition}
                    options={["new", "used", "refurbished"]}
                    onChange={(value) =>
                    setNewListing({
                      ...newListing,
                      condition: value as "new" | "used" | "refurbished",
                    })
                   }
                 />
                  <div className="grid grid-cols-2 gap-4">
                  <FormDropdown
                    label="Category"
                    value={newListing.category}
                    options={CATEGORIES}
                    onChange={(value) =>
                      setNewListing({ ...newListing, category: value as Category })
                    }
                 />
                    <FormDropdown
                      label="University"
                      value={newListing.university}
                      options={UNIVERSITIES}
                      onChange={(value) =>
                        setNewListing({ ...newListing, university: value as University })
                      }
                   />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Description</label>
                    <textarea 
                      required
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-24 resize-none"
                      value={newListing.description}
                      onChange={e => setNewListing({...newListing, description: e.target.value})}
                    />
                  </div>
                  <div>
  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
    Photos (max 5)
  </label>

  {newListing.photos.length > 0 && (
    <div className="grid grid-cols-3 gap-3 mb-3">
      {newListing.photos.map((url, idx) => (
        <div
          key={`${url}-${idx}`}
          className="relative aspect-square rounded-xl overflow-hidden border bg-zinc-100"
        >
          <img
            src={url}
            alt={`Photo ${idx + 1}`}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() =>
              setNewListing((prev) => ({
                ...prev,
                photos: prev.photos.filter((_, i) => i !== idx),
              }))
            }
            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )}

  <input
    type="file"
    accept="image/*"
    multiple
    onChange={handleImagesUpload}
    disabled={uploading || newListing.photos.length >= 5}
    className="w-full"
  />
</div>

<div className="mt-4">
  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
    Video (optional, 1)
  </label>

  {newListing.video_url ? (
    <div className="relative rounded-xl overflow-hidden border bg-zinc-100 mb-3">
      <video src={newListing.video_url} controls className="w-full" />
      <button
        type="button"
        onClick={() => setNewListing((prev) => ({ ...prev, video_url: "" }))}
        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : null}

  <input
    type="file"
    accept="video/*"
    onChange={handleVideoUpload}
    disabled={uploading || !!newListing.video_url}
    className="w-full"
  />
</div>
                  <button 
                    type="submit"
                    disabled={uploading}
                    className={`w-full bg-primary text-white py-3 rounded-xl font-bold transition-colors mt-4 ${uploading ? "opacity-50 cursor-not-allowed" : "hover:bg-primary-dark"}`}
                  >
                    {uploading ? "Please wait..." : "Post Listing"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {showProfileModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xl font-display">
                  {authView === 'login' && "Welcome Back"}
                  {authView === 'signup' && "Join BuyMesho"}
                  {authView === 'forgot' && "Reset Password"}
                  {authView === 'editProfile' && "Edit Profile"}
                  {authView === 'becomeSeller' && "Become a Seller"}
                  {authView === 'profile' && "My Profile"}
                  {authView === 'editAccount' && "Edit Account"}
                </h2>
                <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[80vh] overflow-y-auto">
                {!isFirebaseConfigured ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Firebase Not Configured</h3>
                    <p className="text-zinc-500 mb-6">The authentication system is currently offline because the Firebase environment variables are missing. Please configure them in the AI Studio Secrets panel.</p>
                  </div>
                ) : firestoreError ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Connection Issue</h3>
                    <p className="text-zinc-500 mb-4">We're having trouble connecting to the database.</p>
                    <div className="bg-zinc-50 p-3 rounded-lg text-xs font-mono text-zinc-600 mb-6 break-all">
                      {firestoreError}
                    </div>
                    <button 
                      onClick={() => window.location.reload()}
                      className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors"
                    >
                      Retry Connection
                    </button>
                  </div>
                ) : null}

                {isFirebaseConfigured && !firestoreError && authView === 'login' && (
                  <form onSubmit={handleLogin} className="p-8 space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input 
                            required
                            type="email" 
                            className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                            value={authForm.email}
                            onChange={e => setAuthForm({...authForm, email: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input 
                            required
                            type={showPassword ? "text" : "password"} 
                            className="w-full pl-10 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                            value={authForm.password}
                            onChange={e => setAuthForm({...authForm, password: e.target.value})}
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setAuthView('forgot')}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Forgot Password?
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
                    </button>
                    <p className="text-center text-sm text-zinc-500">
                      Don't have an account?{" "}
                      <button type="button" onClick={() => setAuthView('signup')} className="text-primary font-bold hover:underline">Sign Up</button>
                    </p>
                    {firebaseUser && (
                      <div className="pt-4 border-t border-zinc-100 text-center">
                        <button 
                          type="button" 
                          onClick={() => signOut(auth)} 
                          className="text-xs font-bold text-red-500 hover:underline flex items-center justify-center gap-1 mx-auto"
                        >
                          <LogOut className="w-3 h-3" /> Sign Out of Current Session
                        </button>
                      </div>
                    )}
                  </form>
                )}
      
 {isFirebaseConfigured && !firestoreError && authView === 'signup' && (
  <form onSubmit={handleSignUp} className="p-8 space-y-4">
 <FormDropdown
  label="University"
  value={authForm.university}
  options={UNIVERSITIES}
  onChange={(value) =>
    setAuthForm({ ...authForm, university: value as University })
  }
/>

  <div>
    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Email Address</label>
    <input
      required
      type="email"
      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
      value={authForm.email}
      onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
    />
  </div>

  <div>
    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Password</label>
    <input
      required
      type="password"
      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
      value={authForm.password}
      onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
    />
  </div>

  <button
    type="submit"
    disabled={loading}
    className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
  >
    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
  </button>

  <p className="text-center text-sm text-zinc-500">
    Already have an account?{" "}
    <button type="button" onClick={() => setAuthView('login')} className="text-primary font-bold hover:underline">
       Log In
      </button>
    </p>
  </form> 
)}

                {isFirebaseConfigured && !firestoreError && authView === 'forgot' && (
                  <form onSubmit={handleForgotPassword} className="p-8 space-y-4">
                    <p className="text-sm text-zinc-500">Enter your email address and we'll send you a link to reset your password.</p>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Email Address</label>
                      <input 
                        required
                        type="email" 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                        value={authForm.email}
                        onChange={e => setAuthForm({...authForm, email: e.target.value})}
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-dark transition-colors"
                    >
                      Send Reset Link
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setAuthView('login')}
                      className="w-full text-sm font-bold text-zinc-500 hover:underline"
                    >
                      Back to Login
                    </button>
                  </form>
                )}
    {isFirebaseConfigured && !firestoreError && authView === 'editAccount' && userProfile && (
  <form onSubmit={handleSaveAccount} className="p-8 space-y-4">
    <FormDropdown
      label="University"
      value={editAccountForm.university}
      options={UNIVERSITIES}
      onChange={(value) =>
        setEditAccountForm({
         ...editAccountForm,
         university: value as University,
       })
      }
    />

    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Profile Picture</label>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden flex-shrink-0">
          {editAccountForm.avatarUrl ? (
            <img src={editAccountForm.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400">
              <User className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="account-avatar-upload"
          />
          <label
            htmlFor="account-avatar-upload"
            className="inline-block px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-bold cursor-pointer transition-colors"
          >
            {uploading ? "Uploading..." : "Upload Photo"}
          </label>
        </div>
      </div>
    </div>

    <button type="submit" disabled={uploading} className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-colors">Save Changes</button>
    <button type="button" onClick={() => setAuthView("profile")} className="w-full text-sm font-bold text-zinc-500 hover:underline">Back to Profile</button>
  </form>
)}

 {isFirebaseConfigured && !firestoreError && authView === 'editProfile' && userProfile && (
  <form onSubmit={handleSaveProfile} className="p-8 space-y-4">
    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Business Name</label>
      <input
        required
        type="text"
        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
        value={editProfileForm.businessName}
        onChange={e => setEditProfileForm({ ...editProfileForm, businessName: e.target.value })}
      />
    </div>

    <FormDropdown
      label="University"
      value={editProfileForm.university}
      options={UNIVERSITIES}
      onChange={(value) =>
        setEditProfileForm({
          ...editProfileForm,
          university: value as University,
        })
      }
    />

    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">WhatsApp Number</label>
      <input
        type="text"
        placeholder="265..."
        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
        value={editProfileForm.whatsappNumber}
        onChange={e => setEditProfileForm({ ...editProfileForm, whatsappNumber: e.target.value })}
      />
    </div>

    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Business Logo</label>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden flex-shrink-0">
          {editProfileForm.logoUrl ? (
            <img src={editProfileForm.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400">
              <Camera className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="edit-logo-upload"
          />
          <label
            htmlFor="edit-logo-upload"
            className="inline-block px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-bold cursor-pointer transition-colors"
          >
            {uploading ? "Uploading..." : "Upload Logo"}
          </label>
        </div>
      </div>
    </div>

    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Short Bio</label>
      <textarea
        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-20 resize-none"
        value={editProfileForm.bio}
        onChange={e => setEditProfileForm({ ...editProfileForm, bio: e.target.value })}
      />
    </div>

    <button
      type="submit"
      disabled={uploading}
      className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
    >
      Save Changes
    </button>

    <button
      type="button"
      onClick={() => setAuthView("profile")}
      className="w-full text-sm font-bold text-zinc-500 hover:underline"
    >
      Back to Profile
    </button>
  </form>
)}

                {isFirebaseConfigured && !firestoreError && authView === 'becomeSeller' && userProfile && (
  <form onSubmit={handleBecomeSeller} className="p-8 space-y-4">
    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Business Name</label>
      <input
        required
        type="text"
        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
        value={sellerUpgradeForm.businessName}
        onChange={e => setSellerUpgradeForm({ ...sellerUpgradeForm, businessName: e.target.value })}
      />
    </div>

     <FormDropdown
        label="University"
        value={sellerUpgradeForm.university}
        options={UNIVERSITIES}
        onChange={(value) =>
          setSellerUpgradeForm({
            ...sellerUpgradeForm,
            university: value as University,
          })
        }
      />

    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">WhatsApp Number</label>
      <input
        required
        type="text"
        placeholder="265..."
        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
        value={sellerUpgradeForm.whatsappNumber}
        onChange={e => setSellerUpgradeForm({ ...sellerUpgradeForm, whatsappNumber: e.target.value })}
      />
    </div>

    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Business Logo</label>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden flex-shrink-0">
          {sellerUpgradeForm.logoUrl ? (
            <img src={sellerUpgradeForm.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400">
              <Camera className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="seller-logo-upload"
          />
          <label
            htmlFor="seller-logo-upload"
            className="inline-block px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-bold cursor-pointer transition-colors"
          >
            {uploading ? "Uploading..." : "Upload Logo"}
          </label>
        </div>
      </div>
    </div>

    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Short Bio</label>
      <textarea
        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-20 resize-none"
        value={sellerUpgradeForm.bio}
        onChange={e => setSellerUpgradeForm({ ...sellerUpgradeForm, bio: e.target.value })}
      />
    </div>

    <button
      type="submit"
      disabled={uploading}
      className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
    >
      Activate Seller Account
    </button>

    <button
      type="button"
      onClick={() => setAuthView("profile")}
      className="w-full text-sm font-bold text-zinc-500 hover:underline"
    >
      Back to Profile
    </button>
  </form>
)}

                {isFirebaseConfigured && !firestoreError && authView === 'profile' && userProfile && (
                  <div className="p-8 text-center">
                    {!firebaseUser?.emailVerified && (
                      <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-xs font-medium space-y-3">
                        <div className="flex items-center gap-2 justify-center">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Verify your email to post listings</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={refreshVerificationStatus}
                            className="w-full bg-amber-100 hover:bg-amber-200 text-amber-800 py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                          >
                            <RefreshCw className="w-3 h-3" /> I've Verified
                          </button>
                          <button
                            onClick={async () => {
                              if (firebaseUser) {
                                try {
                                  await sendEmailVerification(firebaseUser);
                                  showFeedback(
                                   "success",
                                   "Verification email resent",
                                   "Check your inbox for the new verification email."
                                 );
                                } catch (e: any) {
                                  showFeedback(
                                    "error",
                                    "Resend failed",
                                    e?.message || "We could not resend the verification email."
                                  );
                                }
                              }
                            }}
                            className="text-amber-600 hover:underline font-bold"
                          >
                            Resend Email
                          </button>
                        </div>
                      </div>
                    )}

                    {isSellerAccount ? (
                      <>
                        <div className="relative w-24 h-24 mx-auto mb-4">
                          <img
                            src={userProfile.business_logo}
                            alt="Logo"
                            className="w-full h-full rounded-full object-cover border-4 border-zinc-50 shadow-sm"
                          />
                          {userProfile.is_verified && (
                            <div className="absolute -right-1 -bottom-1 bg-white rounded-full p-1 shadow-sm">
                              <ShieldCheck className="w-5 h-5 text-blue-500 fill-blue-50" />
                            </div>
                          )}
                        </div>

                        <h3 className="text-2xl font-display mb-1">
                          {userProfile.business_name || "Seller Profile"}
                        </h3>

                        <p className="text-zinc-500 text-sm mb-4 flex items-center justify-center gap-1">
                          <MapPin className="w-4 h-4" /> {userProfile.university || "University not set"}
                        </p>

                        {userProfile.bio && (
                          <p className="text-sm text-zinc-600 mb-6 max-w-xs mx-auto italic">
                            "{userProfile.bio}"
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                       <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden">
                       {userProfile.avatar_url ? (
                          <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-zinc-400" />
                        )}
                      </div>
                        <h3 className="text-2xl font-display mb-1">My Account</h3>
                        <p className="text-zinc-500 text-sm mb-4 flex items-center justify-center gap-1">
                          <MapPin className="w-4 h-4" /> {userProfile.university || "University not set"}
                        </p>
                      </>
                    )}

                    <div className="bg-zinc-50 rounded-2xl p-4 text-left mb-6 space-y-3">
                      <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Email</p>
                        <p className="text-zinc-700 font-medium">{userProfile.email}</p>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase mb-1">University</p>
                        <p className="text-zinc-700 font-medium">{userProfile.university || "Not added"}</p>
                      </div>

                      {isSellerAccount && (
                        <div>
                          <p className="text-xs font-bold text-zinc-400 uppercase mb-1">WhatsApp</p>
                          <p className="text-zinc-700 font-medium">
                            {userProfile.whatsapp_number || "Not added"}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Member Since</p>
                        <p className="text-zinc-700 font-medium">
                          {new Date(userProfile.join_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

        {isSellerAccount && (
  <div className="bg-zinc-50 rounded-2xl p-4 text-left mb-6 space-y-3">
    <p className="text-xs font-bold text-zinc-400 uppercase">Seller Dashboard</p>

    {sellerDashboardLoading ? (
      <p className="text-sm text-zinc-500">Loading dashboard...</p>
    ) : sellerDashboard ? (
      <>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white rounded-xl p-3 border border-zinc-200">
            <p className="text-xs text-zinc-400 font-bold uppercase">Active</p>
            <p className="text-lg font-extrabold text-zinc-900">
              {sellerDashboard.stats.active_listings}
            </p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-zinc-200">
            <p className="text-xs text-zinc-400 font-bold uppercase">Sold</p>
            <p className="text-lg font-extrabold text-zinc-900">
              {sellerDashboard.stats.sold_listings}
            </p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-zinc-200">
            <p className="text-xs text-zinc-400 font-bold uppercase">Views</p>
            <p className="text-lg font-extrabold text-zinc-900">
              {sellerDashboard.stats.total_views}
            </p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-zinc-200">
            <p className="text-xs text-zinc-400 font-bold uppercase">WhatsApp Clicks</p>
            <p className="text-lg font-extrabold text-zinc-900">
              {sellerDashboard.stats.total_whatsapp_clicks}
            </p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-zinc-200">
            <p className="text-xs text-zinc-400 font-bold uppercase">Profile Views</p>
            <p className="text-lg font-extrabold text-zinc-900">
              {sellerDashboard.seller.profile_views}
            </p>
          </div>

          <div className="bg-white rounded-xl p-3 border border-zinc-200">
            <p className="text-xs text-zinc-400 font-bold uppercase">Repeat Seller</p>
            <p className="text-lg font-extrabold text-zinc-900">
              {sellerDashboard.stats.repeat_seller_activity ? "Yes" : "No"}
            </p>
          </div>
        </div>

        {sellerDashboard.top_listing && (
          <div className="bg-white rounded-xl p-3 border border-zinc-200">
            <p className="text-xs text-zinc-400 font-bold uppercase mb-1">Top Listing</p>
            <p className="font-bold text-zinc-900">{sellerDashboard.top_listing.name}</p>
            <p className="text-sm text-zinc-500 mt-1">
              {sellerDashboard.top_listing.views_count} views • {sellerDashboard.top_listing.whatsapp_clicks} WhatsApp clicks
            </p>
          </div>
        )}
      </>
    ) : (
      <p className="text-sm text-zinc-500">No dashboard data yet.</p>
    )}
  </div>
)}

                    <div className="bg-zinc-50 rounded-2xl p-4 text-left mb-6 space-y-4">
                      <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Hidden Sellers</p>
                        {hiddenSellerUids.length ? (
                          <div className="space-y-2">
                            {hiddenSellerUids.map((uid) => (
                              <button
                                key={uid}
                                onClick={() => unhideSellerLocal(uid)}
                                className="w-full text-left px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-100"
                              >
                                {sellerNameMap[uid] ? `Unhide ${sellerNameMap[uid]}` : "Unhide seller"}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-500">No hidden sellers.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {isSellerAccount && (
                        <button
                          onClick={openMyListings}
                          className="w-full bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <Package className="w-4 h-4" /> My Listings
                        </button>
                      )}

                      <button
                        onClick={() => setShowSavedModal(true)}
                        className="w-full bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <Bookmark className="w-4 h-4" /> Saved Items
                      </button>

                      {!isSellerAccount && (
  <button
    onClick={() => {
      setEditAccountForm({
        university: userProfile?.university || UNIVERSITIES[0],
        avatarUrl: userProfile?.avatar_url || "",
      });
      setAuthView("editAccount");
    }}
    className="w-full bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-900 py-3 rounded-xl font-bold transition-colors"
  >
    Edit Account
  </button>
)}

{!isSellerAccount && (
  <button
    onClick={() => {
      setSellerUpgradeForm({
        businessName: userProfile?.business_name || "",
        university: userProfile?.university || UNIVERSITIES[0],
        logoUrl: userProfile?.business_logo || "",
        bio: userProfile?.bio || "",
        whatsappNumber: userProfile?.whatsapp_number || "",
      });
      setAuthView("becomeSeller");
    }}
    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-3 rounded-xl font-bold transition-colors"
  >
    Become a Seller
  </button>
)}
                      
{isSellerAccount && (
  <button
    onClick={() => {
      if (!userProfile) return;
      setEditProfileForm({
        businessName: userProfile.business_name || "",
        university: userProfile.university || UNIVERSITIES[0],
        logoUrl: userProfile.business_logo || "",
        bio: userProfile.bio || "",
        whatsappNumber: userProfile.whatsapp_number || ""
      });
      setAuthView("editProfile");
    }}
    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-3 rounded-xl font-bold transition-colors"
  >
    Edit Profile
  </button>
)}

                      <button
                        onClick={openSettings}
                        className="w-full bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </button>

                      {isAdminUser && (
                        <button
                          onClick={() => setShowAdminReportsModal(true)}
                          className="w-full bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4" /> Admin Reports
                        </button>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-4 h-4" /> Log Out
                      </button>

                      <button
                        onClick={handleDeleteAccount}
                        className="text-red-500 text-xs font-bold hover:underline"
                      >
                        Delete Account & Profile
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

  {showMyListingsModal && (
  <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setShowMyListingsModal(false)}
      className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
    />

    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
    >
      <div className="p-6 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900">My Listings</h2>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
            Manage your posts
          </p>
        </div>

        <button
          onClick={() => setShowMyListingsModal(false)}
          className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        {myListingsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-zinc-500 font-medium">Loading your listings...</p>
          </div>
        ) : myListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onReport={handleReport}
                currentUid={firebaseUser?.uid}
                onDelete={handleDeleteListing}
                onEdit={handleEditListing}
                onOpenProfile={openPublicProfile}
                onOpenDetails={openDetails}
                onHideSeller={hideSellerLocal}
                onToggleStatus={handleToggleListingStatus}
                isSaved={savedListingIds.includes(listing.id)}
                onToggleSave={toggleSavedListing}
                isLoggedIn={!!firebaseUser}
                requireLoginForContact={requireLoginForContact}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">No listings yet</h3>
            <p className="text-zinc-500 mb-6">
              You have not posted anything yet.
            </p>
            <button
              onClick={() => {
                setShowMyListingsModal(false);
                setNewListing((prev) => ({
                  ...prev,
                  whatsapp_number: userProfile?.whatsapp_number || ""
                }));
                setShowAddModal(true);
              }}
              className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-3 rounded-xl font-bold transition-colors"
            >
              Create Your First Listing
            </button>
          </div>
        )}
      </div>
    </motion.div>
  </div>
)}

  {showSavedModal && (
  <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setShowSavedModal(false)}
      className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
    />

    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
    >
      <div className="p-6 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900">Saved Items</h2>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
            Your saved listings
          </p>
        </div>

        <button
          onClick={() => setShowSavedModal(false)}
          className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        {savedListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onReport={handleReport}
                currentUid={firebaseUser?.uid}
                onDelete={handleDeleteListing}
                onEdit={handleEditListing}
                onOpenProfile={openPublicProfile}
                onOpenDetails={openDetails}
                onHideSeller={hideSellerLocal}
                onToggleStatus={handleToggleListingStatus}
                isSaved={savedListingIds.includes(listing.id)}
                onToggleSave={toggleSavedListing}
                isLoggedIn={!!firebaseUser}
                requireLoginForContact={requireLoginForContact}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">No saved items yet</h3>
            <p className="text-zinc-500">
              Save products you may want to buy later.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  </div>
)}

  {publicProfileOpen && (
  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
      onClick={() => setPublicProfileOpen(false)}
    />

    <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
        <button
          type="button"
          onClick={() => setPublicProfileOpen(false)}
          className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-bold"
        >
          ← Back
        </button>

        <h2 className="text-xl font-bold">Profile</h2>

        <button
          type="button"
          onClick={() => setPublicProfileOpen(false)}
          className="p-2 hover:bg-zinc-100 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="p-6 overflow-y-auto flex-1">
        {publicProfileLoading ? (
          <div className="flex items-center justify-center py-16 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading profile...</span>
          </div>
        ) : publicProfile ? (
          <>
            <div className="flex items-center gap-4 mb-6">
              <img
                src={publicProfile.business_logo}
                alt={publicProfile.business_name}
                className="w-20 h-20 rounded-2xl object-cover border"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-extrabold">
                    {publicProfile.business_name}
                  </h3>
                  {publicProfile.is_verified ? (
                    <ShieldCheck className="w-5 h-5 text-blue-500" />
                  ) : null}
                </div>
                <p className="text-sm text-zinc-500">{publicProfile.university}</p>
                {publicProfile.bio ? (
                  <p className="text-sm text-zinc-700 mt-2 italic">
                    “{publicProfile.bio}”
                  </p>
                ) : null}
              </div>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-4 mb-6 border border-zinc-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Seller Rating</p>

                  {ratingLoading ? (
                    <p className="text-sm text-zinc-500">Loading rating...</p>
                  ) : ratingSummary ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-extrabold text-zinc-900">
                        {ratingSummary.averageRating.toFixed(1)}
                      </span>
                      <span className="text-amber-500 text-base tracking-wide">
                        {"★".repeat(Math.round(ratingSummary.averageRating))}
                        {"☆".repeat(5 - Math.round(ratingSummary.averageRating))}
                      </span>
                      <span className="text-zinc-500">
                        ({ratingSummary.ratingCount} rating{ratingSummary.ratingCount === 1 ? "" : "s"})
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      {firebaseUser ? "No ratings yet." : "Log in to view and leave ratings."}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = (ratingSummary?.myRating ?? 0) >= star;

                      return (
                        <button
                          key={star}
                          type="button"
                          disabled={ratingSubmitting || !publicProfile?.uid || publicProfile?.uid === firebaseUser?.uid}
                          onClick={() => handleRateSeller(publicProfile.uid, star)}
                          className={`text-2xl leading-none transition-transform ${
                            active ? "text-amber-500" : "text-zinc-300"
                          } ${
                            ratingSubmitting || publicProfile?.uid === firebaseUser?.uid
                              ? "cursor-not-allowed opacity-60"
                              : "hover:scale-110"
                          }`}
                          aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                        >
                          ★
                        </button>
                      );
                    })}
                  </div>

                  {publicProfile?.uid === firebaseUser?.uid ? (
                    <p className="text-xs text-zinc-500 font-medium">
                      You cannot rate yourself.
                    </p>
                  ) : ratingSummary?.myRating ? (
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-zinc-500 font-medium">
                        Your rating: {ratingSummary.myRating}/5
                      </p>
                      <button
                        type="button"
                        disabled={ratingSubmitting || !publicProfile?.uid}
                        onClick={() => handleRemoveSellerRating(publicProfile.uid)}
                        className="text-xs font-bold text-red-600 hover:underline disabled:opacity-60"
                      >
                        Remove rating
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 font-medium">
                      Tap a star to rate this seller.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-bold">Listings</h4>
              <span className="text-xs text-zinc-400 font-bold">
                {publicProfileListings.length} item(s)
              </span>
            </div>

            {publicProfileListings.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicProfileListings
                  .filter(
                    (l) =>
                      !hiddenSellerUids.includes(l.seller_uid)
                  )
                  .map((l) => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    onReport={handleReport}
                    currentUid={firebaseUser?.uid}
                    onDelete={handleDeleteListing}
                    onEdit={handleEditListing}
                    onOpenProfile={openPublicProfile}
                    onOpenDetails={openDetails}
                    onHideSeller={hideSellerLocal}
                   onToggleStatus={handleToggleListingStatus}
                   isSaved={savedListingIds.includes(l.id)}
                   onToggleSave={toggleSavedListing}
                   isLoggedIn={!!firebaseUser}
                   requireLoginForContact={requireLoginForContact}
                  />
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-zinc-500">
                No listings yet.
              </div>
            )}
          </>
        ) : (
          <div className="py-10 text-center text-zinc-500">Profile not found.</div>
        )}
      </div>
    </div>
  </div>
)}
        
{detailsOpen && detailsListing && (
  <motion.div
    key="details-modal"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm"
    onClick={closeDetails}
  >
    <motion.div
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0.95 }}
      className="relative w-full max-w-3xl mx-4 bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 border-b flex items-center justify-between">
        <button
          type="button"
          onClick={closeDetails}
          className="p-2 rounded-full hover:bg-zinc-100"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold flex-1 text-center truncate px-2">
          {detailsListing.name}
        </h2>

        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="relative rounded-2xl overflow-hidden bg-zinc-100">
          <img
            src={
              detailsListing.photos?.[galleryIndex] ||
              `https://picsum.photos/seed/${detailsListing.id}/800/800`
            }
            alt={detailsListing.name}
            className="w-full object-contain max-h-[60vh]"
          />

          {detailsListing.photos?.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between px-2">
              <button
                type="button"
                onClick={() => setGalleryIndex((i) => Math.max(0, i - 1))}
                className="p-2 bg-white/80 hover:bg-white rounded-full"
                disabled={galleryIndex === 0}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() =>
                  setGalleryIndex((i) =>
                    Math.min(detailsListing.photos.length - 1, i + 1)
                  )
                }
                className="p-2 bg-white/80 hover:bg-white rounded-full"
                disabled={galleryIndex === detailsListing.photos.length - 1}
              >
                ›
              </button>
            </div>
          )}
        </div>
        
 {detailsListing.photos?.length > 1 && (
  <div className="flex gap-2 overflow-x-auto pb-1">
    {detailsListing.photos.map((url, idx) => (
      <button
        key={idx}
        type="button"
        onClick={() => setGalleryIndex(idx)}
        className={`w-16 h-16 rounded-xl overflow-hidden border flex-shrink-0 ${
          idx === galleryIndex ? "border-zinc-900" : "border-zinc-200"
        }`}
        aria-label={`View photo ${idx + 1}`}
      >
        <img src={url} alt="" className="w-full h-full object-cover" />
      </button>
     ))}
   </div>
  )}
        
  {detailsListing.video_url ? (
    <div className="rounded-2xl overflow-hidden border bg-black">
      <video src={detailsListing.video_url} controls className="w-full" />
    </div>
  ) : null}

<div className="space-y-4">
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-2xl font-extrabold text-zinc-900">
        MK {Number(detailsListing.price).toLocaleString()}
      </p>
      <p className="text-sm text-zinc-500 mt-1">
        Listed by {detailsListing.business_name}
        {detailsSellerProfile?.university ? ` · ${detailsSellerProfile.university}` : ""}
      </p>
    </div>

    <span className="px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-bold uppercase">
      {detailsListing.category}
    </span>
  </div>

  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100">
      <p className="text-[11px] font-bold text-zinc-400 uppercase">Condition</p>
      <p className="text-sm font-bold text-zinc-900 mt-1 capitalize">
        {detailsListing.condition || "used"}
      </p>
    </div>

    <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100">
      <p className="text-[11px] font-bold text-zinc-400 uppercase">Posted</p>
      <p className="text-sm font-bold text-zinc-900 mt-1">
        {new Date(detailsListing.created_at).toLocaleDateString()}
      </p>
    </div>

    <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100">
      <p className="text-[11px] font-bold text-zinc-400 uppercase">Views</p>
      <p className="text-sm font-bold text-zinc-900 mt-1">
        {detailsListing.views_count ?? 0}
      </p>
    </div>

    <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100">
      <p className="text-[11px] font-bold text-zinc-400 uppercase">Seller Joined</p>
      <p className="text-sm font-bold text-zinc-900 mt-1">
        {detailsSellerProfile?.join_date
          ? new Date(detailsSellerProfile.join_date).toLocaleDateString()
          : "—"}
      </p>
    </div>
  </div>

  <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
    <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Seller Rating</p>

    {detailsLoadingExtra ? (
      <p className="text-sm text-zinc-500">Loading seller info...</p>
    ) : detailsRatingSummary ? (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-extrabold text-zinc-900">
          {detailsRatingSummary.averageRating.toFixed(1)}
        </span>
        <span className="text-amber-500 text-base tracking-wide">
          {"★".repeat(Math.round(detailsRatingSummary.averageRating))}
          {"☆".repeat(5 - Math.round(detailsRatingSummary.averageRating))}
        </span>
        <span className="text-zinc-500">
          ({detailsRatingSummary.ratingCount} rating{detailsRatingSummary.ratingCount === 1 ? "" : "s"})
        </span>
      </div>
    ) : (
      <p className="text-sm text-zinc-500">No ratings yet.</p>
    )}
  </div>

  <button
    type="button"
    onClick={() => handleDetailWhatsappClick(detailsListing)}
    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-3.5 rounded-2xl font-extrabold transition-colors"
  >
    Contact Seller on WhatsApp
  </button>
</div>
        
        <div>
          <div className="text-xs font-bold text-zinc-400 uppercase mb-1">
            Description
          </div>
          <div className="text-sm text-zinc-700 whitespace-pre-wrap">
            {detailsListing.description}
          </div>
        </div>
      </div>
    </motion.div>
  </motion.div>
)}
       
{showSettingsModal && userProfile && settingsView === "menu" && (
  <SettingsModal
    userProfile={userProfile}
    firebaseUser={firebaseUser}
    isSellerAccount={isSellerAccount}
    onClose={closeSettings}
    onOpenEditProfile={openEditProfileFromSettings}
    onOpenChangePassword={openChangePassword}
    onDeleteAccount={handleDeleteAccount}
    onRefreshVerification={refreshVerificationStatus}
    onOpenView={setSettingsView}
  />
)}

{showSettingsModal && settingsView === "privacy" && (
  <div className="fixed inset-0 z-[76] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={closeSettings} />
    <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
      <PrivacyPolicyPage
        onBack={() => setSettingsView("menu")}
        onClose={closeSettings}
        showBackButton={settingsEntrySource === "settings"}
      />
    </div>
  </div>
)}

{showSettingsModal && settingsView === "terms" && (
  <div className="fixed inset-0 z-[76] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={closeSettings} />
    <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
      <TermsPage
        onBack={() => setSettingsView("menu")}
        onClose={closeSettings}
        showBackButton={settingsEntrySource === "settings"}
      />
    </div>
  </div>
)}
        
{showSettingsModal && settingsView === "safety" && (
  <div className="fixed inset-0 z-[76] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={closeSettings} />
    <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
      <SafetyTipsPage
        onBack={() => setSettingsView("menu")}
        onClose={closeSettings}
        showBackButton={settingsEntrySource === "settings"}
      />
    </div>
  </div>
)}
        
{showSettingsModal && settingsView === "report" && (
  <div className="fixed inset-0 z-[76] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={closeSettings} />
    <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
      <ReportProblemPage
       onBack={() => setSettingsView("menu")}
       onClose={closeSettings}
       showBackButton={settingsEntrySource === "settings"}
       isLoggedIn={!!firebaseUser}
      />
    </div>
  </div>
)}
        
{showChangePasswordModal && firebaseUser && (
  <ChangePasswordModal
    user={firebaseUser}
    onClose={() => setShowChangePasswordModal(false)}
  />
)}

 {showAdminReportsModal && isAdminUser && (
  <AdminReportsModal
    onClose={() => setShowAdminReportsModal(false)}
    onOpenUser={openPublicProfile}
  />
)}       
        
{reportListingId !== null && (
  <ReportListingModal
    listingId={reportListingId}
    onClose={() => setReportListingId(null)}
  />
)}

      </AnimatePresence>
      {editingListing && (
  <EditListingModal
    listing={editingListing}
    onClose={() => setEditingListing(null)}
    onSave={(updated) => handleUpdateListing(editingListing.id, updated)}
  />
)}
      {confirmState && (
  <ConfirmModal
    open={confirmState.open}
    title={confirmState.title}
    message={confirmState.message}
    confirmText={confirmState.confirmText}
    cancelText={confirmState.cancelText}
    danger={confirmState.danger}
    onCancel={closeConfirm}
    onConfirm={() => {
      confirmState.onConfirm?.();
    }}
  />
)}

      <PasswordPromptModal
  open={passwordPromptOpen}
  title="Confirm your password"
  message="For security, enter your password to continue."
  password={reauthPassword}
  onPasswordChange={setReauthPassword}
  onSubmit={handlePasswordPromptSubmit}
  onCancel={closePasswordPrompt}
/>
     {feedback && (
  <FeedbackModal
    open={feedback.open}
    type={feedback.type}
    title={feedback.title}
    message={feedback.message}
    onClose={closeFeedback}
  />
)}
    </div>
 );
}
