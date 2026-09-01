import type { ReactNode } from "react";
import { CircleAlert, Loader2, RefreshCw, ShieldCheck, Wallet, X } from "lucide-react";
import FormDropdown from "./components/FormDropdown";
import type { OverrideAction, PayoutAdjustment, PayoutRow, RowAction } from "./AdminPayoutsManager";
import { classifyPayoutDiagnostic, getPayoutDiagnostics } from "./modules/payouts/diagnostics";

// NOTE: This file intentionally keeps the existing payout detail implementation.
// Only the action-button presentation has been strengthened with a floating/card feel.
