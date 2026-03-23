import { useEffect, useState } from "react";
import { ChevronLeft, Lock, Mail, Plus, ShieldCheck } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db as firestore } from "./firebase";
import { useAuthUser } from "./hooks/useAuthUser";
import type { UserProfile } from "./types";
import { EXPLORE_PATH, HOME_PATH, navigateToPath } from "./lib/appNavigation";

export default function CreateListingPage() {
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!firebaseUser) {
        setProfile(null);
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      try {
        const snap = await getDoc(doc(firestore, "users", firebaseUser.uid));
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      } catch (error) {
        console.error("Failed to load create-listing profile state", error);
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    };

    void loadProfile();
  }, [firebaseUser]);

  const isReadyToSell = !!profile?.is_seller && !!auth.currentUser?.emailVerified;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20">B</div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight"><span className="text-red-900">Buy</span><span className="text-zinc-700">Mesho</span></p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Create listing</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateToPath(EXPLORE_PATH)}
            className="px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50"
          >
            Back to Explore
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Listing studio</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
            Create listing is now getting its own surface.
          </h1>
          <p className="mt-3 max-w-3xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
            This route-backed page is the transition point away from modal-only selling. The full create flow still depends on the existing Explore listing creator right now, but selling now has its own dedicated entry surface.
          </p>
        </section>

        <section className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-zinc-900">Pre-flight checks</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-zinc-500 mt-0.5" />
                <div>
                  <p className="font-bold text-zinc-900">Login</p>
                  <p className="text-zinc-600">{authLoading ? "Checking account..." : firebaseUser ? "Logged in" : "You need to log in first."}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-zinc-500 mt-0.5" />
                <div>
                  <p className="font-bold text-zinc-900">Seller status</p>
                  <p className="text-zinc-600">{loadingProfile ? "Checking seller profile..." : profile?.is_seller ? "Seller account available" : "Apply to become a seller before posting."}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 flex items-start gap-3">
                <Mail className="w-5 h-5 text-zinc-500 mt-0.5" />
                <div>
                  <p className="font-bold text-zinc-900">Email verification</p>
                  <p className="text-zinc-600">{auth.currentUser?.emailVerified ? "Verified" : "Verify your email before posting."}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-zinc-900">Continue to the current creator</h2>
            <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
              The full page-level create form is still being extracted from Explore. For now, use the current creator while the route-backed surface and selling structure are being established.
            </p>

            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              <Plus className="w-4 h-4" />
              {isReadyToSell ? "Open current listing creator in Explore" : "Go to Explore"}
            </button>

            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 leading-relaxed">
              This is a deliberate transition step: selling now has its own addressable page, even before the entire creator is fully extracted from the giant Explore app surface.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
