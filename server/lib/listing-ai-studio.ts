import { GoogleGenAI } from "@google/genai";

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

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
};

export type ContentModerationResult = {
  is_safe: boolean;
  risk_level: "low" | "medium" | "high";
  flags: string[];
  explanation: string;
};

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("AI service is unavailable: GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function parseJsonResponse<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("AI service returned an invalid structured response");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

async function generateJson(systemInstruction: string, payload: unknown): Promise<string> {
  const response = await getGeminiClient().models.generateContent({
    model: getModel(),
    config: {
      systemInstruction,
      responseMimeType: "application/json",
    },
    contents: [
      {
        role: "user",
        parts: [{ text: JSON.stringify(payload) }],
      },
    ],
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("AI service returned an empty response");
  }
  return text;
}

export async function generateListingDraft(currentDraft: Record<string, unknown>): Promise<ListingDraftSuggestion> {
  const text = await generateJson(
    [
      "You are BuyMesho AI Listing Studio for a marketplace in Malawi.",
      "Enhance the seller's existing draft into a clear, accurate, attractive listing.",
      "Preserve every user-provided fact unless it is clearly contradictory or unsafe.",
      "Never invent a price, quantity, category, condition, university, specification, or product fact.",
      "Only return fields that can be supported by the supplied draft; omit unknown fields rather than guessing.",
      "Prices are in Malawian Kwacha (MWK).",
      "Return JSON only with: name, description, category, subcategory, item_type, condition, university, price, quantity, listing_mode, original_price, discount_percent, deal_label, deal_expires_at, is_wholesale, can_sell_individually, pack_size, bulk_units, single_item_price, spec_values, notes, suggested_tags.",
    ].join(" "),
    { currentDraft },
  );

  return parseJsonResponse<ListingDraftSuggestion>(text);
}

export async function suggestPricing(input: {
  name: string;
  category: string;
  condition?: string;
  specs?: Record<string, unknown>;
  currentPrice?: number;
}): Promise<PriceSuggestionResult> {
  const text = await generateJson(
    [
      "You are BuyMesho AI Pricing Assistant.",
      "Provide a pricing suggestion for a BuyMesho listing in Malawi using only the supplied product information.",
      "This is an AI suggestion, not an authoritative market valuation.",
      "Do not claim to have current market, transaction, or comparable-listing data unless it is explicitly supplied in the request.",
      "If the supplied information is insufficient to make a defensible estimate, return a structured response with confidence_score 0 and explain the missing information in market_insight instead of inventing a price.",
      "Return JSON with min_price, max_price, recommended_price, deal_rating (bargain|fair|premium), confidence_score (0-100), market_insight, pricing_tips.",
      "All prices must be MWK and numeric.",
    ].join(" "),
    input,
  );

  return parseJsonResponse<PriceSuggestionResult>(text);
}

export async function moderateContent(input: {
  text: string;
  type: "listing" | "message";
}): Promise<ContentModerationResult> {
  const text = await generateJson(
    [
      "You are BuyMesho AI Trust & Safety Moderator.",
      "Analyze the supplied listing or message for safety and marketplace policy risks.",
      "Flag prohibited or suspicious activity including weapons, drugs, counterfeit goods, payment phishing, academic fraud, scams, harassment, and attempts to move transactions off-platform when relevant.",
      "Do not assume content is safe when analysis fails; failures must be surfaced to the caller.",
      "Return JSON with is_safe, risk_level (low|medium|high), flags (array of strings), and explanation.",
    ].join(" "),
    input,
  );

  return parseJsonResponse<ContentModerationResult>(text);
}
