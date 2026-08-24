import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Send, Bot, RefreshCw, ShoppingBag, ArrowRight, HelpCircle, Search } from "lucide-react";
import { queryShoppingAssistant, type ShoppingAssistantMode, type ShoppingAssistantResult, type ShoppingAssistantListing } from "../../lib/ai";
import { formatMoney } from "../../shared/utils/formatMoney";
import AiIcon, { shouldHideLauncher } from "./AiIcon";

type Props = { isOpen: boolean; onClose: () => void; availableListings?: ShoppingAssistantListing[]; onSelectListing?: (listingId: string) => void };
type AssistantMessage = { role: "user" | "assistant"; text: string; result?: ShoppingAssistantResult };

const SUGGESTED_QUERIES: Record<ShoppingAssistantMode, string[]> = {
  ask: [
    "How does BuyMesho escrow and buyer protection work?",
    "How do I become a seller on BuyMesho?",
    "What can I do with my BuyMesho account?",
    "How can I manage an order or message a seller?",
  ],
  shop: [
    "Find smartphones under 250,000 MWK",
    "Find affordable fashion under 50,000 MWK",
    "Show me electronics that are currently available",
    "Find something useful for my campus budget",
  ],
};

function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="font-extrabold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) return <em key={index} className="italic">{part.slice(1, -1)}</em>;
    return part;
  });
}

function renderAssistantText(text: string) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let ordered: string[] = [];
  let unordered: string[] = [];
  const flushParagraph = () => { if (paragraph.length) { const content = paragraph.join(" ").trim(); if (content) blocks.push(<p key={`p-${blocks.length}`} className="leading-relaxed">{renderInlineMarkdown(content)}</p>); paragraph = []; } };
  const flushLists = () => {
    if (ordered.length) { const items = ordered; ordered = []; blocks.push(<ol key={`ol-${blocks.length}`} className="list-decimal space-y-2 pl-5 leading-relaxed marker:font-semibold">{items.map((item, i) => <li key={i}>{renderInlineMarkdown(item)}</li>)}</ol>); }
    if (unordered.length) { const items = unordered; unordered = []; blocks.push(<ul key={`ul-${blocks.length}`} className="list-disc space-y-2 pl-5 leading-relaxed marker:text-zinc-500">{items.map((item, i) => <li key={i}>{renderInlineMarkdown(item)}</li>)}</ul>); }
  };
  const flush = () => { flushParagraph(); flushLists(); };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flush(); continue; }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) { flush(); blocks.push(<h4 key={`h-${blocks.length}`} className="text-[0.95rem] font-extrabold leading-snug text-zinc-950">{renderInlineMarkdown(heading[1])}</h4>); continue; }
    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedMatch) { flushParagraph(); if (unordered.length) flushLists(); ordered.push(orderedMatch[1]); continue; }
    const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) { flushParagraph(); if (ordered.length) flushLists(); unordered.push(unorderedMatch[1]); continue; }
    if (ordered.length) { ordered[ordered.length - 1] += ` ${line}`; continue; }
    if (unordered.length) { unordered[unordered.length - 1] += ` ${line}`; continue; }
    paragraph.push(line);
  }
  flush();
  return <div className="space-y-3">{blocks}</div>;
}

