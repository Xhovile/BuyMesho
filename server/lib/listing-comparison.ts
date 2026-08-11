import { generateGeminiJson } from "./gemini.js";

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
- Return valid JSON only.`;

export async function compareBuyMeshoListings(items: ListingComparisonItem[]): Promise<ListingComparisonResult> {
  if (items.length < 2 || items.length > 3) {
    throw new Error("Between 2 and 3 listings are required for comparison");
  }

  const ids = items.map((item) => String(item.id));
  if (new Set(ids).size !== ids.length) {
    throw new Error("Listing IDs must be unique");
  }

  const safeItems = sanitizeItems(items);
  const result = await generateGeminiJson<ListingComparisonResult>({
    systemInstruction: SYSTEM_INSTRUCTION,
    payload: { items: safeItems },
  });

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
      pros: Array.isArray(evaluation.pros)
        ? evaluation.pros.filter((value) => typeof value === "string").slice(0, 6)
        : [],
      cons: Array.isArray(evaluation.cons)
        ? evaluation.cons.filter((value) => typeof value === "string").slice(0, 6)
        : [],
      best_for:
        typeof evaluation.best_for === "string"
          ? evaluation.best_for
          : "Based on the supplied listing information",
    };
  });

  if (new Set(evaluations.map((evaluation) => evaluation.id)).size !== items.length) {
    throw new Error("Comparison returned duplicate or missing item evaluations");
  }

  return {
    summary:
      typeof result.summary === "string" && result.summary.trim()
        ? result.summary.trim()
        : "Comparison completed from the supplied listing information.",
    winner_id: String(result.winner_id),
    winner_reason:
      typeof result.winner_reason === "string" && result.winner_reason.trim()
        ? result.winner_reason.trim()
        : "Selected from the supplied listing information.",
    item_evaluations: evaluations,
  };
}
