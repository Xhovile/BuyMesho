import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Bookmark,
  ArrowUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Listing,
  UserProfile,
  University,
  Category,
  SellerDashboardData,
  ListingDraft,
  CreateListingPayload,
  ListingSpecValue
} from './types';
import HeroSection from "./sections/HeroSection";
import FeedbackModal from "./components/FeedbackModal";
import { UNIVERSITIES, CATEGORIES } from './constants';
import {
  getListingSubcategories,
  getListingItemTypes,
  getListingItemConfig,
  getBasicListingFields,
  getAdvancedListingFields,
  createEmptyListingSpecValues,
  validateListingSpecValues
} from "./listingSchemas";
import type { ListingSpecField } from "./listingSchemas";
import {
  navigateToCreateListing,
  navigateToLogin,
  navigateToProfile,
  navigateToPath,
} from "./lib/appNavigation";
import MarketSection from "./sections/MarketSection";
import { auth, db as firestore } from './firebase';
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
import ReportListingModal from "./components/ReportListingModal";
                
// --- Main App ---


type SellerApplicationStatus = "pending" | "approved" | "rejected";

type SellerApplication = {
  id: number;
  applicant_uid: string | null;
  applicant_email: string | null;
  full_legal_name: string | null;
  institution: string | null;
  applicant_type: string | null;
  institution_id_number: string | null;
  whatsapp_number: string | null;
  business_name: string | null;
  what_to_sell: string | null;
  business_description: string | null;
  reason_for_applying: string | null;
  proof_document_url: string | null;
  status: SellerApplicationStatus;
  review_notes: string | null;
  reviewed_at: string | null;
  reviewed_by_uid: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const createInitialListingDraft = (
  userProfile?: UserProfile | null
): ListingDraft => ({
  name: "",
  price: "",
  description: "",
  category: CATEGORIES[0] as Category,
  subcategory: "",
  item_type: "",
  spec_values: {},
  university: userProfile?.university || (UNIVERSITIES[0] as University),
  photos: [],
  video_url: "",
  whatsapp_number: userProfile?.whatsapp_number || "",
  status: "available",
  condition: "used",
  quantity: "1",
  sold_quantity: "0",
});

function ListingFormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
          {title}
        </h3>
        {hint ? <p className="text-xs text-zinc-400 mt-1">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ListingProgressPill({
  label,
  active,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-400"
      }`}
    >
      {label}
    </span>
  );
}

export default function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUniv, setSelectedUniv] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedItemType, setSelectedItemType] = useState("");
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<Record<string, string | string[] | boolean>>({});
  const [sortBy, setSortBy] = useState("newest");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creatingListing, setCreatingListing] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot' | 'profile' | 'editProfile' | 'editAccount' | 'becomeSeller'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
const [reportListingId, setReportListingId] = useState<number | null>(null);
const [savedListingIds, setSavedListingIds] = useState<number[]>([]);
const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
const [reauthPassword, setReauthPassword] = useState("");
const [pendingDeleteAfterReauth, setPendingDeleteAfterReauth] = useState(false);
const [sellerDashboard, setSellerDashboard] = useState<SellerDashboardData | null>(null);
const [sellerDashboardLoading, setSellerDashboardLoading] = useState(false);
const [selectedCondition, setSelectedCondition] = useState("");
const [hideSoldOut, setHideSoldOut] = useState(false);
const [minPrice, setMinPrice] = useState("");
const [maxPrice, setMaxPrice] = useState("");
const [currentPage, setCurrentPage] = useState(1);
const [pageSize] = useState(12);
const [totalResults, setTotalResults] = useState(0);
const [totalPages, setTotalPages] = useState(1);
const [showScrollTop, setShowScrollTop] = useState(false);
  
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
const [hiddenListingIds, setHiddenListingIds] = useState<number[]>(() => {
  try {
    const raw = localStorage.getItem("hiddenListingIds");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x) => Number.isInteger(x))
      : [];
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
const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});

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

const setCreateFieldError = (key: string, message: string) => {
  setCreateFieldErrors((prev) => ({
    ...prev,
    [key]: message,
  }));
};

const clearCreateFieldError = (key: string) => {
  setCreateFieldErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });
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

const hideListingLocal = (listingId: number) => {
  if (!Number.isInteger(listingId)) return;

  setHiddenListingIds((prev) => {
    if (prev.includes(listingId)) return prev;
    const next = [...prev, listingId];
    localStorage.setItem("hiddenListingIds", JSON.stringify(next));
    return next;
  });
};

const unhideListingLocal = (listingId: number) => {
  setHiddenListingIds((prev) => {
    const next = prev.filter((id) => id !== listingId);
    localStorage.setItem("hiddenListingIds", JSON.stringify(next));
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

  return map;
}, [listings, userProfile]);
  

  const isFirebaseConfigured = true; // Hardcoded in firebase.ts
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const savedStorageKey = firebaseUser ? `savedListingIds:${firebaseUser.uid}` : "savedListingIds:guest";

  const isAdminUser =
    !!firebaseUser?.email &&
    firebaseUser.email.toLowerCase() === "isaacmtsiriza310@gmail.com";
  const isSellerAccount = !!userProfile?.is_seller;

  // Form states
  const [newListing, setNewListing] = useState(
    createInitialListingDraft(null)
  );
  const [showAdvancedSpecs, setShowAdvancedSpecs] = useState(false);
  const createSpecFieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const isSchemaDrivenCategory =
    getListingSubcategories(newListing.category).length > 0;

  const availableSubcategories = useMemo(() => {
    if (!isSchemaDrivenCategory) return [];
    return getListingSubcategories(newListing.category);
  }, [isSchemaDrivenCategory, newListing.category]);

  const availableItemTypes = React.useMemo(() => {
    if (!isSchemaDrivenCategory || !newListing.subcategory) return [];
    return getListingItemTypes(newListing.category, newListing.subcategory);
  }, [isSchemaDrivenCategory, newListing.category, newListing.subcategory]);

  const selectedItemConfig = React.useMemo(() => {
    if (!isSchemaDrivenCategory || !newListing.subcategory || !newListing.item_type) {
      return null;
    }

    return getListingItemConfig(
      newListing.category,
      newListing.subcategory,
      newListing.item_type
    );
  }, [
    isSchemaDrivenCategory,
    newListing.category,
    newListing.subcategory,
    newListing.item_type
  ]);

  const basicSpecFields = React.useMemo(() => {
    if (!isSchemaDrivenCategory || !newListing.subcategory || !newListing.item_type) {
      return [];
    }

    return getBasicListingFields(
      newListing.category,
      newListing.subcategory,
      newListing.item_type
    );
  }, [
    isSchemaDrivenCategory,
    newListing.category,
    newListing.subcategory,
    newListing.item_type
  ]);

  const advancedSpecFields = React.useMemo(() => {
    if (!isSchemaDrivenCategory || !newListing.subcategory || !newListing.item_type) {
      return [];
    }

    return getAdvancedListingFields(
      newListing.category,
      newListing.subcategory,
      newListing.item_type
    );
  }, [
    isSchemaDrivenCategory,
    newListing.category,
    newListing.subcategory,
    newListing.item_type
  ]);

  const requiredSpecCount = React.useMemo(() => {
    return selectedItemConfig?.requiredKeys.length || 0;
  }, [selectedItemConfig]);

  const completedRequiredSpecCount = React.useMemo(() => {
    if (!selectedItemConfig) return 0;

    return selectedItemConfig.requiredKeys.filter((key) => {
      const value = newListing.spec_values[key];
      return !(
        value === null ||
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      );
    }).length;
  }, [selectedItemConfig, newListing.spec_values]);

  const advancedSpecCount = advancedSpecFields.length;

  const listingBasicReady =
    !!newListing.name.trim() &&
    !!newListing.price &&
    !!newListing.whatsapp_number.trim();

  const listingSetupReady =
    !!newListing.category &&
    !!newListing.university &&
    !!newListing.condition &&
    !!newListing.quantity;

  const listingDetailsReady = isSchemaDrivenCategory
    ? !!newListing.subcategory && !!newListing.item_type
    : true;

  const listingMediaReady = newListing.photos.length > 0;

  const [authForm, setAuthForm] = useState({
  email: "",
  password: "",
  university: UNIVERSITIES[0] as University,
});
  
  const [sellerUpgradeForm, setSellerUpgradeForm] = useState({
  fullLegalName: "",
  institution: UNIVERSITIES[0] as University,
  applicantType: "student" as "student" | "staff" | "registered_business",
  institutionIdNumber: "",
  whatsappNumber: "",
  businessName: "",
  whatToSell: "",
  businessDescription: "",
  reasonForApplying: "",
  proofDocumentUrl: "",
  agreedToRules: false
});
  const [sellerApplication, setSellerApplication] = useState<SellerApplication | null>(null);
  
const [editProfileForm, setEditProfileForm] = useState({
  businessName: "",
  university: UNIVERSITIES[0] as University,
  logoUrl: "",
  bio: "",
  whatsappNumber: ""
});
  
  useEffect(() => {
    setShowAdvancedSpecs(false);
  }, [
    newListing.category,
    newListing.subcategory,
    newListing.item_type
  ]);

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
  setCurrentPage(1);
}, [
  selectedUniv,
  selectedCat,
  selectedSubcategory,
  selectedItemType,
  selectedCondition,
  hideSoldOut,
  minPrice,
  maxPrice,
  search,
  sortBy,
  selectedSpecFilters,
]);

useEffect(() => {
  setSelectedSpecFilters({});
}, [selectedCat]);

useEffect(() => {
  setSelectedSpecFilters({});
}, [selectedSubcategory]);

useEffect(() => {
  setSelectedSpecFilters({});
}, [selectedItemType]);
  
  useEffect(() => {
  fetchListings();
}, [
  selectedUniv,
  selectedCat,
  selectedSubcategory,
  selectedItemType,
  selectedCondition,
  hideSoldOut,
  minPrice,
  maxPrice,
  search,
  sortBy,
  currentPage,
  pageSize,
  selectedSpecFilters,
]);

  const fetchListings = async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams();

    if (selectedUniv) params.append("university", selectedUniv);
    if (selectedCat) params.append("category", selectedCat);
    if (selectedSubcategory) params.append("subcategory", selectedSubcategory);
    if (selectedItemType) params.append("itemType", selectedItemType);
    if (selectedCondition) params.append("condition", selectedCondition);
    if (hideSoldOut) params.append("hideSoldOut", "1");
    if (minPrice) params.append("minPrice", minPrice);
    if (maxPrice) params.append("maxPrice", maxPrice);
    if (search) params.append("search", search);
    if (sortBy) params.append("sortBy", sortBy);
    if (Object.keys(selectedSpecFilters).length > 0) {
      params.append("specFilters", JSON.stringify(selectedSpecFilters));
    }

    params.append("page", String(currentPage));
    params.append("pageSize", String(pageSize));

    const res = await fetch(`/api/listings?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const data = await res.json();

    setListings(Array.isArray(data.items) ? data.items : []);
    setTotalResults(Number(data.total || 0));
    setTotalPages(Number(data.totalPages || 1));
  } catch (err) {
    console.error("Fetch listings error:", err);
    setListings([]);
    setTotalResults(0);
    setTotalPages(1);
  } finally {
    setLoading(false);
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

  useEffect(() => {
  if (firebaseUser && !userProfile?.is_seller) {
    void fetchSellerApplicationStatus();
  } else {
    setSellerApplication(null);
  }
}, [firebaseUser, userProfile?.is_seller]);

useEffect(() => {
  const handleScroll = () => {
    setShowScrollTop(window.scrollY > 700);
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();

  return () => {
    window.removeEventListener("scroll", handleScroll);
  };
}, []);


const promptSellerUpgrade = () => {
  navigateToCreateListing();
};


const toggleSavedListing = (listingId: number) => {
  if (!firebaseUser) {
    navigateToLogin();
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
  navigateToLogin();
};


  const performDeleteListing = async (listingId: number) => {
  try {
    await apiFetch(`/api/listings/${listingId}`, { method: "DELETE" });

    fetchListings();

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
  const existing = listings.find((l) => l.id === listingId);

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
    subcategory: updated.subcategory ?? existing.subcategory ?? null,
    item_type: updated.item_type ?? existing.item_type ?? null,
    spec_values: updated.spec_values ?? existing.spec_values ?? {},
    university: updated.university ?? existing.university,
    photos: updated.photos ?? existing.photos ?? [],
    video_url: updated.video_url ?? existing.video_url ?? null,
    whatsapp_number: updated.whatsapp_number ?? existing.whatsapp_number,
    status: updated.status ?? existing.status ?? "available",
    condition: updated.condition ?? existing.condition ?? "used",
    quantity: Number(updated.quantity ?? existing.quantity ?? 1),
    sold_quantity: Number(updated.sold_quantity ?? existing.sold_quantity ?? 0),
  };

  try {
    await apiFetch(`/api/listings/${listingId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    fetchListings();

    void fetchSellerDashboard();

    showFeedback(
      "success",
      "Listing updated",
      "Your listing was updated successfully."
    );
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

  const fetchSellerApplicationStatus = async () => {
    if (!firebaseUser) {
      setSellerApplication(null);
      return;
    }

    try {
      const data = await apiFetch("/api/profile/seller-application");

      if (
        data?.status === "pending" ||
        data?.status === "approved" ||
        data?.status === "rejected"
      ) {
        setSellerApplication(data as SellerApplication);

        if (data.status === "approved" && userProfile && !userProfile.is_seller) {
          await updateDoc(doc(firestore, "users", firebaseUser.uid), {
            is_seller: true,
          });

          const nextProfile = { ...userProfile, is_seller: true };
          setUserProfile(nextProfile);

          await apiFetch("/api/sellers", {
            method: "POST",
            body: JSON.stringify(nextProfile),
          });
        }
      } else {
        setSellerApplication(null);
      }
    } catch (err) {
      console.error("Failed to fetch seller application status", err);
      setSellerApplication(null);
    }
  };
  
  const handleBecomeSeller = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!firebaseUser || !userProfile) return;

  try {
    const submitted = await apiFetch("/api/profile/become-seller", {
      method: "POST",
      body: JSON.stringify({
        full_legal_name: sellerUpgradeForm.fullLegalName,
        institution: sellerUpgradeForm.institution,
        applicant_type: sellerUpgradeForm.applicantType,
        institution_id_number: sellerUpgradeForm.institutionIdNumber,
        whatsapp_number: sellerUpgradeForm.whatsappNumber,
        business_name: sellerUpgradeForm.businessName,
        what_to_sell: sellerUpgradeForm.whatToSell,
        business_description: sellerUpgradeForm.businessDescription,
        reason_for_applying: sellerUpgradeForm.reasonForApplying,
        proof_document_url: sellerUpgradeForm.proofDocumentUrl,
        agreed_to_rules: sellerUpgradeForm.agreedToRules,
      }),
    });

    const nextApplication = submitted?.application;
    if (
      nextApplication &&
      (nextApplication.status === "pending" ||
        nextApplication.status === "approved" ||
        nextApplication.status === "rejected")
    ) {
      setSellerApplication(nextApplication as SellerApplication);
    } else {
      setSellerApplication(null);
    }

    showFeedback(
      "success",
      "Application submitted",
      "Your application is pending manual review."
    );
    setAuthView("profile");
  } catch (err: any) {
    showFeedback(
     "error",
     "Application failed",
     err?.message || "We could not submit your seller application."
   );
  }
};
  
  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files: File[] = Array.from(e.target.files ?? []);
  if (!files.length) return;

  const remaining = 5 - newListing.photos.length;
  const selected: File[] = files.slice(0, remaining);

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
      formData.append("image", file as Blob);

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
    clearCreateFieldError("photos");
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
  const file: File | undefined = e.target.files?.[0];
  if (!file) return;

  setUploading(true);
  try {
    const formData = new FormData();
    formData.append("image", file as Blob);

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

const handleNewListingCategoryChange = (category: Category) => {
  setCreateFieldErrors({});
  setNewListing((prev) => ({
    ...prev,
    category,
    subcategory: "",
    item_type: "",
    spec_values: {},
  }));
};

const handleNewListingSubcategoryChange = (subcategory: string) => {
  clearCreateFieldError("subcategory");
  clearCreateFieldError("item_type");
  setNewListing((prev) => ({
    ...prev,
    subcategory,
    item_type: "",
    spec_values: {},
  }));
};

const handleNewListingItemTypeChange = (itemType: string) => {
  clearCreateFieldError("item_type");
  setCreateFieldErrors((prev) => {
    const next = { ...prev };
    Object.keys(next).forEach((key) => {
      if (createSpecFieldRefs.current[key]) {
        delete next[key];
      }
    });
    return next;
  });
  setNewListing((prev) => ({
    ...prev,
    item_type: itemType,
    spec_values: createEmptyListingSpecValues(
      prev.category,
      prev.subcategory,
      itemType
    ),
  }));
};

const handleNewListingUniversityChange = (university: University) => {
  setNewListing((prev) => ({
    ...prev,
    university,
  }));
};

const handleSpecValueChange = (key: string, value: ListingSpecValue) => {
  clearCreateFieldError(key);
  setNewListing((prev) => ({
    ...prev,
    spec_values: {
      ...prev.spec_values,
      [key]: value,
    },
  }));
};

const hasMeaningfulTitle = (rawTitle: string) => {
  const trimmed = rawTitle.trim();
  if (trimmed.length < 3) return false;
  const alnumCount = (trimmed.match(/[a-zA-Z0-9]/g) ?? []).length;
  return alnumCount >= 3;
};

const scrollToCreateSpecField = (fieldKey: string) => {
  const target = createSpecFieldRefs.current[fieldKey];
  if (!target) return;

  target.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
};
  
  const handleCreateListing = async (e: React.FormEvent) => {
  e.preventDefault();

  if (creatingListing) return;
  setCreatingListing(true);

  try {
    setCreateFieldErrors({});
    if (!userProfile || !firebaseUser) return;

    if (!isSellerAccount) {
    promptSellerUpgrade();
    return;
    }

    if (isSchemaDrivenCategory) {
      if (!newListing.subcategory || !newListing.item_type) {
        if (!newListing.subcategory) {
          setCreateFieldError("subcategory", "Please choose a subcategory.");
        }
        if (!newListing.item_type) {
          setCreateFieldError("item_type", "Please choose an item type.");
        }
        showFeedback(
          "info",
          "Item details needed",
          "Please choose a subcategory and item type first."
        );
        return;
      }

      const validation = validateListingSpecValues(
        newListing.category,
        newListing.subcategory,
        newListing.item_type,
        newListing.spec_values
      );

      if (!validation.isValid) {
        const firstError = validation.errors[0];
        const errorKey = firstError?.key;
        const nextErrors = validation.errors.reduce<Record<string, string>>(
          (acc, error) => {
            if (error.key) {
              acc[error.key] = error.message;
            }
            return acc;
          },
          {}
        );
        setCreateFieldErrors(nextErrors);

        if (errorKey) {
          const erroredField = selectedItemConfig?.schema.fields.find(
            (field) => field.key === errorKey
          );

          if (erroredField?.advanced) {
            setShowAdvancedSpecs(true);
            setTimeout(() => {
              scrollToCreateSpecField(errorKey);
            }, 150);
          } else {
            setTimeout(() => {
              scrollToCreateSpecField(errorKey);
            }, 0);
          }
        }

        showFeedback(
          "error",
          "Missing or invalid details",
          firstError?.message || "Please complete the required item details."
        );
        return;
      }
    }

    if (!hasMeaningfulTitle(newListing.name)) {
      setCreateFieldError(
        "name",
        "Please enter a clear listing title with at least 3 letters or numbers."
      );
      showFeedback(
        "error",
        "Title needed",
        "Please enter a clear listing title with at least 3 letters or numbers."
      );
      return;
    }

    const trimmedDescription = newListing.description.trim();
    if (trimmedDescription.length < 10) {
      setCreateFieldError(
        "description",
        "Please enter a product description of at least 10 characters."
      );
      showFeedback(
        "error",
        "Description needed",
        "Please enter a product description of at least 10 characters."
      );
      return;
    }

    if (!newListing.whatsapp_number.trim()) {
      setCreateFieldError("whatsapp_number", "WhatsApp number is required.");
      showFeedback(
        "error",
        "WhatsApp number required",
        "Please provide a WhatsApp number buyers can contact."
      );
      return;
    }

    const parsedPrice = Number(newListing.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setCreateFieldError("price", "Please enter a valid price greater than 0.");
      showFeedback(
        "error",
        "Invalid price",
        "Please enter a valid price greater than 0."
      );
      return;
    }

    if (newListing.photos.length < 1) {
      setCreateFieldError("photos", "Add at least 1 photo.");
      showFeedback(
        "error",
        "Photo required",
        "Add at least 1 photo so buyers can trust what is being sold."
      );
      return;
    }

    const quantityNum = Number(newListing.quantity || 1);
    const soldQuantityNum = Number(newListing.sold_quantity || 0);
    if (!Number.isInteger(quantityNum) || quantityNum < 1) {
      setCreateFieldError(
        "quantity",
        "Total quantity must be a whole number of at least 1."
      );
      showFeedback(
        "error",
        "Invalid quantity",
        "Total quantity must be a whole number of at least 1."
      );
      return;
    }

    if (!Number.isInteger(soldQuantityNum) || soldQuantityNum < 0) {
      setCreateFieldError("sold_quantity", "Sold quantity cannot be negative.");
      showFeedback(
        "error",
        "Invalid sold quantity",
        "Sold quantity cannot be negative."
      );
      return;
    }

    if (soldQuantityNum > quantityNum) {
      setCreateFieldError(
        "sold_quantity",
        "Sold quantity cannot be greater than total quantity."
      );
      showFeedback(
        "error",
        "Invalid stock values",
        "Sold quantity cannot be greater than total quantity."
      );
      return;
    }

    const payload: CreateListingPayload = {
      name: newListing.name,
      price: parsedPrice,
      description: newListing.description,
      category: newListing.category,
      subcategory: newListing.subcategory || null,
      item_type: newListing.item_type || null,
      spec_values:
        isSchemaDrivenCategory && newListing.item_type
          ? newListing.spec_values
          : {},
      university: newListing.university,
      photos: newListing.photos.slice(0, 5),
      video_url: newListing.video_url?.trim() || null,
      whatsapp_number: newListing.whatsapp_number,
      status: newListing.status,
      condition: newListing.condition,
      quantity: quantityNum,
      sold_quantity: soldQuantityNum,
    };

    await apiFetch("/api/listings", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setNewListing(createInitialListingDraft(userProfile));
    setCreateFieldErrors({});

    fetchListings();
    void fetchSellerDashboard();
  } catch (err: any) {
    showFeedback(
     "error",
     "Listing creation failed",
     err?.message || "We could not create your listing."
   );
  } finally {
    setCreatingListing(false);
  }
};
  
  const handleReport = (listingId: number) => {
  setReportListingId(listingId);
};

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file: File | undefined = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file as Blob);

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
             setSellerUpgradeForm((prev) => ({ ...prev, proofDocumentUrl: data.url }));
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


  const renderListingSpecField = (field: ListingSpecField) => {
    const rawValue = newListing.spec_values[field.key];
    const value =
      rawValue === null || rawValue === undefined ? "" : rawValue;

    const isRequired =
      !!field.required ||
      !!selectedItemConfig?.requiredKeys.includes(field.key);

    const labelText = `${field.label}${isRequired ? " *" : ""}`;
    const fieldError = createFieldErrors[field.key];
    const inputClass = `w-full px-4 py-2 bg-zinc-50 border rounded-xl outline-none ${
      fieldError
        ? "border-red-500 focus:ring-2 focus:ring-red-200"
        : "border-zinc-200 focus:ring-2 focus:ring-primary/20"
    }`;

    if (field.type === "select") {
      return (
        <div
          key={field.key}
          ref={(el) => {
            createSpecFieldRefs.current[field.key] = el;
          }}
        >
          <div className={fieldError ? "rounded-xl ring-2 ring-red-200" : ""}>
            <FormDropdown
              label={labelText}
              value={value as string}
              options={field.options || []}
              onChange={(selected) => handleSpecValueChange(field.key, selected)}
              placeholder={`Select ${field.label}`}
            />
          </div>
          {fieldError ? (
            <p className="mt-1 text-xs text-red-600">{fieldError}</p>
          ) : null}
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div
          key={field.key}
          ref={(el) => {
            createSpecFieldRefs.current[field.key] = el;
          }}
        >
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
            {labelText}
          </label>
          <textarea
            value={value as string}
            onChange={(e) => handleSpecValueChange(field.key, e.target.value)}
            className={`${inputClass} h-24 resize-none`}
            placeholder={field.placeholder || ""}
          />
          {fieldError ? (
            <p className="mt-1 text-xs text-red-600">{fieldError}</p>
          ) : null}
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "boolean") {
      const boolValue = typeof rawValue === "boolean" ? rawValue : null;

      return (
        <div
          key={field.key}
          ref={(el) => {
            createSpecFieldRefs.current[field.key] = el;
          }}
        >
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
            {labelText}
          </label>
          <div
            className={`grid grid-cols-3 gap-2 rounded-xl ${
              fieldError ? "ring-2 ring-red-200 p-1" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => handleSpecValueChange(field.key, null)}
              className={`px-3 py-2 rounded-xl border text-sm font-bold transition ${
                boolValue === null
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              Not set
            </button>
            <button
              type="button"
              onClick={() => handleSpecValueChange(field.key, true)}
              className={`px-3 py-2 rounded-xl border text-sm font-bold transition ${
                boolValue === true
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => handleSpecValueChange(field.key, false)}
              className={`px-3 py-2 rounded-xl border text-sm font-bold transition ${
                boolValue === false
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              No
            </button>
          </div>
          {fieldError ? (
            <p className="mt-1 text-xs text-red-600">{fieldError}</p>
          ) : null}
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "multiselect") {
      const selectedValues = Array.isArray(rawValue) ? rawValue : [];

      return (
        <div
          key={field.key}
          ref={(el) => {
            createSpecFieldRefs.current[field.key] = el;
          }}
        >
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
            {labelText}
          </label>
          <div
            className={`grid grid-cols-2 gap-2 rounded-xl border bg-zinc-50 p-3 ${
              fieldError ? "border-red-500 ring-2 ring-red-200" : "border-zinc-200"
            }`}
          >
            {(field.options || []).map((option: string) => {
              const isChecked = selectedValues.includes(option);

              return (
                <label key={option} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleSpecValueChange(field.key, [...selectedValues, option]);
                        return;
                      }

                      handleSpecValueChange(
                        field.key,
                        selectedValues.filter((item: string) => item !== option)
                      );
                    }}
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
          {fieldError ? (
            <p className="mt-1 text-xs text-red-600">{fieldError}</p>
          ) : null}
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "number") {
      return (
        <div
          key={field.key}
          ref={(el) => {
            createSpecFieldRefs.current[field.key] = el;
          }}
        >
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
            {labelText}
          </label>
          <input
            type="number"
            value={value === "" ? "" : String(value)}
            onChange={(e) =>
              handleSpecValueChange(
                field.key,
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className={inputClass}
            placeholder={field.placeholder || ""}
          />
          {fieldError ? (
            <p className="mt-1 text-xs text-red-600">{fieldError}</p>
          ) : null}
          {field.helpText ? (
            <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
          ) : null}
        </div>
      );
    }

    return (
      <div
        key={field.key}
        ref={(el) => {
          createSpecFieldRefs.current[field.key] = el;
        }}
      >
        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
          {labelText}
        </label>
        <input
          type="text"
          value={value as string}
          onChange={(e) => handleSpecValueChange(field.key, e.target.value)}
          className={inputClass}
          placeholder={field.placeholder || ""}
        />
        {fieldError ? (
          <p className="mt-1 text-xs text-red-600">{fieldError}</p>
        ) : null}
        {field.helpText ? (
          <p className="mt-1 text-xs text-zinc-500">{field.helpText}</p>
        ) : null}
      </div>
    );
  };

  const formatSpecValue = (value: unknown): string => {
    if (Array.isArray(value)) {
      return value.length ? value.join(", ") : "—";
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (value === null || value === undefined || value === "") {
      return "—";
    }

    return String(value);
  };


  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
   <div className="min-h-screen pb-20 bg-zinc-100">
      <Header 
        onSearch={setSearch} 
        onAddListing={navigateToCreateListing}
          onProfileClick={navigateToProfile}
          userProfile={userProfile}
          firebaseUser={firebaseUser}
      />

      <main className="max-w-7xl mx-auto px-4">
        <HeroSection
    onStartSelling={navigateToCreateListing}
  />     
        <MarketSection
  loading={loading}
  listings={listings}
  hiddenSellerUids={hiddenSellerUids}
        hiddenListingIds={hiddenListingIds}
  selectedUniv={selectedUniv}
  setSelectedUniv={setSelectedUniv}
  selectedCat={selectedCat}
  setSelectedCat={setSelectedCat}
  selectedSubcategory={selectedSubcategory}
  setSelectedSubcategory={setSelectedSubcategory}
  selectedItemType={selectedItemType}
  setSelectedItemType={setSelectedItemType}
  selectedSpecFilters={selectedSpecFilters}
  setSelectedSpecFilters={setSelectedSpecFilters}
  sortBy={sortBy}
  setSortBy={setSortBy}
  firebaseUserUid={firebaseUser?.uid}
  isLoggedIn={!!firebaseUser}
  savedListingIds={savedListingIds}
  onReport={handleReport}
  onDelete={handleDeleteListing}
  onEdit={handleEditListing}
  onHideSeller={hideSellerLocal}
  onHideListing={hideListingLocal}
  onToggleStatus={handleToggleListingStatus}
  onToggleSave={toggleSavedListing}
  requireLoginForContact={requireLoginForContact}
  selectedCondition={selectedCondition}
setSelectedCondition={setSelectedCondition}
hideSoldOut={hideSoldOut}
setHideSoldOut={setHideSoldOut}
minPrice={minPrice}
setMinPrice={setMinPrice}
maxPrice={maxPrice}
setMaxPrice={setMaxPrice}
totalListingsCount={totalResults}
currentPage={currentPage}
totalPages={totalPages}
setCurrentPage={setCurrentPage}
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
              onClick={() => navigateToPath("/settings")}
              className="hover:text-primary transition-colors"
            >
              Privacy
            </button>

            <button
              type="button"
              onClick={() => navigateToPath("/settings")}
              className="hover:text-primary transition-colors"
            >
              Terms
            </button>

            <button
              type="button"
              onClick={() => navigateToPath("/settings")}
              className="hover:text-primary transition-colors"
            >
              Safety
            </button>

            <button
              type="button"
              onClick={() => navigateToPath("/settings")}
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

      {reportListingId !== null && (
        <ReportListingModal
          listingId={reportListingId}
          onClose={() => setReportListingId(null)}
        />
      )}

      {editingListing && (
  <EditListingModal
    listing={editingListing}
    onClose={() => setEditingListing(null)}
    onSave={(updated) => handleUpdateListing(editingListing.id, updated)}
    showFeedback={showFeedback}
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
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            onClick={scrollToTop}
            className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[90] h-12 w-12 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white shadow-xl shadow-zinc-400/30 flex items-center justify-center transition-all active:scale-95"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
 );
}