export default function BuyMeshoCopilotDrawer({ isOpen, onClose, availableListings, onSelectListing }: Props) {
  void availableListings;
  const [mode, setMode] = useState<ShoppingAssistantMode>("ask");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [starterSuggestionsVisible, setStarterSuggestionsVisible] = useState(true);
  const [followUpSuggestionsVisible, setFollowUpSuggestionsVisible] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([{ role: "assistant", text: "Muli bwanji! I am BuyMesho Assistant. Ask me about how BuyMesho works, buying and selling, or switch to Shop to describe what you want to find." }]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => { if (isOpen && !wasOpenRef.current) { setStarterSuggestionsVisible(true); setFollowUpSuggestionsVisible(false); setQuery(""); } wasOpenRef.current = isOpen; }, [isOpen]);
  useEffect(() => { if (!isOpen) return; const timer = setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50); return () => clearTimeout(timer); }, [messages, loading, isOpen]);
  useEffect(() => { if (!isOpen) return; const original = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = original; }; }, [isOpen]);
  if (!isOpen || shouldHideLauncher()) return null;

  const handleModeChange = (nextMode: ShoppingAssistantMode) => { setMode(nextMode); setQuery(""); setStarterSuggestionsVisible(true); setFollowUpSuggestionsVisible(false); };
  const handleSend = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || loading) return;
    setStarterSuggestionsVisible(false); setFollowUpSuggestionsVisible(false); setMessages((prev) => [...prev, { role: "user", text: trimmed }]); setQuery(""); setLoading(true);
    try {
      const result = await queryShoppingAssistant({ mode, query: trimmed });
      setMessages((prev) => [...prev, { role: "assistant", text: result.reply, result }]);
      setFollowUpSuggestionsVisible(result.suggested_follow_ups.length > 0);
    } catch (error) {
      console.warn("BuyMesho Assistant query failed:", error);
      setMessages((prev) => [...prev, { role: "assistant", text: "BuyMesho Assistant is temporarily unavailable. Please try again later." }]);
    } finally { setLoading(false); }
  };
  const latestFollowUpMessageIndex = messages.reduce((latest, message, index) => message.role === "assistant" && (message.result?.suggested_follow_ups?.length ?? 0) > 0 ? index : latest, -1);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-zinc-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5 py-3.5 text-zinc-900">
          <div className="flex items-center gap-3"><div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 p-1.5"><AiIcon className="h-6 w-6" /></div><div><h3 className="text-base font-extrabold leading-tight">BuyMesho Assistant</h3><p className="text-xs font-semibold text-zinc-500">Ask about BuyMesho or discover products</p></div></div>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-2xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900" aria-label="Close BuyMesho Assistant"><X className="h-5 w-5" /></button>
        </div>
        <div className="shrink-0 border-b border-zinc-200 bg-zinc-50 px-4 py-3"><div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white p-1">
          <button type="button" onClick={() => handleModeChange("ask")} aria-pressed={mode === "ask"} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${mode === "ask" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}><HelpCircle className="h-4 w-4" /> Ask BuyMesho</button>
          <button type="button" onClick={() => handleModeChange("shop")} aria-pressed={mode === "shop"} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${mode === "shop" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}><Search className="h-4 w-4" /> Shop</button>
        </div></div>
        <div className="flex-1 space-y-3.5 overflow-y-auto bg-zinc-100 p-4">
          {messages.map((msg, idx) => <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm shadow-2xs ${msg.role === "user" ? "rounded-br-xs bg-zinc-900 text-white" : "rounded-bl-xs border border-zinc-200 bg-white text-zinc-900"}`}>
              {msg.role === "assistant" && <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-zinc-700"><Bot className="h-3.5 w-3.5 text-zinc-900" /> BuyMesho Assistant</div>}
              {msg.role === "assistant" ? renderAssistantText(msg.text) : <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
              {msg.result?.recommended_listings?.length ? <div className="mt-3 space-y-2 border-t border-zinc-200/80 pt-3"><p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-500"><ShoppingBag className="h-3 w-3" /> Current BuyMesho matches</p><div className="grid gap-2">{msg.result.recommended_listings.map((item) => { const reason = msg.result?.match_reasons?.[String(item.id)]; return <button type="button" key={item.id} onClick={() => onSelectListing?.(item.id)} className="group flex items-start justify-between gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5 text-left hover:border-zinc-300 hover:bg-zinc-100"><span className="min-w-0 space-y-1"><span className="block truncate text-xs font-bold">{item.name}</span><span className="block text-xs font-extrabold">{formatMoney(item.price)}</span>{item.condition ? <span className="block text-[11px] text-zinc-500">Condition: {item.condition}</span> : null}{reason ? <span className="block line-clamp-2 text-[11px] leading-snug text-zinc-600">{reason}</span> : null}</span><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400" /></button>; })}</div></div> : null}
            </div>
            {followUpSuggestionsVisible && idx === latestFollowUpMessageIndex && idx === messages.length - 1 && msg.result?.suggested_follow_ups?.length ? <div className="mt-2 flex max-w-[88%] flex-wrap gap-1.5">{msg.result.suggested_follow_ups.map((prompt) => <button type="button" key={prompt} onClick={() => handleSend(prompt)} className="cursor-pointer rounded-full border border-emerald-300/80 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-950">{prompt}</button>)}</div> : null}
          </div>)}
          {loading ? <div className="flex w-fit animate-pulse items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3 text-xs font-semibold text-zinc-700"><RefreshCw className="h-3.5 w-3.5 animate-spin text-red-900" /> {mode === "shop" ? "Searching current BuyMesho listings…" : "Checking BuyMesho's current product guidance…"}</div> : null}
          <div ref={messagesEndRef} />
        </div>
        {starterSuggestionsVisible ? <div className="shrink-0 border-t border-zinc-200 bg-zinc-50/80 px-4 py-3"><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Try asking</p><div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">{SUGGESTED_QUERIES[mode].map((q) => <button type="button" key={q} onClick={() => handleSend(q)} className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-left text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100">{q}</button>)}</div></div> : null}
        <div className="shrink-0 border-t border-zinc-200 bg-white p-3 sm:p-4"><form onSubmit={(event) => { event.preventDefault(); void handleSend(query); }} className="flex items-center gap-2"><input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode === "shop" ? "Describe what you want to buy…" : "Ask how BuyMesho works…"} aria-label={mode === "shop" ? "Describe what you want to buy" : "Ask how BuyMesho works"} className="flex-1 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm outline-none focus:border-black focus:bg-white focus:ring-2 focus:ring-black" /><button type="submit" disabled={!query.trim() || loading} className="shrink-0 cursor-pointer rounded-2xl bg-zinc-900 p-2.5 text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label={mode === "shop" ? "Search BuyMesho listings" : "Ask BuyMesho Assistant"}><Send className="h-4 w-4" /></button></form></div>
      </div>
    </div>
  );
}
