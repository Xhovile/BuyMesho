import { HOME_PATH, navigateToPath } from "../lib/appNavigation";
import Logo from "../../photos/Logo.png";

export default function BrandMark() {
  return (
    <button
      type="button"
      className="flex items-center gap-2.5 group min-w-0"
      onClick={() => navigateToPath(HOME_PATH)}
    >
      <span className="inline-flex h-11 w-11 flex-shrink-0 overflow-hidden bg-transparent md:h-10 md:w-10">
        <img
          src={Logo}
          alt="BuyMesho logo"
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </span>
      <div className="min-w-0 text-left">
        <p className="text-xl font-extrabold tracking-tight md:text-lg">
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
