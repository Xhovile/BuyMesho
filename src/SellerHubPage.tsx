import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, ChevronRight, ClipboardList, MessageSquareText, Package, Plus, Settings } from "lucide-react";
import { navigateBackOrPath, navigateToPath } from "./lib/appNavigation";
import {
  CREATE_PATH,
  EXPLORE_PATH,
  SELLER_MESSAGES_PATH,
  MY_LISTINGS_PATH,
  SELLER_DASHBOARD_PATH,
  SELLER_ORDERS_PATH,
  SETTINGS_PATH,
} from "./lib/appNavigation.paths";
import { apiFetch } from "./lib/api";

type SellerOrderSummary = {
  order?: {
    status?: string | null;
    deliveryStatus?: "action_required" | "pending_delivery" | "delivered" | null;
  };
};

type SellerConversationSummary = {
  unread_count?: number | null;
};

function isSellerOrderActionRequired(bundle: SellerOrderSummary): boolean {
  const order = bundle.order;
  if (!order) return false;
  if (["draft", "pending_payment"].includes(String(order.status))) return false;
  if (order.deliveryStatus === "delivered" || ["fulfilled", "closed"].includes(String(order.status))) return false;
  if (order.deliveryStatus === "pending_delivery") return false;
  return order.deliveryStatus !== "delivered";
}

function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export default function SellerHubPage() {
  const [orderAttentionCount, setOrderAttentionCount] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadSellerAttention = async () => {
      try {
        const [ordersPayload, messagesPayload] = await Promise.all([
          apiFetch("/api/seller/orders"),
          apiFetch("/api/messages/inbox?scope=seller"),
        ]);

        const orders = Array.isArray(ordersPayload) ? (ordersPayload as SellerOrderSummary[]) : [];
        const messageItems =
          messagesPayload && typeof messagesPayload === "object" && "items" in messagesPayload
            ? (Array.isArray((messagesPayload as { items?: unknown }).items)
                ? ((messagesPayload as { items: SellerConversationSummary[] }).items ?? [])
                : [])
            : [];

        if (cancelled) return;

        setOrderAttentionCount(orders.filter(isSellerOrderActionRequired).length);
        setMessageUnreadCount(
          messageItems.reduce((total, conversation) => total + Number(conversation.unread_count || 0), 0),
        );
      } catch {
        // Badges are supplementary navigation signals. Keep them at zero if the count request fails.
      }
    };

    void loadSellerAttention();
    return () => {
      cancelled = true;
    };
  }, []);

  const actions = [
    {
      label: "Messages",
      description: "Open your BuyMesho messages and conversations.",
      path: SELLER_MESSAGES_PATH,
      icon: MessageSquareText,
      badge: messageUnreadCount,
    },
    {
      label: "Orders",
      description: "View and manage purchases made from your listings.",
      path: SELLER_ORDERS_PATH,
      icon: ClipboardList,
      badge: orderAttentionCount,
    },
    {
      label: "Listings",
      description: "View, edit, update stock, mark sold, and manage your listings.",
      path: `${MY_LISTINGS_PATH}?view=listings`,
      icon: Package,
    },
    {
      label: "Dashboard",
      description: "Review listing performance, views, active listings, and seller traction.",
      path: SELLER_DASHBOARD_PATH,
      icon: BarChart3,
    },
    {
      label: "Settings",
      description: "Manage your BuyMesho account and seller preferences.",
      path: SETTINGS_PATH,
      icon: Settings,
    },
  ] as const;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-900 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={() => navigateToPath(CREATE_PATH)}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            List Item
          </button>
        </div>

        <p className="mt-6 text-lg font-black uppercase tracking-[0.28em] text-zinc-600 sm:text-xl">Seller</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">Seller Management</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">Choose a seller section below.</p>

        <nav className="mt-8 overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm">
          <ol>
            {actions.map((action, index) => {
              const Icon = action.icon;
              const showBadge = "badge" in action && action.badge > 0;
              return (
                <li key={action.label} className={index > 0 ? "border-t border-zinc-200" : ""}>
                  <button
                    type="button"
                    onClick={() => navigateToPath(action.path)}
                    className="flex w-full items-center gap-4 px-5 py-5 text-left hover:bg-zinc-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="block text-sm font-black text-zinc-900">{action.label}</span>
                        {showBadge ? (
                          <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black leading-none text-red-700 ring-1 ring-red-100">
                            {formatBadgeCount(action.badge)}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-sm text-zinc-500">{action.description}</span>
                    </span>
                    <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-zinc-300" />
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </main>
  );
}
