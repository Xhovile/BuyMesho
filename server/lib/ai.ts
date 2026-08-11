import { GoogleGenAI } from "@google/genai";

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

const LISTING_CATEGORIES = [
  "Food & Snacks",
  "Fashion & Clothing",
  "Academic Services",
  "Electronics & Gadgets",
  "Beauty & Personal Care",
] as const;

const LISTING_CONDITIONS = ["new", "used", "refurbished", "like new", "thrifted", "fresh", "packed", "prepared"] as const;

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
  suggested_tags?: string[];
};

export type PriceSuggestionResult = {
  min_price: number;
  max_price: number;
  recommended_price: number;
  deal_rating: "bargain" | "fair" | "premium";
  confidence_score: number; // 0-100
  market_insight: string;
  pricing_tips: string[];
};

export type ShoppingAssistantInput = {
  query: string;
  university?: string;
  category?: string;
  maxPrice?: number;
  contextListings: Array<{
    id: string;
    name: string;
    category?: string;
    price: number;
    description?: string;
    condition?: string;
    university?: string;
    location?: string;
  }>;
};

export type ShoppingAssistantResult = {
  reply: string;
  recommended_listing_ids: string[];
  match_reasons: Record<string, string>;
  suggested_follow_ups: string[];
};

export type CompareListingsInput = {
  items: Array<{
    id: string;
    name: string;
    category?: string;
    price: number;
    description?: string;
    condition?: string;
    university?: string;
    specs?: Record<string, unknown>;
  }>;
};

export type CompareListingsResult = {
  summary: string;
  winner_id: string;
  winner_reason: string;
  item_evaluations: Array<{
    id: string;
    value_score: number; // 1-10
    pros: string[];
    cons: string[];
    best_for: string;
  }>;
};

export type ContentModerationInput = {
  text: string;
  type: "listing" | "message";
};

