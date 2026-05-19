import { ClipboardList, Home, ListChecks, ReceiptText, ShieldCheck, Wallet, Wrench } from "lucide-react";
import type { ComponentType } from "react";
import {
  ADMIN_AUDIT_PATH,
  ADMIN_MODERATION_QUEUE_PATH,
  ADMIN_PATH,
  ADMIN_PAYMENTS_PATH,
  ADMIN_PAYOUTS_PATH,
  ADMIN_REPORTS_PATH,
  ADMIN_SELLER_APPLICATIONS_PATH,
  ADMIN_SETUP_PATH,
  navigateToPath,
} from "../../lib/appNavigation";

type AdminWorkspaceNavProps = {
  pathname: string;
};

type NavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", path: ADMIN_PATH, icon: Home },
  { label: "Moderation Queue", path: ADMIN_MODERATION_QUEUE_PATH, icon: ListChecks },
  { label: "Reports", path: ADMIN_REPORTS_PATH, icon: ClipboardList },
  { label: "Seller Applications", path: ADMIN_SELLER_APPLICATIONS_PATH, icon: ShieldCheck },
  { label: "Payments", path: ADMIN_PAYMENTS_PATH, icon: ReceiptText },
  { label: "Payouts", path: ADMIN_PAYOUTS_PATH, icon: Wallet },
  { label: "Audit Log", path: ADMIN_AUDIT_PATH, icon: ClipboardList },
  { label: "Admin Setup", path: ADMIN_SETUP_PATH, icon: Wrench },
];

export default function AdminWorkspaceNav({ pathname }: AdminWorkspaceNavProps) {
  return (
    <nav className="rounded-3xl border border-zinc-200 bg-white p-2 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigateToPath(item.path)}
              className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition-colors ${
                active
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
