import { GoogleGenAI } from "@google/genai";

export type ListingComparisonItem = {
  id: string;
  name: string;
  category?: string;
  price: number;
  description?: string;
  condition?: string;
  university?: string;
  specs?: Record<string, unknown>;
};

export type ListingComparisonResult = {
  summary: string;
  winner_id: string;
  winner_reason: string;
  item_evaluations: Array<{
    id: string;
    value_score: number;
    pros: string[];
    cons: string[];
    best_for: string;
  }>;
};

function getClient() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY environment variable is missing");
  return new GoogleGenAI({ apiKey: key });
}

function getModelCandidates() {
  return Array.from(
    new Set(
      [
        process.env.GEMINI_MODEL?.trim(),
        "gemini-3.6-flash",
        "gemini-2.5-flash",
        "gemini-flash-latest",
        "gemini-3.1-flash-lite",
      ].filter((value): value is string => Boolean(value)),
    ),
  );
}

function parseJson<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Comparison returned invalid JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

function sanitizeItems(items: ListingComparisonItem[]) {
  return items.map((item) => ({
    id: String(item.id),
    name: String(item.name).slice(0, 200),
    category: item.category?.slice(0, 100),
    price: Number(item.price),
    description: item.description?.slice(0, 1200),
    condition: item.condition?.slice(0, 100),
    university: item.university?.slice(0, 150),
    specs: item.specs,
  }));
}

const SYSTEM_INSTRUCTION = `You are BuyMesho's product comparison engine.

Compare ONLY the marketplace listings supplied in the request. Do not use outside market data, remembered products, assumed specifications, assumed delivery options, invented seller information, or generic marketplace features as evidence.

Your comparison is decision support, not an authoritative valuation or factual product certification.

RULES:
- Every factual statement about an item must be supported by fields in the supplied listing data.
- Do not invent missing specifications, warranties, stock, delivery, location, ratings, seller reputation, authenticity, or availability.
- Price is the supplied listing price only. Do not estimate a missing price.
- Condition is unknown when it is not supplied. Do not replace missing condition with a default such as "used", "new", or "standard".
- Compare the actual trade-offs visible in the supplied information.
- Value score must be a relative decision-support score based only on the supplied information, not a market valuation.
- Pros and cons must be grounded in supplied facts. Use uncertainty language when a conclusion depends on missing information.
- Select winner_id from the supplied item IDs only. Choose the strongest overall option for a general buyer based on the available evidence. If the evidence is weak, say so clearly in winner_reason.
- Return one evaluation for every supplied item.
- Return valid JSON only.

JSON shape:
{
  "summary": "concise comparison overview",
  "winner_id": "one supplied item id",
  "winner_reason": "why this option is the strongest choice based only on supplied facts",
  "item_evaluations": [
    {
      "id": "supplied item id",
      "value_score": 1,
      "pros": ["fact-grounded point"],
      "cons": ["fact-grounded point or clearly stated limitation"],
      "best_for": "buyer profile supported by the supplied information"
    }
  ]
}`;

export async function compareBuyMeshoListings(items: ListingComparisonItem[]): Promise<ListingComparisonResult> {
  if (items.length < 2 || items.length > 3) {
    throw new Error("Between 2 and 3 listings are required for comparison");
  }

  const ids = items.map((item) => String(item.id));
  if (new Set(ids).size !== ids.length) {
    throw new Error("Listing IDs must be unique");
  }

  const safeItems = sanitizeItems(items);
  let lastError: unknown;

  for (const model of getModelCandidates()) {
    try {
      const response = await getClient().models.generateContent({
        model,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
        },
        contents: [{ role: "user", parts: [{ text: JSON.stringify({ items: safeItems }) }] }],
      });

      const text = response.text?.trim();
      if (!text) throw new Error("Comparison returned an empty response");

      const result = parseJson<ListingComparisonResult>(text);
      const allowedIds = new Set(ids);

      if (!allowedIds.has(String(result.winner_id))) {
        throw new Error("Comparison returned an invalid winner_id");
      }

      if (!Array.isArray(result.item_evaluations) || result.item_evaluations.length !== items.length) {
        throw new Error("Comparison returned an incomplete item evaluation set");
      }

      const evaluations = result.item_evaluations.map((evaluation) => {
        const id = String(evaluation.id);
        if (!allowedIds.has(id)) throw new Error("Comparison returned an invalid item ID");
        const score = Number(evaluation.value_score);
        if (!Number.isFinite(score) || score < 1 || score > 10) {
          throw new Error("Comparison returned an invalid value score");
        }
        return {
          id,
          value_score: score,
          pros: Array.isArray(evaluation.pros) ? evaluation.pros.filter((value) => typeof value === "string").slice(0, 6) : [],
          cons: Array.isArray(evaluation.cons) ? evaluation.cons.filter((value) => typeof value === "string").slice(0, 6) : [],
          best_for: typeof evaluation.best_for === "string" ? evaluation.best_for : "Based on the supplied listing information",
        };
      });

      if (new Set(evaluations.map((evaluation) => evaluation.id)).size !== items.length) {
        throw new Error("Comparison returned duplicate or missing item evaluations");
      }

      return {
        summary: typeof result.summary === "string" && result.summary.trim() ? result.summary.trim() : "Comparison completed from the supplied listing information.",
        winner_id: String(result.winner_id),
        winner_reason: typeof result.winner_reason === "string" && result.winner_reason.trim() ? result.winner_reason.trim() : "Selected from the supplied listing information.",
        item_evaluations: evaluations,
      };
    } catch (error) {
      lastError = error;
      console.warn(`[BuyMesho Comparison] Model "${model}" failed`, error instanceof Error ? error.message : error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("BuyMesho listing comparison is currently unavailable");
}
