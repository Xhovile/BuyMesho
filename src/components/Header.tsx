import { Search, Plus, User, Compass, House, Settings } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import type { UserProfile } from "../types";
import {
  EXPLORE_PATH,
  HOME_PATH,
  SETTINGS_PATH,
  navigateToCreateListing,
  navigateToPath,
} from "../lib/appNavigation";

type HeaderProps = {
  onSearch: (val: string) => void;
  onAddListing: () => void;
  onProfileClick: () => void;
  userProfile: UserProfile | null;
  firebaseUser: FirebaseUser | null;
};

export default function Header({
  onSearch,
  onAddListing,
  onProfileClick,
  userProfile,
  firebaseUser,
}: HeaderProps) {
  const profileImage = userProfile?.avatar_url || userProfile?.business_logo;
  const fallbackLetter = (userProfile?.email || firebaseUser?.email || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            className="flex items-center gap-2.5 group min-w-0"
            onClick={() => navigateToPath(HOME_PATH)}
          >
            <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20 group-hover:scale-105 transition-transform flex-shrink-0">
              B
            </div>
            <div className="min-w-0 text-left">
              <h1 className="text-lg sm:text-xl font-sans font-extrabold tracking-tight truncate">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Explore marketplace
              </p>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateToPath(HOME_PATH)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              <House className="w-4 h-4" />
              Home
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white text-sm font-bold"
            >
              <Compass className="w-4 h-4" />
              Explore
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(SETTINGS_PATH)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={navigateToCreateListing}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 sm:px-5 py-2.5 rounded-2xl text-sm font-bold transition-all hover:shadow-lg hover:shadow-zinc-200 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">List Item</span>
            </button>

            <button
              onClick={() => navigateToPath(SETTINGS_PATH)}
              className="md:hidden w-11 h-11 rounded-2xl border border-zinc-200 flex items-center justify-center hover:bg-white hover:border-primary/20 hover:shadow-md transition-all overflow-hidden active:scale-95 bg-white"
              aria-label="Open settings"
            >
              <Settings className="w-5 h-5 text-zinc-600" />
            </button>

            <button
              onClick={onProfileClick}
              className="w-11 h-11 rounded-2xl border border-zinc-200 flex items-center justify-center hover:bg-white hover:border-primary/20 hover:shadow-md transition-all overflow-hidden active:scale-95 bg-white"
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : firebaseUser ? (
                <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary font-bold">
                  {fallbackLetter}
                </div>
              ) : (
                <User className="w-5 h-5 text-zinc-600" />
              )}
            </button>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-red-900 transition-colors" />
          <input
            type="text"
            placeholder="Search listings, products, or services..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-300 rounded-2xl text-sm text-zinc-800 placeholder:text-zinc-400 shadow-sm focus:border-red-900 focus:ring-4 focus:ring-red-900/10 focus:shadow-md outline-none transition-all"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>
    </nav>
  );
}
