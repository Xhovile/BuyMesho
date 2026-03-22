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
  Expand,
  ArrowUp,
  ChevronRight
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
  getListingParamsFromUrl,
  buildListingShareUrl,
  syncListingParamsInUrl,
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
import AdminSellerApplicationsModal from "./components/AdminSellerApplicationsModal";
                
// --- Main App ---

type SellerRatingSummary = {
  averageRating: number;
  ratingCount: number;
  myRating: number | null;
};

type SellerApplicationStatus = "pending" | "approved" | "rejected";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [settingsView, setSettingsView] = useState<"menu" | "privacy" | "terms" | "safety" | "report">("menu");
  const [settingsEntrySource, setSettingsEntrySource] = useState<"settings" | "footer">("settings");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creatingListing, setCreatingListing] = useState(false);
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
const [activeDetailSpecGroup, setActiveDetailSpecGroup] = useState("");
const detailSpecTabsRef = useRef<HTMLDivElement | null>(null);
const [showDetailSpecTabsChevron, setShowDetailSpecTabsChevron] = useState(false);
const [galleryIndex, setGalleryIndex] = useState(0); 
const [isImageFullscreenOpen, setIsImageFullscreenOpen] = useState(false);
const [reportListingId, setReportListingId] = useState<number | null>(null);
const [savedListingIds, setSavedListingIds] = useState<number[]>([]);
const [showSavedModal, setShowSavedModal] = useState(false);
const [showAdminReportsModal, setShowAdminReportsModal] = useState(false);
const [showAdminSellerApplicationsModal, setShowAdminSellerApplicationsModal] = useState(false);
const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
const [reauthPassword, setReauthPassword] = useState("");
const [pendingDeleteAfterReauth, setPendingDeleteAfterReauth] = useState(false);
const [sellerDashboard, setSellerDashboard] = useState<SellerDashboardData | null>(null);
const [sellerDashboardLoading, setSellerDashboardLoading] = useState(false);
const [detailsSellerProfile, setDetailsSellerProfile] = useState<any | null>(null);
const [detailsRatingSummary, setDetailsRatingSummary] = useState<SellerRatingSummary | null>(null);
const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
const [detailsLoadingExtra, setDetailsLoadingExtra] = useState(false);  
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

  if (publicProfile?.uid && publicProfile?.business_name) {
    map[publicProfile.uid] = publicProfile.business_name;
  }

  return map;
}, [listings, userProfile, publicProfile]);
  
const openDetails = (listing: Listing, startIndex = 0) => {
  const optimisticListing = {
    ...listing,
    views_count: (listing.views_count ?? 0) + 1,
  };

  setDetailsListing(optimisticListing);
  setGalleryIndex(startIndex);
  setDetailsOpen(true);
  syncListingParamsInUrl(listing.id, startIndex);
  void trackListingView(listing.id);
  void loadDetailsExtras(optimisticListing);
};

const closeDetails = () => {
  setDetailsOpen(false);
  setDetailsListing(null);
  setGalleryIndex(0);
  setIsImageFullscreenOpen(false);
  clearListingParamFromUrl();
  setDetailsSellerProfile(null);
  setDetailsRatingSummary(null);
  setRelatedListings([]);
  setDetailsLoadingExtra(false);
};

const showPrevDetailImage = () => {
  if (!detailGalleryImages.length) return;

  const nextIndex =
    galleryIndex === 0 ? detailGalleryImages.length - 1 : galleryIndex - 1;

  setGalleryIndex(nextIndex);

  if (detailsListing) {
    syncListingParamsInUrl(detailsListing.id, nextIndex);
  }
};

const showNextDetailImage = () => {
  if (!detailGalleryImages.length) return;

  const nextIndex =
    galleryIndex === detailGalleryImages.length - 1 ? 0 : galleryIndex + 1;

  setGalleryIndex(nextIndex);

  if (detailsListing) {
    syncListingParamsInUrl(detailsListing.id, nextIndex);
  }
};

