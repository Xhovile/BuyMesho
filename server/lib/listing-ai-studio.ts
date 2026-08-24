import { generateGeminiJson } from "./gemini.js";

export type ListingDraftSuggestion = {
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  item_type?: string;
  condition?: string;
  university?: string;
  price?: number | null;
  quantity?: number | null;
  listing_mode?: string;
  original_price?: number | null;
  discount_percent?: number | null;
  deal_label?: string | null;
  deal_expires_at?: string | null;
  is_wholesale?: boolean | null;
  can_sell_individually?: boolean | null;
  pack_size?: number | null;
  bulk_units?: string | null;
  single_item_price?: number | null;
  spec_values?: Record<string, unknown>;
  notes?: string[];
  suggested_tags?: string[];
};

export type PriceSuggestionResult = {
  min_price: number;
  max_price: number;
  recommended_price: number;
  deal_rating: "bargain" | "fair" | "premium";
  confidence_score: number;
  market_insight: string;
  pricing_tips: string[];
  evidence_source?: "marketplace_comparables" | "ai_only" | "insufficient_data";
  comparable_count?: number;
};

export type ContentModerationResult = {
  is_safe: boolean;
  risk_level: "low" | "medium" | "high";
  flags: string[];
  explanation: string;
};

const LISTING_DRAFT_INSTRUCTION = [
  "You are BuyMesho Listing Studio for a marketplace in Malawi.",
  "Enhance the seller's existing draft into a clear, accurate listing.",
  "Preserve every user-provided fact unless it is clearly contradictory or unsafe.",
  "Never invent a price, quantity, category, condition, university, specification, or product fact.",
  "Only return fields that can be supported by the supplied draft; omit unknown fields rather than guessing.",
  "Prices are in Malawian Kwacha (MWK).",
  "Return JSON only with: name, description, category, subcategory, item_type, condition, university, price, quantity, listing_mode, original_price, discount_percent, deal_label, deal_expires_at, is_wholesale, can_sell_individually, pack_size, bulk_units, single_item_price, spec_values, notes, suggested_tags.",
].join(" ");

const PRICING_INSTRUCTION = [
  "You are BuyMesho Pricing Assistant.",
  "Provide a pricing suggestion for a BuyMesho listing in Malawi using supplied product information and supplied BuyMesho comparable listings when present.",
  "This is AI decision support, not an authoritative market valuation.",
  "Do not claim to have current market, transaction, or comparable-listing data unless it is explicitly supplied in the request.",
  "Treat marketplace comparable evidence as strong only when at least 3 relevant BuyMesho listings are supplied.",
  "When fewer than 3 relevant comparables are supplied, treat the marketplace evidence as insufficient and do not present it as a reliable market benchmark.",
  "If comparable_count is 0 and the product information is insufficient to make a defensible estimate, return confidence_score 0 and explain the missing information in market_insight instead of inventing a price.",
  "When at least 3 comparable listings are supplied, ground the price range in those BuyMesho listing prices and explain that evidence in market_insight.",
  "Return JSON with min_price, max_price, recommended_price, deal_rating (bargain|fair|premium), confidence_score (0-100), market_insight, pricing_tips, evidence_source, comparable_count.",
  "All prices must be MWK and numeric.",
].join(" ");

const MODERATION_INSTRUCTION = [
  "You are BuyMesho Trust & Safety Moderator.",
  "Analyze the supplied listing or message for safety and marketplace policy risks.",
  "Flag prohibited or suspicious activity including weapons, drugs, counterfeit goods, payment phishing, academic fraud, scams, harassment, and attempts to move transactions off-platform when relevant.",
  "Do not assume content is safe when analysis fails; failures must be surfaced to the caller.",
  "Return JSON with is_safe, risk_level (low|medium|high), flags (array of strings), and explanation.",
].join(" ");

export async function generateListingDraft(currentDraft: Record<string, unknown>): Promise<ListingDraftSuggestion> {
  return generateGeminiJson<ListingDraftSuggestion>({
    systemInstruction: LISTING_DRAFT_INSTRUCTION,
    payload: { currentDraft },
  });
}

const GENERIC_COMPARABLE_TERMS = new Set([
  "new", "used", "original", "genuine", "brand", "model", "size", "pack", "piece", "pieces", "item", "items",
]);

function extractComparableTerms(name: string): string[] {
  return [...new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 3 && !GENERIC_COMPARABLE_TERMS.has(term) && !/^\d+$/.test(term))
      .slice(0, 6),
  )];
}

function normalizeComparableName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function loadPricingComparables(db: any, input: { name: string; category: string; condition?: string }): Array<{ id: string; name: string; category?: string; condition?: string; price: number }> {
  if (!db) return [];
  const terms = extractComparableTerms(input.name);
  if (terms.length === 0) return [];

  const params: unknown[] = [input.category];
  let where = "WHERE is_hidden = 0 AND deleted_at IS NULL AND status != 'sold' AND category = ?";

  if (input.condition) {
    where += " AND condition = ?";
    params.push(input.condition);
  }

  where += ` AND (${terms.map(() => "LOWER(name) LIKE ?").join(" OR ")})`;
  params.push(...terms.map((term) => `%${term}%`));

  const rows = db.prepare(`
    SELECT id, name, category, condition, price
    FROM listings
    ${where}
    ORDER BY created_at DESC
    LIMIT 40
  `).all(...params) as Array<Record<string, unknown>>;

  const normalizedInputName = normalizeComparableName(input.name);
  const minimumOverlap = terms.length > 1 ? 2 / 3 : 1;
  const scored = rows
    .map((row) => {
      const name = String(row.name ?? "").slice(0, 160);
      const normalizedName = normalizeComparableName(name);
      const matchedTerms = terms.filter((term) => normalizedName.includes(term));
      const overlap = matchedTerms.length / terms.length;
      const exactName = normalizedName === normalizedInputName;

      return {
        id: String(row.id),
        name,
        category: typeof row.category === "string" ? row.category.slice(0, 100) : undefined,
        condition: typeof row.condition === "string" ? row.condition.slice(0, 100) : undefined,
        price: Number(row.price),
        relevance: (exactName ? 10 : 0) + overlap,
        overlap,
      };
    })
    .filter((row) => Number.isFinite(row.price) && row.price > 0 && row.overlap >= minimumOverlap)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 8);

  return scored.map(({ relevance: _relevance, overlap: _overlap, ...row }) => row);
}

export async function suggestPricing(input: {
  name: string;
  category: string;
  condition?: string;
  specs?: Record<string, unknown>;
  currentPrice?: number;
  db?: any;
}): Promise<PriceSuggestionResult> {
  const comparable_listings = loadPricingComparables(input.db, input);
  const result = await generateGeminiJson<PriceSuggestionResult>({
    systemInstruction: PRICING_INSTRUCTION,
    payload: {
      ...input,
      db: undefined,
      comparable_count: comparable_listings.length,
      comparable_evidence_quality: comparable_listings.length >= 3 ? "strong" : "insufficient",
      comparable_listings,
    },
  });

  const evidenceSource = comparable_listings.length >= 3
    ? "marketplace_comparables"
    : comparable_listings.length > 0
      ? "insufficient_data"
      : result.confidence_score > 0
        ? "ai_only"
        : "insufficient_data";

  return {
    ...result,
    evidence_source: evidenceSource,
    comparable_count: comparable_listings.length,
  };
}

export async function moderateContent(input: {
  text: string;
  type: "listing" | "message";
}): Promise<ContentModerationResult> {
  return generateGeminiJson<ContentModerationResult>({
    systemInstruction: MODERATION_INSTRUCTION,
    payload: input,
  });
}
