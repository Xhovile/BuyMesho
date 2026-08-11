import type { Express, RequestHandler } from "express";
import {
  shoppingAssistant,
  compareListings,
  generateListingDraft as generateLegacyListingDraft,
  suggestPricing as suggestLegacyPricing,
  moderateContent as moderateLegacyContent,
} from "../lib/ai.js";
import {
  generateListingDraft,
  suggestPricing,
  moderateContent,
} from "../lib/listing-ai-studio.js";

export function registerAiRoutes(app: Express, requireFirebaseUser: RequestHandler) {
  // Listing AI Studio: authenticated seller tooling. Failures are explicit so the UI can preserve the user's draft.
  app.post("/api/ai/listing-draft", requireFirebaseUser, async (req, res) => {
    try {
      const currentDraft = req.body?.currentDraft;
      if (!currentDraft || typeof currentDraft !== "object" || Array.isArray(currentDraft)) {
        return res.status(400).json({ error: "currentDraft object is required" });
      }

      const draft = await generateListingDraft(currentDraft as Record<string, unknown>);
      return res.json({ draft });
    } catch (error) {
      console.error("AI Listing Draft error:", error);
      const message = error instanceof Error ? error.message : "AI listing enhancement is currently unavailable";
      return res.status(503).json({ error: message, code: "AI_UNAVAILABLE" });
    }
  });

  // Listing AI Studio pricing: authenticated seller tooling.
  app.post("/api/ai/suggest-pricing", requireFirebaseUser, async (req, res) => {
    try {
      const { name, category, condition, specs, currentPrice } = req.body || {};
      if (typeof name !== "string" || !name.trim() || typeof category !== "string" || !category.trim()) {
        return res.status(400).json({ error: "name and category are required" });
      }

      const pricing = await suggestPricing({ name, category, condition, specs, currentPrice });
      return res.json({ pricing });
    } catch (error) {
      console.error("AI Suggest Pricing error:", error);
      const message = error instanceof Error ? error.message : "AI pricing suggestions are currently unavailable";
      return res.status(503).json({ error: message, code: "AI_UNAVAILABLE" });
    }
  });

  // AI Shopping Assistant & Natural Language Search
  app.post("/api/ai/shopping-assistant", async (req, res) => {
    try {
      const { query, university, category, maxPrice, contextListings } = req.body || {};
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "query string is required" });
      }

      const result = await shoppingAssistant({
        query,
        university,
        category,
        maxPrice,
        contextListings: Array.isArray(contextListings) ? contextListings : [],
      });

      return res.json({ result });
    } catch (error) {
      console.error("AI Shopping Assistant error:", error);
      const message = error instanceof Error ? error.message : "Failed to process shopping assistant query";
      return res.status(500).json({ error: message });
    }
  });

  // Compare Listings
  app.post("/api/ai/compare-listings", async (req, res) => {
    try {
      const { items } = req.body || {};
      if (!Array.isArray(items) || items.length < 2) {
        return res.status(400).json({ error: "At least 2 items are required for comparison" });
      }

      const comparison = await compareListings({ items });
      return res.json({ comparison });
    } catch (error) {
      console.error("AI Compare error:", error);
      const message = error instanceof Error ? error.message : "Failed to compare listings";
      return res.status(500).json({ error: message });
    }
  });

  // Content Moderation for Listing AI Studio
  app.post("/api/ai/moderate", requireFirebaseUser, async (req, res) => {
    try {
      const { text, type = "listing" } = req.body || {};
      if (typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "text is required" });
      }
      if (type !== "listing" && type !== "message") {
        return res.status(400).json({ error: "type must be listing or message" });
      }

      const moderation = await moderateContent({ text, type });
      return res.json({ moderation });
    } catch (error) {
      console.error("AI Moderation error:", error);
      const message = error instanceof Error ? error.message : "AI moderation is currently unavailable";
      return res.status(503).json({ error: message, code: "AI_UNAVAILABLE" });
    }
  });

  // Keep imports of the broader AI service available for the remaining AI features while Listing AI Studio is isolated.
  void generateLegacyListingDraft;
  void suggestLegacyPricing;
  void moderateLegacyContent;
}
