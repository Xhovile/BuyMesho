import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  Pencil,
  RefreshCw,
  ReceiptText,
  Search,
  ShieldCheck,
  ShieldOff,
  ShoppingBag,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";

import { apiFetch } from "./lib/api";
import { ADMIN_EVENTS_PATH, EVENTS_PATH, navigateToPath } from "./lib/appNavigation";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";
