import { Search, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { navigateToPath } from "./lib/appNavigation";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";

const FILTERS = ["Unread", "Reported", "Blocked", "All"] as const;
type Filter = (typeof FILTERS)[number];

export default function AdminMessagesPage() {
  const [filter, setFilter] = useState<Filter>("Unread");
  const [query, setQuery] = useState("");

  return (
    <AdminWorkspaceLayout
      title="Messages"
      description="Monitor marketplace conversations without becoming a participant in them."
    >
      <section className="space-y-4">
        <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <label htmlFor="admin-message-search" className="sr-only">
            Search messages
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-zinc-400" />
            <input
              id="admin-message-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search UUID, item name, business name..."
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const active = filter === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-black transition-colors ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
            <MessageSquareText className="h-6 w-6" />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            {filter} conversations
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-zinc-900">
            Message monitoring is ready
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-600">
            Conversation records and moderation states will appear here in the next phase.
            {query.trim() ? ` Search: “${query.trim()}”` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateToPath("/admin")}
          className="text-sm font-bold text-zinc-500 hover:text-zinc-900"
        >
          Back to Admin Overview
        </button>
      </section>
    </AdminWorkspaceLayout>
  );
}
