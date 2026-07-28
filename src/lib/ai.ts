import { apiFetch } from "./api";
import type { ListingDraft } from "../types";

export type ListingAiDraft = Partial<ListingDraft> & {
  notes?: string[];
};

export async function generateListingDraft(currentDraft: Partial<ListingDraft>): Promise<ListingAiDraft> {
  const response = await apiFetch("/api/ai/listing-draft", {
    method: "POST",
    body: JSON.stringify({ currentDraft }),
  });

  return (response?.draft ?? {}) as ListingAiDraft;
}
