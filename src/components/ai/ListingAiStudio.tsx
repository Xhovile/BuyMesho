import { useState } from "react";
import { Sparkles, DollarSign, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, Tag } from "lucide-react";
import { generateListingDraft, suggestListingPricing, moderateContent, type ListingAiDraft, type PriceSuggestionResult, type ContentModerationResult } from "../../lib/ai";
import type { ListingDraft } from "../../types";
import { formatMoney } from "../../shared/utils/formatMoney";
import AiIcon from "./AiIcon";

type Props = {
  currentDraft: Partial<ListingDraft>;
  onApplyDraftSuggestion: (suggested: ListingAiDraft) => void;
  showFeedback: (type: "success" | "error" | "info", title: string, message: string) => void;
};

export default function ListingAiStudio({ currentDraft, onApplyDraftSuggestion, showFeedback }: Props) {
  const [loadingAction, setLoadingAction] = useState<"draft" | "pricing" | "moderation" | null>(null);
  const [pricingResult, setPricingResult] = useState<PriceSuggestionResult | null>(null);
  const [moderationResult, setModerationResult] = useState<ContentModerationResult | null>(null);

  const handleEnhanceDraft = async () => {
    if (!currentDraft.name && !currentDraft.description) {
      showFeedback("info", "Add basic notes first", "Provide at least a title or description notes for BuyMesho AI to polish.");
      return;
    }

    setLoadingAction("draft");
    try {
      const suggested = await generateListingDraft(currentDraft);
      if (suggested && Object.keys(suggested).length > 0) {
        onApplyDraftSuggestion(suggested);
        showFeedback("success", "AI Polish Complete", "Updated title, description, categories, and specs!");
      }
    } catch (err) {
      showFeedback("error", "AI Error", "Failed to generate listing suggestions.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSuggestPrice = async () => {
    if (!currentDraft.name || !currentDraft.category) {
      showFeedback("info", "Select category & title", "Enter a title and category to get market pricing estimates.");
      return;
    }

    setLoadingAction("pricing");
    try {
      const result = await suggestListingPricing({
        name: currentDraft.name,
        category: currentDraft.category,
        condition: currentDraft.condition,
        specs: currentDraft.spec_values,
        currentPrice: currentDraft.price ? Number(currentDraft.price) : undefined,
      });

      if (result) {
        setPricingResult(result);
        showFeedback("success", "Market Valuation Ready", `Recommended Price: ${formatMoney(result.recommended_price)}`);
      }
    } catch (err) {
      showFeedback("error", "Pricing Error", "Could not estimate price range.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAuditSafety = async () => {
    const textToAudit = `${currentDraft.name || ""} ${currentDraft.description || ""}`;
    if (!textToAudit.trim()) {
      showFeedback("info", "Empty listing", "Add title and description before running safety check.");
      return;
    }

    setLoadingAction("moderation");
    try {
      const result = await moderateContent(textToAudit, "listing");
      if (result) {
        setModerationResult(result);
        if (result.is_safe) {
          showFeedback("success", "Listing Approved", "No trust & safety issues found!");
        } else {
          showFeedback("error", "Safety Alert", result.explanation);
        }
      }
    } catch (err) {
      showFeedback("error", "Audit Error", "Failed to run safety audit.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-linear-to-r from-emerald-900/5 via-teal-900/5 to-emerald-800/10 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-white/20 rounded-lg">
            <AiIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-neutral-900 flex items-center gap-2">
              BuyMesho AI Studio
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                Gemini 2.5
              </span>
            </h4>
            <p className="text-xs text-neutral-600">Smart seller tools to optimize title, description, and market price</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={handleEnhanceDraft}
          disabled={loadingAction !== null}
          className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
        >
          {loadingAction === "draft" ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <AiIcon className="w-4 h-4" />
          )}
          Auto-Polish Title & Description
        </button>

        <button
          type="button"
          onClick={handleSuggestPrice}
          disabled={loadingAction !== null}
          className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors"
        >
          {loadingAction === "pricing" ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
          )}
          Estimate Market Price
        </button>

        <button
          type="button"
          onClick={handleAuditSafety}
          disabled={loadingAction !== null}
          className="px-3 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors"
        >
          {loadingAction === "moderation" ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          )}
          Safety & Scam Audit
        </button>
      </div>

      {/* Pricing Estimation Result Cards */}
      {pricingResult && (
        <div className="mt-3 bg-white p-3.5 rounded-xl border border-emerald-200 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-800 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-emerald-700" /> Recommended Price
            </span>
            <span className="font-bold text-emerald-800 text-sm">
              {formatMoney(pricingResult.recommended_price)}
            </span>
          </div>

          <div className="flex items-center justify-between text-neutral-600 pt-1 border-t border-neutral-100">
            <span>Suggested Range:</span>
            <span className="font-medium text-neutral-800">
              {formatMoney(pricingResult.min_price)} - {formatMoney(pricingResult.max_price)}
            </span>
          </div>

          <p className="text-neutral-600 text-[11px] leading-relaxed pt-1">
            💡 {pricingResult.market_insight}
          </p>

          <button
            type="button"
            onClick={() => {
              onApplyDraftSuggestion({ price: String(pricingResult.recommended_price) });
              showFeedback("success", "Price Applied", `Set price to ${formatMoney(pricingResult.recommended_price)}`);
            }}
            className="w-full mt-1 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-semibold rounded-lg text-center transition-colors"
          >
            Apply Suggested Price
          </button>
        </div>
      )}

      {/* Moderation Result Card */}
      {moderationResult && (
        <div
          className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
            moderationResult.is_safe
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-300 text-amber-900"
          }`}
        >
          {moderationResult.is_safe ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">
              {moderationResult.is_safe ? "Safety Check Passed" : "Potential Safety Flag Detected"}
            </p>
            <p className="text-[11px] mt-0.5">{moderationResult.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
