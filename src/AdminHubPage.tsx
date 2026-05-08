import {
  Shield,
  ClipboardList,
  Webhook,
} from "lucide-react";

import { navigateToPath } from "./lib/appNavigation";

export default function AdminHubPage() {
  const cards = [
    {
      title: "Reports",
      desc: "Moderate reports and complaints",
      icon: ClipboardList,
      path: "/admin/reports",
    },
    {
      title: "Seller Approvals",
      desc: "Approve or reject seller applications",
      icon: Shield,
      path: "/admin/seller-applications",
    },
    {
      title: "Payments & Webhooks",
      desc: "Track payment and webhook activity",
      icon: Webhook,
      path: "/admin/payments",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black text-zinc-900">
          Admin Dashboard
        </h1>

        <p className="mt-2 text-zinc-600">
          Centralized moderation and monitoring tools.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <button
                key={card.title}
                onClick={() => navigateToPath(card.path)}
                className="bg-white border border-zinc-200 rounded-3xl px-4 py-3 text-left hover:shadow-lg transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-zinc-700" />
                  </div>
                  <h2 className="text-lg font-black text-zinc-900">
                    {card.title}
                  </h2>
                </div>

                <p className="mt-2 text-sm text-zinc-600">
                  {card.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
