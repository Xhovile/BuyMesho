import type { Express, RequestHandler } from "express";
import { generateListingDraft } from "../lib/ai.js";

export function registerAiRoutes(app: Express, requireFirebaseUser: RequestHandler) {
  app.post("/api/ai/listing-draft", requireFirebaseUser, async (req, res) => {
    try {
      const currentDraft = req.body?.currentDraft;

      if (!currentDraft || typeof currentDraft !== "object") {
        return res.status(400).json({ error: "currentDraft is required" });
      }

      const draft = await generateListingDraft({ currentDraft: currentDraft as Record<string, unknown> });
      return res.json({ draft });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate listing draft";
      return res.status(500).json({ error: message });
    }
  });
}
