import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import ListingStudioForm from "./components/ListingStudioForm";
import FeedbackModal from "./components/FeedbackModal";
import { auth } from "./firebase";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { apiFetch } from "./lib/api";
import { EXPLORE_PATH, HOME_PATH, getEditListingIdFromUrl, navigateToPath, navigateBackOrPath } from "./lib/appNavigation";
import type { Listing, ListingDraft } from "./types";
import { resolveUniversity } from "./lib/university";
import { resolveWhatsappNumber } from "./lib/whatsapp";

// (rest unchanged except button replacements)

// ONLY showing changed snippets for clarity

// Header button:
// from navigateToPath(EXPLORE_PATH) -> navigateBackOrPath(EXPLORE_PATH)

// Replace all instances of:
// onClick={() => navigateToPath(EXPLORE_PATH)}
// with:
// onClick={() => navigateBackOrPath(EXPLORE_PATH)}

// Replace labels "Back to Explore" and "Return to Explore" with "Back"
