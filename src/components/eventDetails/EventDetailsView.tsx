import { useEffect, useMemo, useState } from "react";
import { Loader2, Ticket } from "lucide-react";

import EventActionsMenu from "./EventActionsMenu";
import EventDetailsActions from "./EventDetailsActions";
import EventDetailsHeader from "./EventDetailsHeader";
import EventDetailsHero from "./EventDetailsHero";
import EventDetailsSections from "./EventDetailsSections";
import {
  BASE_DETAIL_KEYS,
  HIDDEN_SPEC_KEYS,
  formatMoney,
  getPosterAlt,
  getPosterUrl,
  posterAccent,
} from "./eventDetailsUtils";
import type { EventRecord } from "./eventDetailsTypes";
import { apiFetch } from "../../lib/api";
import { EVENTS_PATH, navigateBackOrPath, navigateToLoginWithReturnPath, navigateToPath } from "../../lib/appNavigation";
import { startConversationFromEvent } from "../../lib/messages";
import { navigateToConversation } from "../../lib/messagesNavigation";
import { useAuthUser } from "../../hooks/useAuthUser";
import { upsertEventCartItem } from "../../lib/eventCart";
