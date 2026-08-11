import type { Express, RequestHandler } from "express";
import {
  generateListingDraft,
  suggestPricing,
  shoppingAssistant,
  compareListings,
  moderateContent,
} from "../lib/ai.js";

export function registerAiRoutes(app: Express, requireFirebaseUser: RequestHandler) {
  // 1. Generate / enhance listing draft
  app.post("/api/ai/listing-draft", requireFirebaseUser, async (req, res) => {
    try {
      const currentDraft = req.body?.currentDraft;
      if (!currentDraft || typeof currentDraft !== "object") {
        return res.status(400).json({ error: "currentDraft object is required" });
      }

      const draft = await generateListingDraft({ currentDraft: currentDraft as Record<string, unknown> });
      return res.json({ draft });
    } catch (error) {
      console.error("AI Listing Draft error:", error);
      const message = error instanceof Error ? error.message : "Failed to generate listing draft";
      return res.status(500).json({ error: message });
    }
  });

  // 2. Suggest pricing & market valuation
  app.post("/api/ai/suggest-pricing", requireFirebaseUser, async (req, res) => {
    try {
      const { name, category, condition, specs, currentPrice } = req.body || {};
      if (!name || !category) {
        return res.status(400).json({ error: "name and category are required" });
      }

      const pricing = await suggestPricing({ name, category, condition, specs, currentPrice });
      return res.json({ pricing });
    } catch (error) {
      console.error("AI Suggest Pricing error:", error);
      const message = error instanceof Error ? error.message : "Failed to estimate pricing";
      return res.status(500).json({ error: message });
    }
  });

  // 3. AI Shopping Assistant & Natural Language Search
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

  // 4. Compare Listings
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

  // 5. Content Moderation
  app.post("/api/ai/moderate", requireFirebaseUser, async (req, res) => {
    try {
      const { text, type = "listing" } = req.body || {};
      if (!text) {
        return res.status(400).json({ error: "text is required" });
      }

      const moderation = await moderateContent({ text, type });
      return res.json({ moderation });
    } catch (error) {
      console.error("AI Moderation error:", error);
      const message = error instanceof Error ? error.message : "Failed to moderate content";
      return res.status(500).json({ error: message });
    }
  });
}
