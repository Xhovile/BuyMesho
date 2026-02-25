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
  onAuthStateChanged, 
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
    <nav className="sticky top-0 z-50 bg-white border-b border-zinc-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">
            C
          </div>
          <h1 className="hidden sm:block text-xl font-display text-zinc-900">CampusMarket</h1>
        </div>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search products or services..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-100 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onAddListing}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Sell</span>
          </button>
          <button 
            onClick={onProfileClick}
            className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors overflow-hidden"
          >
            {userSeller ? (
              <img src={userSeller.business_logo} alt="Profile" className="w-full h-full object-cover" />
            ) : firebaseUser ? (
              <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold">
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

const ListingCard = ({ listing, onReport }: { listing: Listing, onReport: (id: number) => any, key?: any }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-lg transition-shadow group"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
        <img 
          src={listing.photos[0] || `https://picsum.photos/seed/${listing.id}/400/300`} 
          alt={listing.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {listing.university}
          </span>
        </div>
        <button 
          onClick={() => onReport(listing.id)}
          className="absolute top-3 right-3 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-zinc-400 hover:text-red-500 transition-colors"
        >
          <AlertTriangle className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-primary flex items-center gap-1">
            <Tag className="w-3 h-3" /> {listing.category}
          </span>
          <span className="text-lg font-bold text-zinc-900">MK {listing.price.toLocaleString()}</span>
        </div>
        <h3 className="text-base font-semibold text-zinc-900 mb-2 line-clamp-1">{listing.name}</h3>
        <p className="text-sm text-zinc-500 line-clamp-2 mb-4 h-10">{listing.description}</p>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="relative">
              <img 
                src={listing.business_logo} 
                alt={listing.business_name} 
                className="w-8 h-8 rounded-full object-cover border border-zinc-200"
              />
              {listing.is_verified && (
                <div className="absolute -right-1 -bottom-1 bg-white rounded-full p-0.5">
                  <ShieldCheck className="w-3 h-3 text-blue-500 fill-blue-50" />
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-zinc-700">{listing.business_name}</span>
          </div>
          
          <a 
            href={`https://wa.me/${listing.whatsapp_number}?text=Hi, I'm interested in your ${listing.name} on CampusMarket.`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        </div>
      </div>
    </motion.div>
  );
};

const FilterSection = ({ 
  selectedUniv, 
  setSelectedUniv, 
  selectedCat, 
  setSelectedCat 
}: { 
  selectedUniv: string, 
  setSelectedUniv: (v: string) => void,
  selectedCat: string,
  setSelectedCat: (v: string) => void
}) => {
  return (
    <div className="py-6 space-y-6">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
          <MapPin className="w-3 h-3" /> Universities
        </h4>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setSelectedUniv("")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedUniv === "" ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}
          >
            All Campus
          </button>
          {UNIVERSITIES.map(u => (
            <button 
              key={u}
              onClick={() => setSelectedUniv(u)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedUniv === u ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
          <Tag className="w-3 h-3" /> Categories
        </h4>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setSelectedCat("")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCat === "" ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}
          >
            All Categories
          </button>
          {CATEGORIES.map(c => (
            <button 
              key={c}
              onClick={() => setSelectedCat(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCat === c ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}
            >
              {c}
            </button>
          ))}
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userSeller, setUserSeller] = useState<Seller | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [uploading, setUploading] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot' | 'profile'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

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
    console.log("Auth: Initializing listener");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth: State changed", user ? `User logged in: ${user.uid}` : "User logged out");
      setFirebaseUser(user);
      setProfileLoading(true);
      
      if (user) {
        try {
          setFirestoreError(null);
          console.log("Firestore: Fetching profile for", user.uid);
          const docRef = doc(firestore, "users", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const profile = docSnap.data() as Seller;
            console.log("Firestore: Profile found", profile.business_name);
            setUserSeller(profile);
            
            // Sync with local SQLite
            setAuthView('profile');   
} else {
            try {
              const syncRes = await fetch('/api/sellers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile)
              });
              if (!syncRes.ok) console.error("SQLite: Sync failed", syncRes.status);
            } catch (syncErr) {
              console.error("SQLite: Sync error", syncErr);
            }
          } else {
            console.warn("Firestore: No profile document found for user", user.uid);
            setUserSeller(null);
            setAuthView('signup');
          }
        } catch (firestoreErr: any) {
          console.error("Firestore: Error fetching profile", firestoreErr);
          setFirestoreError(firestoreErr.message || "Unknown Firestore error");
        } 
      } else {
        setUserSeller(null);
        setAuthView('login');
      }
      setProfileLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchListings();
  }, [selectedUniv, selectedCat, search]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedUniv) params.append("university", selectedUniv);
      if (selectedCat) params.append("category", selectedCat);
      if (search) params.append("search", search);
      
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
      const user = userCredential.user;

      await sendEmailVerification(user);

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

      // Save to Firestore
      await setDoc(doc(firestore, "users", user.uid), profile);

      // Sync to SQLite
      await fetch('/api/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      setUserSeller(profile);
      alert("Account created! Please check your email for verification.");
      setAuthView('profile');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      setAuthView('profile');
    } catch (err: any) {
      alert(err.message);
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
      setFirebaseUser(null);
    } catch (err: any) {
      alert(err.message);
    }
  };
  const refreshVerificationStatus = async () => {
  if (!firebaseUser) return;

  try {
    // 1) refresh the firebase user object
    await firebaseUser.reload();

    if (!firebaseUser.emailVerified) {
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: firebaseUser.uid,
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
      await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newListing,
          seller_uid: userSeller.uid,
          price: parseFloat(newListing.price),
          photos: newListing.photos.filter(p => p.trim() !== "")
        })
      });
      setShowAddModal(false);
      setNewListing({
        name: "",
        price: "",
        description: "",
        category: CATEGORIES[0] as Category,
        university: UNIVERSITIES[0] as University,
        photos: [""],
        whatsapp_number: ""
      });
      fetchListings();
    } catch (err) {
      alert("Failed to create listing");
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
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        let errorMessage = "Upload failed";
        if (contentType && contentType.includes("application/json")) {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } else {
          errorMessage = `Server error: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.url) {
          if (type === 'listing') {
            setNewListing({ ...newListing, photos: [data.url] });
          } else {
            setAuthForm({ ...authForm, logoUrl: data.url });
          }
        }
      } else {
        throw new Error("Server returned non-JSON response");
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
        <FilterSection 
          selectedUniv={selectedUniv} 
          setSelectedUniv={setSelectedUniv}
          selectedCat={selectedCat}
          setSelectedCat={setSelectedCat}
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-zinc-500 font-medium">Loading marketplace...</p>
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} onReport={handleReport} />
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
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xl">Create Listing</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
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
                  {authView === 'signup' && "Join CampusMarket"}
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
                      <div className="mb-6 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs font-medium flex items-center gap-2 justify-center">
                        <AlertTriangle className="w-4 h-4" />
                        Verify your email to post listings
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
    </div>
  );
}
