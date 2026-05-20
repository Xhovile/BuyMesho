import type { ComponentType } from "react";
import { navigateToPath } from "../../lib/appNavigation";
import { ADMIN_WORKSPACE_NAV_ITEMS } from "./adminWorkspaceConfig";

type AdminWorkspaceNavProps = {
  pathname: string;
};

type NavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

export default function AdminWorkspaceNav({ pathname }: AdminWorkspaceNavProps) {
  const navItems = ADMIN_WORKSPACE_NAV_ITEMS as NavItem[];

  return (
    <nav className="rounded-3xl border border-zinc-200 bg-white p-2 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.path;
          return (
            <a
              key={item.path}
              href={item.path}
              onClick={(event) => {
                event.preventDefault();
                navigateToPath(item.path);
              }}
              className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition-colors ${
                active
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
