import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  BadgeCheck,
  Building2,
  ClipboardList,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import BrandMark from "./components/BrandMark";
import ConfirmModal from "./components/ConfirmModal";
import PayoutDestinationCard from "./components/payouts/PayoutDestinationCard";
import PayoutActionRequiredBanner from "./components/payouts/PayoutActionRequiredBanner";
import PayoutDestinationForm from "./components/payouts/PayoutDestinationForm";
import PayoutStatusBadge from "./components/payouts/PayoutStatusBadge";
import SellerEarningsSummary from "./components/payouts/SellerEarningsSummary";
import PayoutTimeline from "./components/payouts/PayoutTimeline";
import PayoutPolicyExplainer from "./components/payouts/PayoutPolicyExplainer";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { EXPLORE_PATH, navigateToPath } from "./lib/appNavigation";
import {
  createPayoutDestination,
  deletePayoutDestination,
  getPayoutDestinations,
  getPayoutHistory,
  getPayoutPermissions,
  replacePayoutDestination,
  updatePayoutDestination,
} from "./modules/payouts/api";
// FILE RESTORED - APPLY MANUAL PATCH NEXT
