import { HOME_PATH, navigateToPath } from "../lib/appNavigation";
import { House } from "lucide-react";

export default function BrandMark() {
  return (
    <button
      type="button"
      className="flex items-center gap-2.5 group min-w-0"
      onClick={() => navigateToPath(HOME_PATH)}
    >
      <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-900/20 group-hover:scale-105 transition-transform flex-shrink-0">
        <House className="w-5 h-5" />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-lg font-extrabold tracking-tight">
          <span className="text-red-900">Buy</span>
          <span className="text-zinc-700">Mesho</span>
        </p>
        <p className="hidden sm:block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
          Secure Marketplace
        </p>
      </div>
    </button>
  );
}