useEffect(() => {
  if (!listings.length) return;

  const { listing, imageIndex } = getListingParamsFromUrl();
  if (!listing) return;

  const foundListing = listings.find(
    (item) => String(item.id) === String(listing)
  );

  if (foundListing) {
    const safeIndex =
      Array.isArray(foundListing.photos) && foundListing.photos.length > 0
        ? Math.max(0, Math.min(imageIndex, foundListing.photos.length - 1))
        : 0;

    setDetailsListing(foundListing);
    setGalleryIndex(safeIndex);
    setDetailsOpen(true);
    void loadDetailsExtras(foundListing);
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
  const [sellerApplicationStatus, setSellerApplicationStatus] = useState<SellerApplicationStatus | null>(null);
  
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
    newListing.item_type,
    showAddModal
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
    if (!publicProfileOpen) {
      setRatingSummary(null);
      setRatingLoading(false);
      setRatingSubmitting(false);
    }
  }, [publicProfileOpen]);

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
    const [sellerProfile, listingsResponse] = await Promise.all([
     apiFetch(`/api/users/${listing.seller_uid}`),
     apiFetch("/api/listings?page=1&pageSize=50"),
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

    const allListings = Array.isArray(listingsResponse?.items)
     ? listingsResponse.items
     : [];

      const related = allListings
        .filter((item: Listing) =>
            item.id !== listing.id &&
            item.category === listing.category &&
            item.university === listing.university
          )
          .slice(0, 5);

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

  useEffect(() => {
  if (firebaseUser && !userProfile?.is_seller) {
    void fetchSellerApplicationStatus();
  } else {
    setSellerApplicationStatus(null);
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

  setNewListing(createInitialListingDraft(userProfile));
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
  return listings.filter(
    (listing) =>
      savedListingIds.includes(listing.id) &&
      !hiddenListingIds.includes(listing.id) &&
      !hiddenSellerUids.includes(listing.seller_uid)
  );
}, [listings, savedListingIds, hiddenListingIds, hiddenSellerUids]);

const visiblePublicProfileListings = publicProfileListings.filter(
  (l) =>
    !hiddenSellerUids.includes(l.seller_uid) &&
    !hiddenListingIds.includes(l.id)
);

const detailGalleryImages = React.useMemo(() => {
  if (!detailsListing) return [];

  if (Array.isArray(detailsListing.photos) && detailsListing.photos.length > 0) {
    return detailsListing.photos;
  }

  return [`https://picsum.photos/seed/${detailsListing.id}/800/800`];
}, [detailsListing]);

const DETAIL_SPEC_SCROLL_AMOUNT = 180;
const DETAIL_SPEC_SCROLL_TOLERANCE = 4; // small buffer for rounding differences

const scrollDetailSpecTabsRight = () => {
  detailSpecTabsRef.current?.scrollBy({
    left: DETAIL_SPEC_SCROLL_AMOUNT,
    behavior: "smooth",
  });
};

useEffect(() => {
  if (!detailsListing) {
    setActiveDetailSpecGroup("");
    return;
  }

  const itemConfig =
    detailsListing.category &&
    detailsListing.subcategory &&
    detailsListing.item_type
      ? getListingItemConfig(
          detailsListing.category,
          detailsListing.subcategory,
          detailsListing.item_type
        )
      : null;

  const firstGroupTitle = itemConfig?.fieldGroups?.[0]?.title || "";
  setActiveDetailSpecGroup(firstGroupTitle);
}, [detailsListing]);
  
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
  if (!firebaseUser) {
    requireLoginForContact();
    return;
  }

  try {
    await fetch(`/api/listings/${listing.id}/whatsapp-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Failed to track detail WhatsApp click", e);
  }

  const shareUrl = buildListingShareUrl(listing.id, galleryIndex);

  const message = encodeURIComponent(
    `Hi, I'm interested in your "${listing.name}" on BuyMesho. Is it still available?\n\nListing: ${shareUrl}`
  );

  window.open(
    `https://wa.me/${listing.whatsapp_number}?text=${message}`,
    "_blank",
    "noopener,noreferrer"
  );
};

const handleDetailShare = async (listing: Listing) => {
  const shareUrl = buildListingShareUrl(listing.id, galleryIndex);
  const shareText = `BuyMesho Listing
${listing.name}
Price: MK ${Number(listing.price).toLocaleString()}
Campus: ${listing.university}
WhatsApp: ${listing.whatsapp_number}

Open this listing: ${shareUrl}`;

  try {
    if ((navigator as any).share) {
      await (navigator as any).share({
        title: `BuyMesho: ${listing.name}`,
        text: shareText,
        url: shareUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(shareText);
    showFeedback(
      "success",
      "Share text copied",
      "Paste it on WhatsApp or anywhere you want."
    );
  } catch {
    prompt("Copy to share:", shareText);
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
      setSellerApplicationStatus(null);
      return;
    }

    try {
      const data = await apiFetch("/api/profile/seller-application");

      if (
        data?.status === "pending" ||
        data?.status === "approved" ||
        data?.status === "rejected"
      ) {
        setSellerApplicationStatus(data.status);

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
        setSellerApplicationStatus(null);
      }
    } catch (err) {
      console.error("Failed to fetch seller application status", err);
      setSellerApplicationStatus(null);
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

    setSellerApplicationStatus(submitted?.application?.status || "pending");

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

    setShowAddModal(false);
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

  const formatDetailDate = (value?: string) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  };

  const getListingFreshnessTone = (listing: Listing) => {
    const sourceDate = listing.updated_at || listing.created_at;
    if (!sourceDate) return "Fresh";

    const now = Date.now();
    const then = new Date(sourceDate).getTime();
    if (Number.isNaN(then)) return "Fresh";

    const diffHours = (now - then) / (1000 * 60 * 60);

    if (diffHours < 24) return "Just posted";
    if (diffHours < 72) return "Recently updated";
    if (diffHours < 168) return "This week";
    return "Older listing";
  };

  const getDetailSpecRows = (
    listing: Listing,
    sellerProfile: any | null,
    ratingSummary: SellerRatingSummary | null
  ) => {
    const sellerJoinedLabel = formatDetailDate(sellerProfile?.join_date);

    switch (listing.category) {
      case "Electronics & Gadgets":
        return [
          { label: "Device State", value: listing.condition || "used" },
          {
            label: "Available",
            value: String(
              Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0))
            ),
          },
        ];

      case "Fashion & Clothing":
        return [
          { label: "Wear State", value: listing.condition || "used" },
          {
            label: "Available",
            value: String(
              Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0))
            ),
          },
        ];

      case "Food & Snacks":
        return [
          { label: "Item State", value: listing.condition || "new" },
          {
            label: "Available",
            value: String(
              Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0))
            ),
          },
        ];

      case "Academic Services":
        return [
          { label: "Service Type", value: listing.category },
        ];

      case "Beauty & Personal Care":
        return [
          { label: "Product State", value: listing.condition || "new" },
          {
            label: "Available",
            value: String(
              Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0))
            ),
          },
        ];

      default:
        return [
          { label: "Condition", value: listing.condition || "used" },
          { label: "Seller Joined", value: sellerJoinedLabel },
        ];
    }
  };

  const detailAvailableQuantity =
    detailsListing
      ? Math.max(
          0,
          Number(detailsListing.quantity ?? 1) - Number(detailsListing.sold_quantity ?? 0)
        )
      : 0;

  const isDetailsOwner =
    !!firebaseUser?.uid &&
    !!detailsListing?.seller_uid &&
    detailsListing.seller_uid === firebaseUser.uid;

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

  const getListingSpecDisplayRows = (listing: Listing) => {
    if (!listing.category || !listing.subcategory || !listing.item_type || !listing.spec_values) {
      return [];
    }

    const itemConfig = getListingItemConfig(
      listing.category,
      listing.subcategory,
      listing.item_type
    );

    if (!itemConfig) {
      return [];
    }

    return itemConfig.schema.fields
      .map((field) => {
        const rawValue = listing.spec_values?.[field.key];

        if (
          rawValue === null ||
          rawValue === undefined ||
          rawValue === "" ||
          (Array.isArray(rawValue) && rawValue.length === 0)
        ) {
          return null;
        }

        return {
          key: field.key,
          label: field.label,
          value: formatSpecValue(rawValue),
          advanced: !!field.advanced,
        };
      })
      .filter(Boolean) as Array<{
        key: string;
        label: string;
        value: string;
        advanced: boolean;
      }>;
  };

  const getDetailSpecGroups = (listing: Listing) => {
    if (!listing.category || !listing.subcategory || !listing.item_type || !listing.spec_values) {
      return [];
    }

    const itemConfig = getListingItemConfig(
      listing.category,
      listing.subcategory,
      listing.item_type
    );

    if (!itemConfig) return [];

    return itemConfig.fieldGroups
      .map((group) => {
        const rows = group.keys
          .map((key) => {
            const field = itemConfig.schema.fields.find((f) => f.key === key);
            if (!field) return null;

            const rawValue = listing.spec_values?.[key];

            if (
              rawValue === null ||
              rawValue === undefined ||
              rawValue === "" ||
              (Array.isArray(rawValue) && rawValue.length === 0)
            ) {
              return null;
            }

            return {
              key,
              label: field.label,
              value: formatSpecValue(rawValue),
            };
          })
          .filter(Boolean) as Array<{ key: string; label: string; value: string }>;

        if (!rows.length) return null;

        return {
          title: group.title,
          rows,
        };
      })
      .filter(Boolean) as Array<{
        title: string;
        rows: Array<{ key: string; label: string; value: string }>;
      }>;
  };

  const detailSpecRows = React.useMemo(() => {
    if (!detailsListing) return [];
    return getDetailSpecRows(detailsListing, detailsSellerProfile, detailsRatingSummary);
  }, [detailsListing, detailsSellerProfile, detailsRatingSummary]);

  const detailStructuredSpecRows = React.useMemo(() => {
    if (!detailsListing) return [];
    return getListingSpecDisplayRows(detailsListing);
  }, [detailsListing]);

  const detailSpecGroups = React.useMemo(() => {
    if (!detailsListing) return [];
    return getDetailSpecGroups(detailsListing);
  }, [detailsListing]);

  const activeSpecGroup =
    detailSpecGroups.find((group) => group.title === activeDetailSpecGroup) ||
    detailSpecGroups[0] ||
    null;
  const activeStructuredSpecRows = activeSpecGroup?.rows || detailStructuredSpecRows;

  useEffect(() => {
    const el = detailSpecTabsRef.current;

    const updateChevronVisibility = () => {
      if (!el) {
        setShowDetailSpecTabsChevron(false);
        return;
      }

    const canScroll = el.scrollWidth > el.clientWidth + DETAIL_SPEC_SCROLL_TOLERANCE;
    const hasMoreToRight =
      el.scrollLeft + el.clientWidth < el.scrollWidth - DETAIL_SPEC_SCROLL_TOLERANCE;

      setShowDetailSpecTabsChevron(canScroll && hasMoreToRight);
    };

    updateChevronVisibility();

    if (!el) return;

    el.addEventListener("scroll", updateChevronVisibility, { passive: true });
    window.addEventListener("resize", updateChevronVisibility);

    return () => {
      el.removeEventListener("scroll", updateChevronVisibility);
      window.removeEventListener("resize", updateChevronVisibility);
    };
  }, [detailSpecGroups, detailsOpen, activeDetailSpecGroup]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  setNewListing(createInitialListingDraft(userProfile));
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

  setNewListing(createInitialListingDraft(userProfile));
  setShowAddModal(true);
}}
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
  onOpenProfile={openPublicProfile}
  onEdit={handleEditListing}
  onOpenDetails={openDetails}
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
              onClick={() => {
                setCreateFieldErrors({});
                setShowAddModal(false);
              }}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl h-[92vh] max-h-[92vh] flex flex-col"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 flex-shrink-0">
                <div>
                  <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">Create Listing</h2>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Post your item to the campus</p>
                </div>
                <button
                  onClick={() => {
                    setCreateFieldErrors({});
                    setShowAddModal(false);
                  }}
                  className="p-2.5 hover:bg-white hover:shadow-md rounded-2xl transition-all border border-transparent hover:border-zinc-100"
                >
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
                <form onSubmit={handleCreateListing} className="flex flex-col min-h-0 flex-1">
                  <div className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-4 pr-1">
                      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          Basic Info
                        </p>

                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                            Product Name
                          </label>
                          <input
                            required
                            type="text"
                            className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${
                              createFieldErrors.name
                                ? "border-red-500 focus:ring-2 focus:ring-red-200"
                                : "border-zinc-200 focus:ring-2 focus:ring-primary/20"
                            }`}
                            value={newListing.name}
                            onChange={(e) => {
                              clearCreateFieldError("name");
                              setNewListing({ ...newListing, name: e.target.value });
                            }}
                          />
                          {createFieldErrors.name ? (
                            <p className="mt-1 text-xs text-red-600">{createFieldErrors.name}</p>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                              Price (MK)
                            </label>
                            <input
                              required
                              type="number"
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${
                                createFieldErrors.price
                                  ? "border-red-500 focus:ring-2 focus:ring-red-200"
                                  : "border-zinc-200 focus:ring-2 focus:ring-primary/20"
                              }`}
                              value={newListing.price}
                              onChange={(e) => {
                                clearCreateFieldError("price");
                                setNewListing({ ...newListing, price: e.target.value });
                              }}
                            />
                            {createFieldErrors.price ? (
                              <p className="mt-1 text-xs text-red-600">{createFieldErrors.price}</p>
                            ) : null}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                              WhatsApp Number
                            </label>
                            <input
                              required
                              type="text"
                              placeholder="265..."
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${
                                createFieldErrors.whatsapp_number
                                  ? "border-red-500 focus:ring-2 focus:ring-red-200"
                                  : "border-zinc-200 focus:ring-2 focus:ring-primary/20"
                              }`}
                              value={newListing.whatsapp_number}
                              onChange={(e) => {
                                clearCreateFieldError("whatsapp_number");
                                setNewListing({
                                  ...newListing,
                                  whatsapp_number: e.target.value,
                                });
                              }}
                            />
                            {createFieldErrors.whatsapp_number ? (
                              <p className="mt-1 text-xs text-red-600">
                                {createFieldErrors.whatsapp_number}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          Listing Setup
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                              Total Quantity
                            </label>
                            <input
                              required
                              type="number"
                              min="1"
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${
                                createFieldErrors.quantity
                                  ? "border-red-500 focus:ring-2 focus:ring-red-200"
                                  : "border-zinc-200 focus:ring-2 focus:ring-primary/20"
                              }`}
                              value={newListing.quantity}
                              onChange={(e) => {
                                clearCreateFieldError("quantity");
                                setNewListing({ ...newListing, quantity: e.target.value });
                              }}
                            />
                            {createFieldErrors.quantity ? (
                              <p className="mt-1 text-xs text-red-600">{createFieldErrors.quantity}</p>
                            ) : null}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                              Sold Quantity
                            </label>
                            <input
                              type="number"
                              min="0"
                              className={`w-full px-4 py-3 bg-white border rounded-xl outline-none ${
                                createFieldErrors.sold_quantity
                                  ? "border-red-500 focus:ring-2 focus:ring-red-200"
                                  : "border-zinc-200 focus:ring-2 focus:ring-primary/20"
                              }`}
                              value={newListing.sold_quantity}
                              onChange={(e) => {
                                clearCreateFieldError("sold_quantity");
                                setNewListing({
                                  ...newListing,
                                  sold_quantity: e.target.value,
                                });
                              }}
                            />
                            {createFieldErrors.sold_quantity ? (
                              <p className="mt-1 text-xs text-red-600">
                                {createFieldErrors.sold_quantity}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormDropdown
                            label="Category"
                            value={newListing.category}
                            options={CATEGORIES}
                            searchPlaceholder="Search category..."
                            onChange={(value) =>
                              handleNewListingCategoryChange(value as Category)
                            }
                          />

                          <FormDropdown
                            label="University"
                            value={newListing.university}
                            options={UNIVERSITIES}
                            searchPlaceholder="Search university..."
                            onChange={(value) =>
                              handleNewListingUniversityChange(value as University)
                            }
                          />
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
                      </div>

                      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          Description
                        </p>

                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                            Product Description
                          </label>
                          <textarea
                            required
                            rows={4}
                            className={`w-full px-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none ${
                              createFieldErrors.description
                                ? "border-red-400 ring-2 ring-red-200"
                                : "border-zinc-200"
                            }`}
                            value={newListing.description}
                            onChange={(e) => {
                              clearCreateFieldError("description");
                              setNewListing({
                                ...newListing,
                                description: e.target.value,
                              });
                            }}
                          />
                          {createFieldErrors.description ? (
                            <p className="mt-1 text-xs text-red-600">
                              {createFieldErrors.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {isSchemaDrivenCategory && (
                        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                            Item Details
                          </p>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div
                                className={
                                  createFieldErrors.subcategory ? "rounded-xl ring-2 ring-red-200" : ""
                                }
                              >
                                <FormDropdown
                                  label="Subcategory"
                                  value={newListing.subcategory}
                                  options={availableSubcategories}
                                  onChange={handleNewListingSubcategoryChange}
                                />
                              </div>
                              {createFieldErrors.subcategory ? (
                                <p className="mt-1 text-xs text-red-600">
                                  {createFieldErrors.subcategory}
                                </p>
                              ) : null}
                            </div>
                            <div>
                              <div
                                className={
                                  createFieldErrors.item_type ? "rounded-xl ring-2 ring-red-200" : ""
                                }
                              >
                                <FormDropdown
                                  label="Item Type"
                                  value={newListing.item_type}
                                  options={availableItemTypes}
                                  onChange={handleNewListingItemTypeChange}
                                />
                              </div>
                              {createFieldErrors.item_type ? (
                                <p className="mt-1 text-xs text-red-600">
                                  {createFieldErrors.item_type}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {newListing.subcategory &&
                            newListing.item_type &&
                            selectedItemConfig && (
                              <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
                                <div>
                                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                    Item Details
                                  </p>
                                  <p className="text-xs text-zinc-400 mt-1">
                                    {requiredSpecCount > 0
                                      ? `${completedRequiredSpecCount}/${requiredSpecCount} required fields completed. Fill required fields marked with *.`
                                      : "Fill required fields marked with *."}
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                  {basicSpecFields.map(renderListingSpecField)}
                                </div>

                                {advancedSpecFields.length > 0 && (
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => setShowAdvancedSpecs((prev) => !prev)}
                                      className="text-sm font-bold text-primary hover:underline"
                                    >
                                      {showAdvancedSpecs
                                        ? "Hide optional advanced details"
                                        : `Add optional advanced details (${advancedSpecCount})`}
                                    </button>
                                  </div>
                                )}

                                {showAdvancedSpecs && advancedSpecFields.length > 0 && (
                                  <div className="grid grid-cols-1 gap-4 border-t border-zinc-200 pt-4">
                                    {advancedSpecFields.map(renderListingSpecField)}
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      )}

                      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          Media
                        </p>

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
                                    onClick={() => {
                                      clearCreateFieldError("photos");
                                      setNewListing((prev) => ({
                                        ...prev,
                                        photos: prev.photos.filter((_, i) => i !== idx),
                                      }));
                                    }}
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
                            className={`w-full rounded-xl border p-2 ${
                              createFieldErrors.photos
                                ? "border-red-500 ring-2 ring-red-200"
                                : "border-zinc-200"
                            }`}
                          />
                          {createFieldErrors.photos ? (
                            <p className="mt-1 text-xs text-red-600">{createFieldErrors.photos}</p>
                          ) : null}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                            Video (optional, 1)
                          </label>

                          {newListing.video_url ? (
                            <div className="relative rounded-xl overflow-hidden border bg-zinc-100 mb-3">
                              <video src={newListing.video_url} controls className="w-full" />
                              <button
                                type="button"
                                onClick={() =>
                                  setNewListing((prev) => ({ ...prev, video_url: "" }))
                                }
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
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-zinc-100 bg-white flex gap-3 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateFieldErrors({});
                        setShowAddModal(false);
                      }}
                      className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 py-3 rounded-xl font-bold transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={uploading || creatingListing}
                      className={`flex-1 bg-primary text-white py-3 rounded-xl font-bold transition-colors ${
                        uploading || creatingListing
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-primary-dark"
                      }`}
                    >
                      {uploading ? "Please wait..." : creatingListing ? "Posting..." : "Post Listing"}
                    </button>
                  </div>
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
                  {authView === 'becomeSeller' && "Apply to Become a Seller"}
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
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Full Legal Name</label>
      <input
        required
        type="text"
        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
        value={sellerUpgradeForm.fullLegalName}
        onChange={e => setSellerUpgradeForm({ ...sellerUpgradeForm, fullLegalName: e.target.value })}
      />
    </div>

     <FormDropdown
        label="Institution"
        value={sellerUpgradeForm.institution}
        options={UNIVERSITIES}
        onChange={(value) =>
          setSellerUpgradeForm({
            ...sellerUpgradeForm,
            institution: value as University,
          })
        }
      />

    <FormDropdown
      label="Applicant Type"
      value={sellerUpgradeForm.applicantType}
      options={["student", "staff", "registered_business"]}
      onChange={(value) =>
        setSellerUpgradeForm({
          ...sellerUpgradeForm,
          applicantType: value as "student" | "staff" | "registered_business",
        })
      }
    />

    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Institution ID / Registration Number</label>
      <input
        required
        type="text"
        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
        value={sellerUpgradeForm.institutionIdNumber}
        onChange={e => setSellerUpgradeForm({ ...sellerUpgradeForm, institutionIdNumber: e.target.value })}
      />
    </div>

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
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Business Name</label>
      <input
        required
        type="text"
        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
        value={sellerUpgradeForm.businessName}
        onChange={e => setSellerUpgradeForm({ ...sellerUpgradeForm, businessName: e.target.value })}
      />
    </div>

    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">What Do You Want to Sell?</label>
      <input
        required
        type="text"
        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
        value={sellerUpgradeForm.whatToSell}
        onChange={e => setSellerUpgradeForm({ ...sellerUpgradeForm, whatToSell: e.target.value })}
      />
    </div>

    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Business Description</label>
      <textarea
        required
        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-20 resize-none"
        value={sellerUpgradeForm.businessDescription}
        onChange={e => setSellerUpgradeForm({ ...sellerUpgradeForm, businessDescription: e.target.value })}
      />
    </div>

    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Reason for Applying</label>
      <textarea
        required
        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-20 resize-none"
        value={sellerUpgradeForm.reasonForApplying}
        onChange={e => setSellerUpgradeForm({ ...sellerUpgradeForm, reasonForApplying: e.target.value })}
      />
    </div>

    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Proof Document Upload</label>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden flex-shrink-0">
          {sellerUpgradeForm.proofDocumentUrl ? (
            <img src={sellerUpgradeForm.proofDocumentUrl} alt="Proof document" className="w-full h-full object-cover" />
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
            {uploading ? "Uploading..." : "Upload Proof"}
          </label>
        </div>
      </div>
    </div>

    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
      <p className="font-bold mb-1">Application flow: submitted → pending review → approved/rejected.</p>
      <p>False information can lead to rejection, suspension, or account removal.</p>
    </div>

    <div className="flex items-start gap-2">
      <input
        required
        id="seller-rules-agreement"
        type="checkbox"
        checked={sellerUpgradeForm.agreedToRules}
        onChange={(e) =>
          setSellerUpgradeForm({
            ...sellerUpgradeForm,
            agreedToRules: e.target.checked,
          })
        }
        className="mt-1"
      />
      <label htmlFor="seller-rules-agreement" className="text-sm text-zinc-600">
        I agree to seller rules and prohibited-items policy.
      </label>
    </div>

    <button
      type="submit"
      disabled={uploading || !sellerUpgradeForm.proofDocumentUrl || !sellerUpgradeForm.agreedToRules}
      className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
    >
      Submit Seller Application
    </button>

    {sellerApplicationStatus && (
      <p className="text-sm text-zinc-600 text-center">
        Current application status: <span className="font-bold capitalize">{sellerApplicationStatus}</span>
      </p>
    )}

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
              {sellerDashboard.top_listing.views_count} views
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

                      <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Hidden Listings</p>
                        {hiddenListingIds.length ? (
                          <div className="space-y-2">
                            {hiddenListingIds.map((id) => {
                              const listing = listings.find((l) => l.id === id);

                              return (
                                <button
                                  key={id}
                                  onClick={() => unhideListingLocal(id)}
                                  className="w-full text-left px-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-100"
                                >
                                  {listing ? `Unhide ${listing.name}` : `Unhide listing #${id}`}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-500">No hidden listings.</p>
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
        fullLegalName: "",
        institution: userProfile?.university || UNIVERSITIES[0],
        applicantType: "student",
        institutionIdNumber: "",
        whatsappNumber: userProfile?.whatsapp_number || "",
        businessName: userProfile?.business_name || "",
        whatToSell: "",
        businessDescription: "",
        reasonForApplying: "",
        proofDocumentUrl: "",
        agreedToRules: false,
      });
      setAuthView("becomeSeller");
    }}
    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-3 rounded-xl font-bold transition-colors"
  >
    Apply to Become a Seller
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

                      {isAdminUser && (
                        <button
                          onClick={() => setShowAdminSellerApplicationsModal(true)}
                          className="w-full bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-900 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4" /> Seller Applications
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
              <div key={listing.id}>
                <ListingCard
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
              </div>
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
                setNewListing(createInitialListingDraft(userProfile));
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
              <div key={listing.id}>
                <ListingCard
                  listing={listing}
                  onReport={handleReport}
                  currentUid={firebaseUser?.uid}
                  onDelete={handleDeleteListing}
                  onEdit={handleEditListing}
                  onOpenProfile={openPublicProfile}
                  onOpenDetails={openDetails}
                  onHideSeller={hideSellerLocal}
                  onHideListing={hideListingLocal}
                  onToggleStatus={handleToggleListingStatus}
                  isSaved={savedListingIds.includes(listing.id)}
                  onToggleSave={toggleSavedListing}
                  isLoggedIn={!!firebaseUser}
                  requireLoginForContact={requireLoginForContact}
                />
              </div>
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
                {visiblePublicProfileListings.length} item(s)
              </span>
            </div>

            {visiblePublicProfileListings.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visiblePublicProfileListings.map((l) => (
                  <div key={l.id}>
                    <ListingCard
                      listing={l}
                      onReport={handleReport}
                      currentUid={firebaseUser?.uid}
                      onDelete={handleDeleteListing}
                      onEdit={handleEditListing}
                      onOpenProfile={openPublicProfile}
                      onOpenDetails={openDetails}
                      onHideSeller={hideSellerLocal}
                      onHideListing={hideListingLocal}
                      onToggleStatus={handleToggleListingStatus}
                      isSaved={savedListingIds.includes(l.id)}
                      onToggleSave={toggleSavedListing}
                      isLoggedIn={!!firebaseUser}
                      requireLoginForContact={requireLoginForContact}
                    />
                  </div>
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
      className="relative w-[min(96vw,1200px)] mx-4 bg-white rounded-3xl overflow-hidden shadow-2xl h-[92vh] max-h-[92vh] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 border-b flex items-center justify-between">
        <div className="w-10" />

        <h2 className="text-lg font-bold flex-1 text-center truncate px-2">
          {detailsListing.name}
        </h2>

        <div className="flex items-center gap-2">
          {!isDetailsOwner && (
            <button
              type="button"
              onClick={() => toggleSavedListing(detailsListing.id)}
              className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all shadow-sm ${
                savedListingIds.includes(detailsListing.id)
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
              aria-label={savedListingIds.includes(detailsListing.id) ? "Remove from saved" : "Save item"}
            >
              <Bookmark
                className={`w-4 h-4 ${
                  savedListingIds.includes(detailsListing.id) ? "fill-current" : ""
                }`}
              />
            </button>
          )}

          <button
            type="button"
            onClick={() => handleDetailShare(detailsListing)}
            className="h-10 w-10 rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 flex items-center justify-center transition-all shadow-sm"
            aria-label="Share listing"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.59 13.51 15.42 17.49" />
              <path d="M15.41 6.51 8.59 10.49" />
            </svg>
          </button>

          <button
            type="button"
            onClick={closeDetails}
            className="h-10 w-10 rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 flex items-center justify-center transition-all shadow-sm"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <div className="relative rounded-2xl overflow-hidden bg-zinc-100 h-[340px] sm:h-[440px] md:h-[520px]">
          <img
            src={detailGalleryImages[galleryIndex] || detailGalleryImages[0]}
            alt={detailsListing.name}
            className="w-full h-full object-contain"
          />

          {detailGalleryImages.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsImageFullscreenOpen(true);
              }}
              className="absolute top-3 right-3 z-20 h-10 w-10 rounded-full bg-white/85 hover:bg-white text-zinc-900 border border-white/60 shadow flex items-center justify-center"
              aria-label="Open fullscreen image"
            >
              <Expand className="w-5 h-5" />
            </button>
          )}

          {detailGalleryImages.length > 1 && (
            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-bold">
              {galleryIndex + 1} / {detailGalleryImages.length}
            </div>
          )}

          {detailGalleryImages.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between px-2">
              <button
                type="button"
                onClick={showPrevDetailImage}
                className="p-2 bg-white/80 hover:bg-white rounded-full"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={showNextDetailImage}
                className="p-2 bg-white/80 hover:bg-white rounded-full"
              >
                ›
              </button>
            </div>
          )}
        </div>
        
 {detailGalleryImages.length > 1 && (
  <div className="flex gap-2 overflow-x-auto pb-1">
    {detailGalleryImages.map((url, idx) => (
      <button
        key={idx}
        type="button"
        onClick={() => {
          setGalleryIndex(idx);
          if (detailsListing) {
            syncListingParamsInUrl(detailsListing.id, idx);
          }
        }}
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

  <div>
    <div className="text-xs font-bold text-zinc-400 uppercase mb-1">
      Description
    </div>
    <div className="text-sm text-zinc-700 whitespace-pre-wrap">
      {detailsListing.description}
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100">
      <p className="text-[11px] font-bold text-zinc-400 uppercase">Condition</p>
      <p className="text-sm font-bold text-zinc-900 mt-1 capitalize">
        {detailsListing.condition || "used"}
      </p>
    </div>

    <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100">
      <p className="text-[11px] font-bold text-zinc-400 uppercase">Posted</p>
      <p className="text-sm font-bold text-zinc-900 mt-1">
        {formatDetailDate(detailsListing.created_at)}
      </p>
    </div>

    <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100">
      <p className="text-[11px] font-bold text-zinc-400 uppercase">Seller Joined</p>
      <p className="text-sm font-bold text-zinc-900 mt-1">
        {formatDetailDate(detailsSellerProfile?.join_date)}
      </p>
    </div>
  </div>
</div>

<div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] gap-4">
  <div>
    <div className="text-xs font-bold text-zinc-400 uppercase mb-3">
      Specifications
    </div>

    {detailSpecGroups.length > 0 && (
      <div className="relative mb-3">
        <div
          ref={detailSpecTabsRef}
          className="flex gap-2 overflow-x-auto pb-1 pr-10"
        >
          {detailSpecGroups.map((group) => (
            <button
              key={group.title}
              type="button"
              onClick={() => setActiveDetailSpecGroup(group.title)}
              className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-bold border transition ${
                activeSpecGroup?.title === group.title
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {group.title}
            </button>
          ))}
        </div>

        {showDetailSpecTabsChevron && (
          <button
            type="button"
            onClick={scrollDetailSpecTabsRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full border border-zinc-200 bg-white/95 text-zinc-600 shadow-sm flex items-center justify-center"
            aria-label="Scroll specification groups"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    )}

    <div className="rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-200 h-[34vh] xl:h-[29vh] overflow-y-auto shadow-sm">
      {activeStructuredSpecRows.length > 0 ? (
        activeStructuredSpecRows.map((row) => (
          <div
            key={row.key}
            className="px-4 py-3 grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-4 items-start"
          >
            <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide border-r border-zinc-200 pr-4">
              {row.label}
            </p>
            <p className="text-sm font-semibold text-zinc-900 text-right break-words">
              {row.value}
            </p>
          </div>
        ))
      ) : (
        detailSpecRows.map((row) => (
          <div
            key={row.label}
            className="px-4 py-3 grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-4 items-start"
          >
            <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide border-r border-zinc-200 pr-4">
              {row.label}
            </p>
            <p className="text-sm font-semibold text-zinc-900 text-right break-words capitalize">
              {row.value}
            </p>
          </div>
        ))
      )}
    </div>
  </div>

  <div>
    <div className="text-xs font-bold text-zinc-400 uppercase mb-3">
      Seller Rating
    </div>

    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
      {detailsLoadingExtra ? (
        <p className="text-sm text-zinc-500">Loading seller info...</p>
      ) : detailsRatingSummary ? (
        <div className="flex items-center gap-2 text-sm flex-wrap">
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

    <div className="flex flex-wrap gap-3 pt-2">
      <span className="px-3 py-1.5 border border-zinc-200 bg-white rounded-full text-xs font-medium text-zinc-700 shadow-sm">
        Available: {detailAvailableQuantity}
      </span>

      <span className="px-3 py-1.5 border border-zinc-200 bg-white rounded-full text-xs font-medium text-zinc-700 shadow-sm">
        Sold: {detailsListing.sold_quantity ?? 0}
      </span>

      <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-zinc-200 bg-white rounded-full text-xs font-medium text-zinc-700 shadow-sm">
        <Eye className="w-3.5 h-3.5" />
        {detailsListing.views_count ?? 0}
      </span>
    </div>

    <div className="mt-2">
      <button
        type="button"
        onClick={() => handleDetailWhatsappClick(detailsListing)}
        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-3.5 rounded-2xl font-extrabold transition-colors"
      >
        Contact
      </button>
      <p className="text-center text-xs font-medium text-zinc-500 mt-2">
        Chat in WhatsApp
      </p>
    </div>

    <div className="text-xs font-bold text-zinc-400 uppercase mt-4 mb-3">
      Related Listings
    </div>

    {detailsLoadingExtra ? (
      <p className="text-sm text-zinc-500">Loading related listings...</p>
    ) : relatedListings.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {relatedListings.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openDetails(item, 0)}
            className="w-full text-left border border-zinc-200 rounded-2xl p-3 hover:bg-zinc-50 transition"
          >
            <div className="flex gap-3">
              <img
                src={item.photos?.[0] || `https://picsum.photos/seed/${item.id}/300/300`}
                alt={item.name}
                className="w-16 h-16 rounded-xl object-cover border"
              />
              <div className="min-w-0">
                <p className="font-bold text-zinc-900 line-clamp-1">{item.name}</p>
                <p className="text-sm text-zinc-500 line-clamp-1">{item.business_name}</p>
                <p className="text-sm font-extrabold text-zinc-900 mt-1">
                  MK {Number(item.price).toLocaleString()}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    ) : (
      <p className="text-sm text-zinc-500">No related listings yet.</p>
    )}
  </div>
</div>
        
      </div>
    </motion.div>
  </motion.div>
)}

{isImageFullscreenOpen && detailsOpen && detailsListing && (
  <motion.div
    key="fullscreen-image-modal"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[95] flex items-center justify-center bg-black/95 p-4"
    onClick={() => setIsImageFullscreenOpen(false)}
  >
    <button
      type="button"
      onClick={() => setIsImageFullscreenOpen(false)}
      className="absolute top-5 right-5 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
    >
      <X className="w-5 h-5" />
    </button>

    {detailGalleryImages.length > 1 && (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            showPrevDetailImage();
          }}
          className="absolute left-5 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            showNextDetailImage();
          }}
          className="absolute right-5 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          ›
        </button>

        <div className="absolute bottom-5 right-5 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-bold">
          {galleryIndex + 1} / {detailGalleryImages.length}
        </div>
      </>
    )}

    <div
      className="max-w-[95vw] max-h-[90vh] w-full h-full flex items-center justify-center"
      onClick={(e) => e.stopPropagation()}
    >
      <img
        src={detailGalleryImages[galleryIndex] || detailGalleryImages[0]}
        alt={detailsListing.name}
        className="max-w-full max-h-full object-contain rounded-2xl"
      />
    </div>
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

{showAdminSellerApplicationsModal && isAdminUser && (
  <AdminSellerApplicationsModal
    onClose={() => setShowAdminSellerApplicationsModal(false)}
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
