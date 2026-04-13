import { navigateToPath, HOME_PATH } from "../lib/appNavigation";

type BrandMarkProps = {
  subtitle?: string;
  showSubtitleOnMobile?: boolean;
  className?: string;
  onClick?: () => void;
};

export default function BrandMark({
  subtitle = "Secure Marketplace",
  showSubtitleOnMobile = false,
  className = "",
  onClick,
}: BrandMarkProps) {
  return (
    <button
      type="button"
      onClick={onClick || (() => navigateToPath(HOME_PATH))}
      className={`flex items-center gap-2.5 min-w-0 group ${className}`}
    >
      <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20 group-hover:scale-105 transition-transform flex-shrink-0">
        B
      </div>

      <div className="min-w-0 text-left">
        <p className="text-lg sm:text-xl font-black tracking-[-0.04em] leading-none truncate">
          <span className="text-red-900">Buy</span>
          <span className="text-zinc-700">Mesho</span>
        </p>

        <p
          className={`text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400 ${
            showSubtitleOnMobile ? "" : "hidden sm:block"
          }`}
        >
          {subtitle}
        </p>
      </div>
    </button>
  );
}
