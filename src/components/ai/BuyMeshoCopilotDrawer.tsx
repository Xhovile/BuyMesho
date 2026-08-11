import { useEffect, useRef, useState } from "react";
import { X, Send, Bot, RefreshCw, ShoppingBag, ArrowRight } from "lucide-react";
import {
  queryShoppingAssistant,
  type ShoppingAssistantResult,
  type CopilotConversationMessage,
} from "../../lib/ai";
import { formatMoney } from "../../shared/utils/formatMoney";
import { apiFetch } from "../../lib/api";
import AiIcon from "./AiIcon";

type ContextListing = {
  id: string;
  name: string;
  category?: string;
  price: number;
  description?: string;
  condition?: string;
  university?: string;
  location?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  availableListings?: ContextListing[];
  onSelectListing?: (listingId: string) => void;
};

const SUGGESTED_QUERIES = [
  "Find smartphones under 250,000 MWK",
  "How does escrow protect my purchase?",
  "I want to become a seller. What do I need?",
  "Where do I manage my seller payout details?",
  "I have a problem with an order. What should I do?",
];

export default function BuyMeshoCopilotDrawer({
  isOpen,
  onClose,
  availableListings = [],
  onSelectListing,
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchedListings, setFetchedListings] = useState<ContextListing[]>([]);
  const [messages, setMessages] = useState<
    Array<{
      role: "user" | "assistant";
      text: string;
      result?: ShoppingAssistantResult;
    }>
  >([
    {
      role: "assistant",
      text: "Muli bwanji! I’m your BuyMesho Copilot. I can help you find products, understand BuyMesho, make buying or selling decisions, and navigate marketplace features.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && availableListings.length === 0 && fetchedListings.length === 0) {
      apiFetch("/api/listings")
        .then((data: any) => {
          const list = Array.isArray(data) ? data : data?.listings || [];
          setFetchedListings(list);
        })
        .catch(() => {});
    }
  }, [isOpen, availableListings.length, fetchedListings.length]);

  if (!isOpen) return null;

  const activeContextListings = availableListings.length > 0 ? availableListings : fetchedListings;

  const handleSend = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || loading) return;

    const conversation: CopilotConversationMessage[] = messages.slice(-8).map((message) => ({
      role: message.role,
      text: message.text,
    }));

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setQuery("");
    setLoading(true);

    try {
      const result = await queryShoppingAssistant({
        query: trimmed,
        contextListings: activeContextListings.slice(0, 30),
        conversation,
      });

      if (result) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: result.reply,
            result,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "BuyMesho Copilot is temporarily unavailable. Your message has not been lost. Please try again shortly.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "BuyMesho Copilot is temporarily unavailable. Your message has not been lost. Please try again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200">
        <div className="px-5 py-3.5 bg-white border-b border-zinc-200 text-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
              <AiIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-900 leading-tight">
                BuyMesho Copilot
              </h3>
              <p className="text-xs text-zinc-500 font-semibold">Your marketplace guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
            aria-label="Close BuyMesho Copilot"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-100">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm shadow-2xs ${
                  msg.role === "user"
                    ? "bg-zinc-900 text-white rounded-br-xs"
                    : "bg-white text-zinc-900 border border-sky-300 rounded-bl-xs"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-700 mb-1.5">
                    <Bot className="w-3.5 h-3.5 text-zinc-900" /> BuyMesho Copilot
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                {msg.result?.recommended_listing_ids && msg.result.recommended_listing_ids.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-200/80 space-y-2">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-zinc-800" /> Relevant listings
                    </p>
                    <div className="grid gap-2">
                      {msg.result.recommended_listing_ids.map((id) => {
                        const item = activeContextListings.find((l) => String(l.id) === String(id));
                        if (!item) return null;
                        const reason = msg.result?.match_reasons?.[id];

                        return (
                          <div
                            key={id}
                            onClick={() => onSelectListing?.(id)}
                            className="p-2.5 rounded-2xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 transition-all cursor-pointer group flex items-start justify-between gap-2"
                          >
                            <div className="space-y-1 min-w-0">
                              <h4 className="text-xs font-bold text-zinc-900 group-hover:text-black truncate">
                                {item.name}
                              </h4>
                              <p className="text-xs text-zinc-900 font-extrabold">
                                {formatMoney(item.price)}
                              </p>
                              {reason && (
                                <p className="text-[11px] text-zinc-600 line-clamp-2 leading-snug">
                                  {reason}
                                </p>
                              )}
                            </div>
                            <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-transform shrink-0 self-center" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {msg.result?.suggested_follow_ups && msg.result.suggested_follow_ups.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 justify-start max-w-[85%]">
                  {msg.result.suggested_follow_ups.map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => handleSend(prompt)}
                      className="text-xs text-emerald-950 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-300/80 hover:border-emerald-400 px-3 py-1.5 rounded-full transition-all font-semibold shadow-2xs cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 bg-white p-3 rounded-2xl border border-sky-300 w-fit shadow-2xs animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
              BuyMesho Copilot is thinking…
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 2 && (
          <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50/80 shrink-0">
            <p className="text-[11px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">Try asking</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="text-xs px-3 py-1.5 rounded-xl transition-all text-left font-semibold shadow-2xs cursor-pointer border bg-emerald-50/80 hover:bg-emerald-100/90 border-emerald-300/90 hover:border-emerald-400 text-emerald-950"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 sm:p-4 bg-white border-t border-zinc-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(query);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask BuyMesho Copilot anything..."
              className="flex-1 bg-zinc-100 hover:bg-zinc-50 focus:bg-white text-zinc-900 placeholder:text-zinc-400 border border-zinc-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black transition-all"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-2xl transition-all shrink-0 cursor-pointer"
              aria-label="Send message to BuyMesho Copilot"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
