import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  User, 
  MessageCircle, 
  ShieldCheck, 
  AlertTriangle, 
  Filter,
  ChevronRight,
  X,
  Camera,
  Loader2,
  MapPin,
  Tag,
  LogOut,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Listing, Seller, University, Category } from './types';
import { UNIVERSITIES, CATEGORIES } from './constants';
import { auth, db as firestore } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification, 
  sendPasswordResetEmail,
  deleteUser,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { useAuthUser } from "./hooks/useAuthUser";
import { apiFetch } from "./lib/api"; 
import EditListingModal from "./components/EditListingModal";

// --- Components ---

const Navbar = ({ 
  onSearch, 
  onAddListing, 
  onProfileClick,
  userSeller,
  firebaseUser
}: { 
  onSearch: (val: string) => void, 
  onAddListing: () => void,
  onProfileClick: () => void,
  userSeller: Seller | null,
  firebaseUser: FirebaseUser | null
}) => {
  return (
    <nav className="sticky top-0 z-50 glass px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => window.location.reload()}>
          <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20 group-hover:scale-105 transition-transform">
            B
          </div>
          <h1 className="hidden sm:block text-xl font-sans font-extrabold tracking-tight">
            <span className="text-red-900">Buy</span><span className="text-zinc-700">Mesho</span>
          </h1>
        </div>

        <div className="flex-1 max-w-md relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search products or services..."
            className="w-full pl-11 pr-4 py-2.5 bg-zinc-100/50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onAddListing}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition-all hover:shadow-lg hover:shadow-zinc-200 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">List Item</span>
          </button>
          <button 
            onClick={onProfileClick}
            className="w-11 h-11 rounded-2xl border border-zinc-200 flex items-center justify-center hover:bg-white hover:border-primary/20 hover:shadow-md transition-all overflow-hidden active:scale-95 bg-white"
          >
            {userSeller ? (
              <img src={userSeller.business_logo} alt="Profile" className="w-full h-full object-cover" />
            ) : firebaseUser ? (
              <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary font-bold">
                {firebaseUser.email?.charAt(0).toUpperCase()}
              </div>
            ) : (
              <User className="w-5 h-5 text-zinc-600" />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

const ListingCard = ({
  listing,
  onReport,
  currentUid,
  onDelete,
  onEdit,
}: {
  listing: Listing;
  onReport: (id: number) => any;
  currentUid?: string;
  onDelete?: (id: number) => void;
  onEdit?: (listing: Listing) => void;
}) => {
  const sellerUid = (listing as any).seller_uid as string | undefined;
  const isOwner = !!currentUid && !!sellerUid && sellerUid === currentUid;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-3xl border border-zinc-100 overflow-hidden card-shadow hover:card-shadow-hover transition-all group"
    >
      <div className="relative aspect-[1/1] overflow-hidden bg-zinc-100">
        <img
          src={listing.photos[0] || `https://picsum.photos/seed/${listing.id}/600/600`}
          alt={listing.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5 shadow-sm">
            <MapPin className="w-3 h-3 text-primary" /> {listing.university}
          </span>
        </div>

        <button
          onClick={() => onReport(listing.id)}
          className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
        >
          <AlertTriangle className="w-4 h-4" />
        </button>

        <div className="absolute bottom-4 left-4">
          <div className="bg-white/90 backdrop-blur-md text-zinc-900 px-3 py-1.5 rounded-xl font-bold text-sm shadow-sm border border-white/20">
            MK {listing.price.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-extrabold text-primary bg-primary/5 px-2 py-0.5 rounded-md uppercase tracking-wider">
            {listing.category}
          </span>

          <a
            href={`https://wa.me/${listing.whatsapp_number}?text=Hi, I'm interested in your ${listing.name} on BuyMesho.`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-[#25D366]/20 active:scale-95"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Contact
          </a>
        </div>

        <h3 className="text-lg font-bold text-zinc-900 mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {listing.name}
        </h3>
        <p className="text-sm text-zinc-500 line-clamp-2 mb-5 h-10 leading-relaxed">
          {listing.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img
                src={listing.business_logo}
                alt={listing.business_name}
                className="w-9 h-9 rounded-xl object-cover border border-zinc-100 shadow-sm"
              />
              {listing.is_verified && (
                <div className="absolute -right-1.5 -bottom-1.5 bg-white rounded-full p-0.5 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-50" />
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-800">{listing.business_name}</span>
              <span className="text-[10px] text-zinc-400 font-medium">Verified Seller</span>
            </div>
          </div>

          {/* ✅ Owner-only actions */}
          {isOwner ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onEdit?.(listing)}
                className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 transition"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete?.(listing.id)}
                className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 active:scale-95 transition"
              >
                Delete
              </button>
            </div>
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          )}
        </div>
      </div>
    </motion.div>
  );
};

const FilterSection = ({ 
  selectedUniv, 
  setSelectedUniv, 
  selectedCat, 
  setSelectedCat,
  sortBy,
  setSortBy
}: { 
  selectedUniv: string, 
  setSelectedUniv: (v: string) => void,
  selectedCat: string,
  setSelectedCat: (v: string) => void,
  sortBy: string,
  setSortBy: (v: string) => void
}) => {
  return (
    <div className="py-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="space-y-2">
        <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-primary" /> Select Campus
        </label>
        <div className="relative">
          <select 
            value={selectedUniv}
            onChange={(e) => setSelectedUniv(e.target.value)}
            className="w-full appearance-none bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all cursor-pointer"
          >
            <option value="">All Campuses</option>
            {UNIVERSITIES.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronRight className="w-4 h-4 text-zinc-400 rotate-90" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-primary" /> Select Category
        </label>
        <div className="relative">
          <select 
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="w-full appearance-none bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all cursor-pointer"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronRight className="w-4 h-4 text-zinc-400 rotate-90" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-primary" /> Sort By
        </label>
        <div className="relative">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full appearance-none bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronRight className="w-4 h-4 text-zinc-400 rotate-90" />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUniv, setSelectedUniv] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userSeller, setUserSeller] = useState<Seller | null>(null);
  const [uploading, setUploading] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot' | 'profile'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  const isFirebaseConfigured = true; // Hardcoded in firebase.ts
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  
  // Form states
  const [newListing, setNewListing] = useState({
    name: "",
    price: "",
    description: "",
    category: CATEGORIES[0] as Category,
    university: UNIVERSITIES[0] as University,
    photos: [""],
    whatsapp_number: ""
  });

  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    businessName: "",
    university: UNIVERSITIES[0] as University,
    logoUrl: "",
    bio: ""
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
            const profile = docSnap.data() as Seller;
            console.log("Firestore: Profile found", profile.business_name);
            setUserSeller(profile);

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
            setUserSeller(null);
            setAuthView("signup");
          }
        } catch (firestoreErr: any) {
          console.error("Firestore: Error fetching profile", firestoreErr);
          setFirestoreError(firestoreErr.message || "Unknown Firestore error");
        }
      } else {
        setUserSeller(null);
        setAuthView((prev) => (prev === "signup" || prev === "forgot" ? prev : "login"));
      }
    } finally {
      setProfileLoading(false);
    }
  })();
}, [firebaseUser, authLoading]);
  
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

  const handleDeleteListing = async (listingId: number) => {
  if (!confirm("Delete this listing?")) return;

  try {
    await apiFetch(`/api/listings/${listingId}`, { method: "DELETE" });
    // safest: refresh list from server
    fetchListings();
  } catch (err: any) {
    alert(err?.message || "Failed to delete listing");
  }
};

const handleEditListing = (listing: Listing) => {
  setEditingListing(listing);
};

const handleUpdateListing = async (listingId: number, updated: Partial<Listing>) => {
  const existing = listings.find((l) => l.id === listingId);
  if (!existing) {
    alert("Listing not found in state. Refresh and try again.");
    return;
  }

  // Build payload with required backend fields
  const payload = {
    name: updated.name ?? existing.name,
    price: Number(updated.price ?? existing.price),
    description: updated.description ?? existing.description ?? "",
    category: updated.category ?? existing.category,
    university: updated.university ?? existing.university,
    photos: updated.photos ?? existing.photos ?? [],
    whatsapp_number: updated.whatsapp_number ?? existing.whatsapp_number,
  };

  try {
    await apiFetch(`/api/listings/${listingId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    // safest: refresh from server
    fetchListings();

    // close modal
    setEditingListing(null);
  } catch (err: any) {
    alert(err?.message || "Failed to update listing");
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
        const userCredential = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        user = userCredential.user;
        console.log("Auth: User created successfully", user.uid);
        
        console.log("Auth: Sending verification email...");
        await sendEmailVerification(user);
        console.log("Auth: Verification email sent");
      } else {
        console.log("Auth: User already authenticated, skipping creation", user.uid);
      }

      const profile: Seller = {
        uid: user.uid,
        email: authForm.email,
        business_name: authForm.businessName,
        business_logo: authForm.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(authForm.businessName)}&background=random`,
        university: authForm.university,
        bio: authForm.bio,
        is_verified: false,
        join_date: new Date().toISOString()
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

      setUserSeller(profile);
      alert("Account created! Please check your email for verification.");
      setAuthView('profile');
    } catch (err: any) {
      console.error("Auth: Signup failed", err);
      let message = err.message;

      if (err.code === 'auth/email-already-in-use') {
        message = "This email is already registered. Would you like to log in instead?";
        if (window.confirm(message)) {
          setAuthView('login');
          return;
        }
      }
      if (err.code === 'auth/invalid-email') message = "Please enter a valid email address.";
      if (err.code === 'auth/weak-password') message = "Password should be at least 6 characters.";
      if (err.message && err.message.includes("blocked")) message = "API Connection Error. Please check your Firebase configuration.";
      
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      alert("Firebase is not configured. Please add your VITE_FIREBASE_* secrets.");
      return;
    }
    setLoading(true);
    console.log("Auth: Attempting login for", authForm.email);
    try {
      console.log("Auth: Calling signInWithEmailAndPassword...");
      const userCredential = await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      console.log("Auth: Login successful", userCredential.user.uid);
      // onAuthStateChanged will handle the view transition
    } catch (err: any) {
      console.error("Auth: Login failed", err);
      let message = "Invalid email or password. Please try again.";
      
      if (err.code === 'auth/invalid-credential') {
        message = "Invalid email or password. If you've forgotten your password, you can reset it.";
        if (window.confirm(message + "\n\nWould you like to reset your password now?")) {
          setAuthView('forgot');
          return;
        }
      } else if (err.code === 'auth/user-not-found') {
        message = "No account found with this email. Please sign up first.";
      } else if (err.code === 'auth/wrong-password') {
        message = "Incorrect password. Please try again.";
      } else if (err.code === 'auth/too-many-requests') {
        message = "Too many failed attempts. Please try again later.";
      } else if (err.message && err.message.includes("blocked")) {
        message = "API Connection Error. Please check your Firebase configuration.";
      }
      
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authForm.email) return alert("Please enter your email");
    try {
      await sendPasswordResetEmail(auth, authForm.email);
      alert("Password reset email sent!");
      setAuthView('login');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserSeller(null);
    } catch (err: any) {
      alert(err.message);
    }
  };
  const refreshVerificationStatus = async () => {
  if (!firebaseUser) return;

  try {
    // 1) refresh the firebase user object
    await firebaseUser.reload();
    const refreshedUser = auth.currentUser;
    
      if (!refreshedUser?.emailVerified) {
      alert("Not verified yet. Please click the verification link in your email, then try again.");
      return;
    }

    // 2) update Firestore users/{uid}
    const userRef = doc(firestore, "users", firebaseUser.uid);
    await updateDoc(userRef, { is_verified: true });

    // 3) update your local state so UI updates instantly
    setUserSeller((prev: any) => (prev ? { ...prev, is_verified: true } : prev));

    // 4) sync to SQLite backend (server)
    await fetch("/api/sellers", {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
          ...(await authHeaders()),
       },
      body: JSON.stringify({
        
        email: firebaseUser.email,
        business_name: userSeller?.business_name || "",
        business_logo: userSeller?.business_logo || "",
        university: userSeller?.university || "",
        bio: userSeller?.bio || "",
        is_verified: true,
        join_date: userSeller?.join_date || new Date().toISOString(),
      }),
    });

    alert("✅ Verified! You can now create listings.");
  } catch (e: any) {
    console.error(e);
    alert(e?.message || "Failed to refresh verification status.");
  }
};

  const handleDeleteAccount = async () => {
    if (!firebaseUser) return;
    if (!confirm("Are you sure you want to delete your account? This will permanently remove your profile and all your listings.")) return;

    try {
      // Delete from Firestore
      await deleteDoc(doc(firestore, "users", firebaseUser.uid));
      // Delete from Firebase Auth
      await deleteUser(firebaseUser);
      alert("Account deleted.");
    } catch (err: any) {
      alert("Error deleting account: " + err.message + ". You may need to re-authenticate to perform this action.");
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSeller || !firebaseUser) return;
    
    if (!firebaseUser.emailVerified) {
      alert("Please verify your email before posting a listing.");
      return;
    }

    try {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeaders()),
  };

  const res = await fetch("/api/listings", {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...newListing,
      price: parseFloat(newListing.price),
      photos: newListing.photos.filter((p) => p.trim() !== ""),
    }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Failed: ${res.status}`);
  }

  setShowAddModal(false);
  setNewListing({
    name: "",
    price: "",
    description: "",
    category: CATEGORIES[0] as Category,
    university: UNIVERSITIES[0] as University,
    photos: [""],
    whatsapp_number: "",
  });

  fetchListings();

} catch (err: any) {
  alert(err?.message || "Failed to create listing");
}
};
  
  const handleReport = async (listingId: number) => {
    const reason = prompt("Why are you reporting this listing?");
    if (!reason) return;

    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, reason })
      });
      alert("Report submitted. Thank you for keeping our community safe.");
    } catch (err) {
      alert("Failed to submit report");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'listing' | 'logo') => {
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
            if (type === 'listing') {
              setNewListing({ ...newListing, photos: [data.url] });
            } else {
              setAuthForm({ ...authForm, logoUrl: data.url });
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
      alert(err instanceof Error ? err.message : "Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <Navbar 
        onSearch={setSearch} 
        onAddListing={() => setShowAddModal(true)}
        onProfileClick={() => setShowProfileModal(true)}
        userSeller={userSeller}
        firebaseUser={firebaseUser}
      />

      <main className="max-w-7xl mx-auto px-4">
        {/* Hero Section */}
        <section className="py-12 sm:py-24 text-center space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl sm:text-8xl font-black tracking-tighter font-sans mb-16 sm:mb-24"
          >
            <span className="text-red-900">Buy</span>
            <span className="text-zinc-700">Mesho</span>
          </motion.h1>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold text-zinc-900 tracking-tight leading-[1.1]"
          >
            Buy & Sell anything <br/> 
            <span className="text-primary">on your campus.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 max-w-xl mx-auto text-base sm:text-lg font-medium"
          >
            Connect with fellow students at MUBAS, MUST, UNIMA and more. 
            Safe, fast, and exclusive to your university community.
          </motion.p>
        </section>

        <FilterSection 
          selectedUniv={selectedUniv} 
          setSelectedUniv={setSelectedUniv}
          selectedCat={selectedCat}
          setSelectedCat={setSelectedCat}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            Recent Listings
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </h3>
          <div className="text-xs font-bold text-zinc-400">
            Showing {listings.length} items
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-zinc-500 font-medium">Loading marketplace...</p>
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => (
                 <ListingCard
                   key={listing.id}
                   listing={listing}
                   onReport={handleReport}
                   currentUid={firebaseUser?.uid}
                   onDelete={handleDeleteListing}
                   onEdit={handleEditListing}
                  />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">No listings found</h3>
            <p className="text-zinc-500">Try adjusting your filters or search terms.</p>
          </div>
        )}
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
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Safety</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
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

              {!userSeller ? (
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
                          alert("Verification email resent!");
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Category</label>
                      <select 
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                        value={newListing.category}
                        onChange={e => setNewListing({...newListing, category: e.target.value as Category})}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">University</label>
                      <select 
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                        value={newListing.university}
                        onChange={e => setNewListing({...newListing, university: e.target.value as University})}
                      >
                        {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
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
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Product Photo</label>
                    <div className="space-y-3">
                      {newListing.photos[0] && (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
                          <img 
                            src={newListing.photos[0]} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                          <button 
                            type="button"
                            onClick={() => setNewListing({ ...newListing, photos: [""] })}
                            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'listing')}
                          className="hidden"
                          id="photo-upload"
                          disabled={uploading}
                        />
                        <label 
                          htmlFor="photo-upload"
                          className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploading ? "bg-zinc-50 border-zinc-200 cursor-not-allowed" : "bg-zinc-50 border-zinc-200 hover:border-primary/50 hover:bg-primary/5"}`}
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="w-5 h-5 text-primary animate-spin" />
                              <span className="text-sm font-medium text-zinc-500">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-5 h-5 text-zinc-400" />
                              <span className="text-sm font-medium text-zinc-600">
                                {newListing.photos[0] ? "Change Photo" : "Upload Product Photo"}
                              </span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
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
                  {authView === 'profile' && "My Profile"}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Business Name</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                          value={authForm.businessName}
                          onChange={e => setAuthForm({...authForm, businessName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">University</label>
                        <select 
                          className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                          value={authForm.university}
                          onChange={e => setAuthForm({...authForm, university: e.target.value as University})}
                        >
                          {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
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
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Password</label>
                      <input 
                        required
                        type="password" 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                        value={authForm.password}
                        onChange={e => setAuthForm({...authForm, password: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Business Logo</label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden flex-shrink-0">
                          {authForm.logoUrl ? (
                            <img src={authForm.logoUrl} alt="Logo" className="w-full h-full object-cover" />
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
                            onChange={(e) => handleFileUpload(e, 'logo')}
                            className="hidden"
                            id="logo-upload"
                          />
                          <label 
                            htmlFor="logo-upload"
                            className="inline-block px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-bold cursor-pointer transition-colors"
                          >
                            {uploading ? "Uploading..." : "Upload Logo"}
                          </label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Short Bio (Optional)</label>
                      <textarea 
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-20 resize-none"
                        value={authForm.bio}
                        onChange={e => setAuthForm({...authForm, bio: e.target.value})}
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={loading || uploading}
                      className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                    </button>
                    <p className="text-center text-sm text-zinc-500">
                      Already have an account?{" "}
                      <button type="button" onClick={() => setAuthView('login')} className="text-primary font-bold hover:underline">Log In</button>
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

                {isFirebaseConfigured && !firestoreError && authView === 'profile' && userSeller && (
                  <div className="p-8 text-center">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <img src={userSeller.business_logo} alt="Logo" className="w-full h-full rounded-full object-cover border-4 border-zinc-50 shadow-sm" />
                      {userSeller.is_verified && (
                        <div className="absolute -right-1 -bottom-1 bg-white rounded-full p-1 shadow-sm">
                          <ShieldCheck className="w-5 h-5 text-blue-500 fill-blue-50" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-2xl font-display mb-1">{userSeller.business_name}</h3>
                    <p className="text-zinc-500 text-sm mb-4 flex items-center justify-center gap-1">
                      <MapPin className="w-4 h-4" /> {userSeller.university}
                    </p>
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
                                  alert("Verification email resent!");
                                } catch (e: any) {
                                  alert(e.message);
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
                    {userSeller.bio && (
                      <p className="text-sm text-zinc-600 mb-6 max-w-xs mx-auto italic">
                        "{userSeller.bio}"
                      </p>
                    )}
                    <div className="bg-zinc-50 rounded-2xl p-4 text-left mb-6 space-y-3">
                      <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Email</p>
                        <p className="text-zinc-700 font-medium">{userSeller.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Member Since</p>
                        <p className="text-zinc-700 font-medium">{new Date(userSeller.join_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
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
      </AnimatePresence>
      {editingListing && (
  <EditListingModal
    listing={editingListing}
    onClose={() => setEditingListing(null)}
    onSave={(updated) => handleUpdateListing(editingListing.id, updated)}
  />
)}
    </div>
  );
}
