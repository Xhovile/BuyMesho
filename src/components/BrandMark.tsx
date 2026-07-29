import { HOME_PATH, navigateToPath } from "../lib/appNavigation";
import loaderImage from "../../photos/LoaderPic.png";

export default function BrandMark() {
  return (
    <button
      type="button"
      className="flex items-center gap-2.5 group min-w-0"
      onClick={() => navigateToPath(HOME_PATH)}
    >
      <img
        src={loaderImage}
        alt="BuyMesho logo"
        className="h-10 w-10 flex-shrink-0 object-contain transition-transform group-hover:scale-105"
      />
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
