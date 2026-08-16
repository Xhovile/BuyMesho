import { ArrowLeft, ChevronRight, CircleDollarSign, ClipboardList, Settings } from "lucide-react";
import { navigateBackOrPath, navigateToPath } from "./lib/appNavigation";
import { EXPLORE_PATH, SETTINGS_PATH, SELLER_ORDERS_PATH, SELLER_PAYOUTS_MANAGE_PATH } from "./lib/appNavigation.paths";

const actions = [
  { label: "Orders", description: "View and manage purchases made from your listings.", path: SELLER_ORDERS_PATH, icon: ClipboardList },
  { label: "Seller Payouts", description: "Manage payout destinations and review payout history.", path: SELLER_PAYOUTS_MANAGE_PATH, icon: CircleDollarSign },
  { label: "Settings", description: "Manage your BuyMesho account and seller preferences.", path: SETTINGS_PATH, icon: Settings },
] as const;

export default function SellerHubPage() {
  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-900 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={() => navigateBackOrPath(EXPLORE_PATH)} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"><ArrowLeft className="h-4 w-4" />Back</button>
        <p className="mt-6 text-lg font-black uppercase tracking-[0.28em] text-zinc-600 sm:text-xl">Seller</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">Orders and Payout Management</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">Choose a seller section below.</p>
        <nav className="mt-8 overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm"><ol>{actions.map((action, index) => <li key={action.label} className={index > 0 ? "border-t border-zinc-200" : ""}><button type="button" onClick={() => navigateToPath(action.path)} className="flex w-full items-center gap-4 px-5 py-5 text-left hover:bg-zinc-50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white"><action.icon className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-black text-zinc-900">{action.label}</span><span className="mt-1 block text-sm text-zinc-500">{action.description}</span></span><ChevronRight className="ml-auto h-5 w-5 shrink-0 text-zinc-300" /></button></li>)}</ol></nav>
      </div>
    </main>
  );
}
