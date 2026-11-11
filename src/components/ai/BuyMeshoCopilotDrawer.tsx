import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Send, Bot, RefreshCw, ShoppingBag, ArrowRight, HelpCircle, Search } from "lucide-react";
import { queryShoppingAssistant, type AssistantConversationMessage, type ShoppingAssistantMode, type ShoppingAssistantResult, type ShoppingAssistantListing } from "../../lib/ai";
import { getPlatformNavigationEntry } from "../../../shared/platformNavigation";
import { navigateToPath } from "../../lib/appNavigation";
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
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-bm-surface-muted px-1 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
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
    if (unordered.length) { const items = unordered; unordered = []; blocks.push(<ul key={`ul-${blocks.length}`} className="list-disc space-y-2 pl-5 leading-relaxed marker:text-bm-text-subtle">{items.map((item, i) => <li key={i}>{renderInlineMarkdown(item)}</li>)}</ul>); }
  };
  const flush = () => { flushParagraph(); flushLists(); };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flush(); continue; }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) { flush(); blocks.push(<h4 key={`h-${blocks.length}`} className="text-[0.95rem] font-extrabold leading-snug text-bm-text">{renderInlineMarkdown(heading[1])}</h4>); continue; }
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
    const conversation: AssistantConversationMessage[] = messages.map(({ role, text }) => ({ role, text })).slice(-8);
    setStarterSuggestionsVisible(false); setFollowUpSuggestionsVisible(false); setMessages((prev) => [...prev, { role: "user", text: trimmed }]); setQuery(""); setLoading(true);
    try {
      const result = await queryShoppingAssistant({ mode, query: trimmed, conversation: [...conversation, { role: "user", text: trimmed } satisfies AssistantConversationMessage].slice(-8) });
      setMessages((prev) => [...prev, { role: "assistant", text: result.reply, result }]);
      setFollowUpSuggestionsVisible(result.suggestions.length > 0);
    } catch (error) {
      console.warn("BuyMesho Assistant query failed:", error);
      setMessages((prev) => [...prev, { role: "assistant", text: "BuyMesho Assistant is temporarily unavailable. Please try again later." }]);
    } finally { setLoading(false); }
  };
  const handleNavigation = (targetId: string) => {
    const target = getPlatformNavigationEntry(targetId);
    if (!target) return;
    navigateToPath(target.path);
    onClose();
  };
  const latestFollowUpMessageIndex = messages.reduce((latest, message, index) => message.role === "assistant" && (message.result?.suggestions?.length ?? 0) > 0 ? index : latest, -1);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-bm-border bg-bm-surface shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-bm-border bg-bm-surface px-5 py-3.5 text-bm-text">
          <div className="flex items-center gap-3"><div className="flex items-center justify-center rounded-2xl border border-bm-border bg-bm-surface-muted p-1.5"><AiIcon className="h-6 w-6" /></div><div><h3 className="text-base font-extrabold leading-tight">BuyMesho Assistant</h3><p className="text-xs font-semibold text-bm-text-subtle">Ask about BuyMesho or discover products</p></div></div>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-2xl p-2 text-bm-text-subtle transition-colors hover:bg-bm-surface-muted hover:text-bm-text" aria-label="Close BuyMesho Assistant"><X className="h-5 w-5" /></button>
        </div>
        <div className="shrink-0 border-b border-bm-border bg-bm-surface-muted px-4 py-3"><div className="grid grid-cols-2 gap-2 rounded-2xl border border-bm-border bg-bm-surface p-1">
          <button type="button" onClick={() => handleModeChange("ask")} aria-pressed={mode === "ask"} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${mode === "ask" ? "bg-bm-brand text-white" : "text-bm-text-muted hover:bg-bm-surface-muted"}`}><HelpCircle className="h-4 w-4" /> Ask BuyMesho</button>
          <button type="button" onClick={() => handleModeChange("shop")} aria-pressed={mode === "shop"} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${mode === "shop" ? "bg-bm-brand text-white" : "text-bm-text-muted hover:bg-bm-surface-muted"}`}><Search className="h-4 w-4" /> Shop</button>
        </div></div>
        <div className="flex-1 space-y-3.5 overflow-y-auto bg-bm-surface-muted p-4">
          {messages.map((msg, idx) => <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm shadow-2xs ${msg.role === "user" ? "rounded-br-xs bg-bm-brand text-bm-on-brand" : "rounded-bl-xs border border-bm-border bg-bm-surface text-bm-text"}`}>
              {msg.role === "assistant" && <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-bm-text-muted"><Bot className="h-3.5 w-3.5 text-bm-text" /> BuyMesho Assistant</div>}
              {msg.role === "assistant" ? renderAssistantText(msg.text) : <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
              {msg.result?.actions?.length ? <div className="mt-3 space-y-2 border-t border-bm-border pt-3"><p className="text-xs font-bold uppercase tracking-wider text-bm-text-subtle">Go to</p><div className="grid gap-2">{msg.result.actions.filter((action) => action.type === "navigate").map((action) => <button type="button" key={action.id} onClick={() => handleNavigation(action.target)} className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-bm-border bg-bm-surface-muted p-3 text-left hover:border-bm-border hover:bg-bm-surface-muted"><span className="min-w-0"><span className="block text-sm font-bold text-bm-text">{action.label}</span>{action.description ? <span className="mt-0.5 block text-xs leading-snug text-bm-text-subtle">{action.description}</span> : null}</span><ArrowRight className="h-4 w-4 shrink-0 text-bm-text-subtle" /></button>)}</div></div> : null}
              {msg.result?.recommended_listings?.length ? <div className="mt-3 space-y-2 border-t border-bm-border pt-3"><p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-bm-text-subtle"><ShoppingBag className="h-3 w-3" /> Current BuyMesho matches</p><div className="grid gap-2">{msg.result.recommended_listings.map((item) => { const reason = msg.result?.match_reasons?.[String(item.id)]; return <button type="button" key={item.id} onClick={() => onSelectListing?.(item.id)} className="group flex items-start justify-between gap-2 rounded-2xl border border-bm-border bg-bm-surface-muted p-2.5 text-left hover:border-bm-border hover:bg-bm-surface-muted"><span className="min-w-0 space-y-1"><span className="block truncate text-xs font-bold">{item.name}</span><span className="block text-xs font-extrabold">{formatMoney(item.price)}</span>{item.condition ? <span className="block text-[11px] text-bm-text-subtle">Condition: {item.condition}</span> : null}{reason ? <span className="block line-clamp-2 text-[11px] leading-snug text-bm-text-muted">{reason}</span> : null}</span><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-bm-text-subtle" /></button>; })}</div></div> : null}
            </div>
            {followUpSuggestionsVisible && idx === latestFollowUpMessageIndex && idx === messages.length - 1 && msg.result?.suggestions?.length ? <div className="mt-2 flex max-w-[88%] flex-wrap gap-1.5">{msg.result.suggestions.map((suggestion) => <button type="button" key={suggestion.id} onClick={() => handleSend(suggestion.label)} className="cursor-pointer rounded-full border border-bm-border bg-bm-surface-muted px-3 py-1.5 text-xs font-semibold text-bm-text-muted">{suggestion.label}</button>)}</div> : null}
          </div>)}
          {loading ? <div className="flex w-fit animate-pulse items-center gap-2 rounded-2xl border border-bm-border bg-bm-surface p-3 text-xs font-semibold text-bm-text-muted"><RefreshCw className="h-3.5 w-3.5 animate-spin text-bm-brand" /> {mode === "shop" ? "Searching current BuyMesho listings…" : "Checking BuyMesho's current product guidance…"}</div> : null}
          <div ref={messagesEndRef} />
        </div>
        {starterSuggestionsVisible ? <div className="shrink-0 border-t border-bm-border bg-bm-surface-muted/80 px-4 py-3"><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-bm-text-subtle">Try asking</p><div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">{SUGGESTED_QUERIES[mode].map((q) => <button type="button" key={q} onClick={() => handleSend(q)} className="cursor-pointer rounded-xl border border-bm-border bg-bm-surface px-3 py-1.5 text-left text-xs font-semibold text-bm-text-muted hover:border-bm-border hover:bg-bm-surface-muted">{q}</button>)}</div></div> : null}
        <div className="shrink-0 border-t border-bm-border bg-bm-surface p-3 sm:p-4"><form onSubmit={(event) => { event.preventDefault(); void handleSend(query); }} className="flex items-center gap-2"><input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode === "shop" ? "Describe what you want to buy…" : "Ask how BuyMesho works…"} aria-label={mode === "shop" ? "Describe what you want to buy" : "Ask how BuyMesho works"} className="flex-1 rounded-2xl border border-bm-border bg-bm-surface-muted px-4 py-2.5 text-sm outline-none focus:border-bm-brand focus:bg-bm-surface focus:ring-2 focus:ring-bm-brand" /><button type="submit" disabled={!query.trim() || loading} className="shrink-0 cursor-pointer rounded-2xl bg-bm-brand p-2.5 text-bm-on-brand disabled:cursor-not-allowed disabled:opacity-40" aria-label={mode === "shop" ? "Search BuyMesho listings" : "Ask BuyMesho Assistant"}><Send className="h-4 w-4" /></button></form></div>
      </div>
    </div>
  );
}
