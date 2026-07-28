import { GoogleGenAI } from "@google/genai";

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

const LISTING_CATEGORIES = [
  "Food & Snacks",
  "Fashion & Clothing",
  "Academic Services",
  "Electronics & Gadgets",
  "Beauty & Personal Care",
] as const;

const LISTING_CONDITIONS = ["new", "used", "refurbished"] as const;

export type ListingDraftInput = {
  currentDraft: Record<string, unknown>;
};

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
  sold_quantity?: number | null;
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
};

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  return new GoogleGenAI({ apiKey });
}

function stripJsonFence(text: string) {
  const trimmed = text.trim();

  if (!trimmed) return trimmed;

  if (trimmed.startsWith("```")) {
    const firstLineBreak = trimmed.indexOf("\n");
    const withoutFence = firstLineBreak >= 0 ? trimmed.slice(firstLineBreak + 1) : trimmed;
    return withoutFence.replace(/```\s*$/g, "").trim();
  }

  return trimmed;
}

function parseDraftResponse(text: string): ListingDraftSuggestion {
  const cleaned = stripJsonFence(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("AI did not return JSON");
  }

  const rawJson = cleaned.slice(start, end + 1);
  const parsed = JSON.parse(rawJson) as ListingDraftSuggestion;

  return {
    ...parsed,
    notes: Array.isArray(parsed.notes) ? parsed.notes.filter((item): item is string => typeof item === "string") : undefined,
  };
}

function buildSystemInstruction() {
  return [
    "You are BuyMesho AI, a marketplace assistant for university students in Malawi.",
    "Rewrite rough seller notes into a clean listing draft.",
    "Return JSON only. Do not use markdown, bullet points, or commentary.",
    `Allowed categories: ${LISTING_CATEGORIES.join(", ")}`,
    `Allowed conditions: ${LISTING_CONDITIONS.join(", ")}`,
    "Use null when a value is unknown.",
    "Prefer short, practical titles.",
    "If the listing is a deal or wholesale listing, preserve or suggest the related pricing fields only when they are clearly supported by the input.",
    "If you are not confident about a category, subcategory, item type, or spec_values, leave it blank or empty rather than inventing details.",
    "Return a single JSON object with keys: name, description, category, subcategory, item_type, condition, university, price, quantity, sold_quantity, listing_mode, original_price, discount_percent, deal_label, deal_expires_at, is_wholesale, can_sell_individually, pack_size, bulk_units, single_item_price, spec_values, notes.",
  ].join(" ");
}

export async function generateListingDraft(input: ListingDraftInput): Promise<ListingDraftSuggestion> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: DEFAULT_GEMINI_MODEL,
    config: {
      systemInstruction: buildSystemInstruction(),
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: JSON.stringify({
              currentDraft: input.currentDraft,
              task: "Turn this into a clean marketplace listing draft.",
            }),
          },
        ],
      },
    ],
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("AI returned no response");
  }

  return parseDraftResponse(text);
}