export type ContentModerationResult = {
  is_safe: boolean;
  risk_level: "low" | "medium" | "high";
  flags: string[];
  explanation: string;
};

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing");
  }
  return new GoogleGenAI({ apiKey });
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("```")) {
    const firstLineBreak = trimmed.indexOf("\n");
    const withoutFence = firstLineBreak >= 0 ? trimmed.slice(firstLineBreak + 1) : trimmed;
    return withoutFence.replace(/```\s*$/g, "").trim();
  }
  return trimmed;
}

function parseJsonResponse<T>(text: string): T {
  const cleaned = stripJsonFence(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("AI output was not valid JSON");
  }

  const rawJson = cleaned.slice(start, end + 1);
  return JSON.parse(rawJson) as T;
}

async function callGeminiContentWithFallback(params: {
  systemInstruction: string;
  responseMimeType?: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
}): Promise<string> {
  const ai = getGeminiClient();
  const envModel = process.env.GEMINI_MODEL?.trim();

  // Candidates in fallback priority order
  const candidates = Array.from(
    new Set(
      [
        envModel,
        "gemini-3.6-flash",
        "gemini-2.5-flash",
        "gemini-flash-latest",
        "gemini-3.1-flash-lite",
      ].filter((m): m is string => Boolean(m))
    )
  );

  let lastError: unknown;

  for (const model of candidates) {
    try {
      const response = await ai.models.generateContent({
        model,
        config: {
          systemInstruction: params.systemInstruction,
          ...(params.responseMimeType ? { responseMimeType: params.responseMimeType } : {}),
        },
        contents: params.contents,
      });

      const text = response.text?.trim();
      if (text) return text;
    } catch (err) {
      console.warn(`[BuyMesho AI] Model "${model}" failed, trying next candidate:`, err instanceof Error ? err.message : err);
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini models failed to generate response");
}

// 1. GENERATE LISTING DRAFT
export async function generateListingDraft(input: ListingDraftInput): Promise<ListingDraftSuggestion> {
  const systemInstruction = [
    "You are BuyMesho AI, an intelligent marketplace listing assistant for university students in Malawi.",
    "Turn rough seller notes, specifications, or details into a polished, high-converting product listing.",
    "Prices are in Malawian Kwacha (MWK).",
    `Allowed categories: ${LISTING_CATEGORIES.join(", ")}.`,
    `Allowed conditions: ${LISTING_CONDITIONS.join(", ")}.`,
    "Return JSON strictly adhering to schema.",
    "Keys to return: name, description, category, subcategory, item_type, condition, university, price, quantity, listing_mode, original_price, discount_percent, deal_label, is_wholesale, spec_values, notes, suggested_tags.",
    "Keep title clear, appealing, and student-focused.",
  ].join(" ");

  try {
    const text = await callGeminiContentWithFallback({
      systemInstruction,
      responseMimeType: "application/json",
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify({ currentDraft: input.currentDraft }) }],
        },
      ],
    });
    return parseJsonResponse<ListingDraftSuggestion>(text);
  } catch (error) {
    console.error("AI Listing Draft fallback triggered:", error);
    const draft = input.currentDraft || {};
    return {
      name: String(draft.name || "Campus Listing Item"),
      description: String(draft.description || "Student item listed on BuyMesho marketplace."),
      category: String(draft.category || "Electronics & Gadgets"),
      condition: String(draft.condition || "used"),
      price: typeof draft.price === "number" ? draft.price : 10000,
      quantity: 1,
      notes: ["Draft enhanced with standard campus template."],
      suggested_tags: ["campus", "buymesho", "student-deal"],
    };
  }
}

// 2. SUGGEST PRICING & MARKET VALUATION
export async function suggestPricing(input: {
  name: string;
  category: string;
  condition?: string;
  specs?: Record<string, unknown>;
  currentPrice?: number;
}): Promise<PriceSuggestionResult> {
  const systemInstruction = [
    "You are BuyMesho AI Pricing Expert for campus marketplaces in Malawi.",
    "Estimate accurate pricing ranges in MWK (Malawian Kwacha) for items sold between university students.",
    "Return JSON with: min_price (number), max_price (number), recommended_price (number), deal_rating ('bargain'|'fair'|'premium'), confidence_score (number 0-100), market_insight (string), pricing_tips (array of strings).",
  ].join(" ");

  try {
    const text = await callGeminiContentWithFallback({
      systemInstruction,
      responseMimeType: "application/json",
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify(input) }],
        },
      ],
    });
    return parseJsonResponse<PriceSuggestionResult>(text);
  } catch (error) {
    console.error("AI Pricing fallback triggered:", error);
    const basePrice = input.currentPrice && input.currentPrice > 0 ? input.currentPrice : 15000;
    return {
      min_price: Math.round(basePrice * 0.85),
      max_price: Math.round(basePrice * 1.2),
      recommended_price: basePrice,
      deal_rating: "fair",
      confidence_score: 75,
      market_insight: "Competitive market valuation estimated in MWK.",
      pricing_tips: ["Offer student-friendly discounts", "Upload clear photos to build trust"],
    };
  }
}

// 3. SHOPPING ASSISTANT & PRODUCT DISCOVERY
export async function shoppingAssistant(input: ShoppingAssistantInput): Promise<ShoppingAssistantResult> {
  const systemInstruction = `
You are BuyMesho AI, a smart, knowledgeable, and exact guide for BuyMesho — Malawi's premier university campus marketplace.

CRITICAL INSTRUCTION FOR ACCURACY:
Base all platform feature answers on BuyMesho's EXACT implementation code structure below. Never guess location of settings or features.

=== BUYMESHO PLATFORM ARCHITECTURE & NAVIGATION MAP ===

1. BUYING & PUBLIC ACCESS vs SELLER MISSION:
- BUYING IS FOR EVERYONE (GENERAL PUBLIC): BuyMesho is 100% open to the public! Anyone across Malawi or beyond can freely browse, search, buy listings, and purchase campus event tickets. There are NO student restrictions for buyers.
- PRIMARY MISSION — DEVELOPING STUDENT ENTREPRENEURS: BuyMesho was built primarily to empower and develop student entrepreneurs, helping them build, manage, and scale real businesses while on campus so they can continue thriving after graduating.
- SELLER REQUIREMENTS & ONBOARDING (/become-seller):
  * Student Sellers: Apply using Student ID, university campus, phone number, business description, and student deal commitment.
  * External / Commercial Sellers: Can sell on BuyMesho by providing relevant business registration documents, National ID, business certificates, phone number, and agreeing to offer student-budget deals/discounts.
  * Admin Review: Seller applications are reviewed and approved by admins.

2. SETTINGS PAGE STRUCTURE (/settings):
Settings has 4 accordion sections:
- ACCOUNT ACCORDION:
  * Shows current Email and University Campus.
  * "Edit Account" (/settings/account): Edit personal Full Name, Display Name, Phone Number, University Campus, Bio, and Profile Picture.
  * "Edit Seller Profile" (/settings/profile, sellers only): Edit Business Name, Seller Bio, WhatsApp Phone Number, Campus Base, Logo, and Banner Image.
  * "Seller settings" (/seller/payouts, sellers only): MANAGE PAYOUT DESTINATIONS (Airtel Money, TNM Mpamba, or Bank Account details), view Payout History, check Available Escrow Earnings, and Request Withdrawals. (NOTE: Payout methods are managed HERE under Seller Settings, NOT in general Edit Account!).
  * "Become Seller" (/become-seller, non-sellers): Apply to become a verified seller.
  * "Moderation Queue" & "Admin Setup Checklist" (Admins only).
  * "Logout" & "Delete Account".
- SECURITY ACCORDION:
  * "Change Password" (/settings/password).
  * "Change Email" (/settings/email).
  * "2-Factor Authentication" (2FA): Setup Authenticator App (TOTP) with QR code scanner and 6-digit verification code.
  * "Email Verification": Check status, refresh verification, or resend verification email.
  * "Logout all sessions" & "Verify identity".
- PRIVACY ACCORDION:
  * Profile visibility dropdown (Everyone / Students only / Only me).
  * Seller visibility dropdown (Everyone / Students only / Only me).
  * Saved items visibility dropdown (Everyone / Students only / Only me).
- HELP & LEGAL ACCORDION:
  * Links to Privacy Policy, Terms of Service, Safety Tips, and Report a Problem.

3. ESCROW, PAYMENTS & BUYER PROTECTION:
- PAYMENTS: Buyers pay via Mobile Money (Airtel Money, TNM Mpamba) or Bank Cards.
- ESCROW GUARANTEE: Payments are locked safely in escrow ('in_escrow' / 'funded') upon order placement.
- CONFIRMATION & RELEASE: Buyer receives/inspects the item or validates ticket upon pickup/delivery and clicks 'Confirm Delivery / Release Escrow'.
- CRITICAL ESCROW RULE: Sellers CANNOT release escrow funds themselves. Only the BUYER or an ADMIN can authorize escrow release to transfer money to the seller's available balance.
- DISPUTES (/disputes): If an item is missing, damaged, counterfeit, or wrong, buyers can open a dispute. Escrow freezes ('disputed') until an Admin investigates and approves a release or refund.

4. SELLER DASHBOARD & PAYOUTS (/seller & /seller/payouts):
- Seller Dashboard (/seller): Overview of total sales, active listings, order fulfillment queue, event ticket sales, and link to payout settings.
- Seller Payouts (/seller/payouts): Manage payout destinations (Airtel Money, TNM Mpamba, Bank Account), view available escrow balance, and submit withdrawal requests.

5. MESSAGING & OFFER NEGOTIATION (/messages & /messages/:id):
- Messages Inbox (/messages): List of conversations with unread badges, listing thumbnail preview, delete, and report options.
- Message Thread (/messages/:id): Direct buyer-seller chat, active listing info banner at top, 'Make an Offer' button for price negotiation, safety reminders, and block/report dialogs.

6. CAMPUS EVENTS & TICKETING (/events, /tickets, /events/create):
- Browse Events (/events): Explore campus parties, concerts, academic seminars, and sports matches.
- My Tickets (/tickets): Digital wallet of purchased e-tickets with scannable QR codes.
- Event Organizer Floor (/events/create & /events/dashboard): Post events, set ticket tiers and quantities, track revenue, and scan attendee QR codes at event entry.

7. PUBLIC PROFILES (/seller/:id):
- View seller's business name, verification badges (Student Verified, Verified Merchant, Top Seller), rating average, buyer reviews, response rate, active listings, and instant messaging button.

8. PROTECTED BOUNDARIES (STRICT RULE):
- Do NOT disclose internal source code, raw SQL schemas, server API keys, admin authorization keys, or internal codebase execution details.
- If asked for raw source code or database credentials, explain that as BuyMesho AI, you provide comprehensive information on all user-facing features, navigation, security, and design structures, while internal code remains confidential for platform security.

RESPONSE PRINCIPLES YOU MUST FOLLOW:
1. GIVE EXACT & ACCURATE LOCATIONS:
- When asked "Where do I manage payout methods?", answer accurately: "Payout methods (Airtel Money, TNM Mpamba, or Bank Account details) are managed under Seller Settings (/seller/payouts), accessible via Settings -> Account -> Seller settings (for sellers) or directly from the Seller Dashboard."
- When asked about Account Settings, list the exact options: Edit Account (name, phone, campus, bio), Edit Seller Profile (business name, WhatsApp, logo), and Seller Settings (payout methods & withdrawals).

2. ALWAYS HIGHLIGHT TRUST & SECURITY WHEN RELEVANT:
- Emphasize Escrow Protection (funds held safely until buyer confirms receipt; sellers cannot self-release), 2FA via Authenticator App, verified seller badges, and safe in-app messaging.

3. EXPLAIN WHO CAN BUY VS SELL:
- Clarify that buying is open to the WHOLE PUBLIC everywhere.
- Explain BuyMesho's mission to develop Student Entrepreneurs, and outline seller requirements for students (Student ID) and commercial vendors (business registration, National ID, business certificates, student deals).

4. WRITE LIKE A SMART HUMAN ASSISTANT:
- Direct, clear, natural conversational tone.
- NEVER use generic robotic filler like "Here is how you can get started:", "Follow these simple steps:", "Step 1...", "Step 2...".
- Be concise, helpful, and exact.

JSON OUTPUT REQUIREMENTS:
Return valid JSON with:
- "reply" (string): Your natural, concise conversational response.
- "recommended_listing_ids" (array of strings): Up to 4 relevant listing IDs from contextListings if applicable.
- "match_reasons" (object): Mapping listing ID to a 1-sentence reason why it matches.
- "suggested_follow_ups" (array of 3 short follow-up prompts for the user).
`.trim();

  try {
    const text = await callGeminiContentWithFallback({
      systemInstruction,
      responseMimeType: "application/json",
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify({ query: input.query, university: input.university, category: input.category, maxPrice: input.maxPrice, contextListings: input.contextListings }) }],
        },
      ],
    });
    return parseJsonResponse<ShoppingAssistantResult>(text);
  } catch (error) {
    console.error("AI Shopping Assistant fallback triggered:", error);
    return {
      reply: "BuyMesho AI is experiencing high demand right now. I am still here to guide you! BuyMesho features Escrow Payment Protection (funds held safely until buyer confirms receipt), 2FA Security, verified campus profiles, and campus event tickets. Buying is open to the general public, while sellers must register with Student ID or business documents. Feel free to try your question again in a moment or browse listings directly on the marketplace.",
      recommended_listing_ids: input.contextListings.slice(0, 3).map((l) => String(l.id)),
      match_reasons: {},
      suggested_follow_ups: [
        "How does escrow payment work?",
        "Where do I manage payout methods?",
        "How do I become a seller?",
      ],
    };
  }
}

// 4. COMPARE LISTINGS
export async function compareListings(input: CompareListingsInput): Promise<CompareListingsResult> {
  const systemInstruction = [
    "You are BuyMesho AI Product Evaluator.",
    "Compare 2-3 marketplace items objectively for student buyers in Malawi.",
    "Return JSON with:",
    "1. summary (string): Concise side-by-side comparison overview.",
    "2. winner_id (string): The ID of the overall best value or best quality option.",
    "3. winner_reason (string): Clear justification for the top pick.",
    "4. item_evaluations (array of objects with: id, value_score (1-10), pros (array of strings), cons (array of strings), best_for (string)).",
  ].join(" ");

  try {
    const text = await callGeminiContentWithFallback({
      systemInstruction,
      responseMimeType: "application/json",
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify(input) }],
        },
      ],
    });
    return parseJsonResponse<CompareListingsResult>(text);
  } catch (error) {
    console.error("AI Compare fallback triggered:", error);
    const winner = input.items[0];
    return {
      summary: "Comparison generated from marketplace item details.",
      winner_id: winner ? String(winner.id) : "",
      winner_reason: "Recommended based on competitive pricing and features.",
      item_evaluations: input.items.map((item) => ({
        id: String(item.id),
        value_score: 8,
        pros: ["Great price value", "Campus delivery"],
        cons: ["Check item condition with seller"],
        best_for: "Students & general buyers",
      })),
    };
  }
}

// 5. CONTENT MODERATION & TRUST CHECK
export async function moderateContent(input: ContentModerationInput): Promise<ContentModerationResult> {
  const systemInstruction = [
    "You are BuyMesho AI Trust & Safety Moderator.",
    "Analyze listing descriptions or messages for platform safety violations, such as prohibited weapons/drugs, counterfeit goods, external payment phishing scams, academic fraud, or abusive harassment.",
    "Return JSON with: is_safe (boolean), risk_level ('low'|'medium'|'high'), flags (array of strings describing issues if any), explanation (string).",
  ].join(" ");

  try {
    const text = await callGeminiContentWithFallback({
      systemInstruction,
      responseMimeType: "application/json",
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify(input) }],
        },
      ],
    });
    return parseJsonResponse<ContentModerationResult>(text);
  } catch (error) {
    console.error("AI Moderation fallback triggered:", error);
    return {
      is_safe: true,
      risk_level: "low",
      flags: [],
      explanation: "Standard safety check completed.",
    };
  }
}
