import { useEffect, useMemo, useState } from "react";
import { X, Trophy, Check, AlertCircle, RefreshCw, Scale } from "lucide-react";
import { compareMarketplaceItems, type CompareListingsResult } from "../../lib/ai";
import { formatMoney } from "../../shared/utils/formatMoney";
import AiIcon from "./AiIcon";

type ItemToCompare = {
  id: string;
  name: string;
  category?: string;
  price: number;
  description?: string;
  condition?: string;
  university?: string;
  specs?: Record<string, unknown>;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  items: ItemToCompare[];
};

export default function ProductCompareModal({ isOpen, onClose, items }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareListingsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const comparisonItems = useMemo(
    () => items.filter((item, index, array) => array.findIndex((candidate) => String(candidate.id) === String(item.id)) === index).slice(0, 3),
    [items],
  );

  useEffect(() => {
    if (isOpen) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setResult(null);
    setError(null);

    if (comparisonItems.length >= 2) {
      void runComparison(comparisonItems);
    } else {
      setError("Select at least 2 listings to compare.");
    }
  }, [isOpen, comparisonItems]);

  const runComparison = async (selectedItems: ItemToCompare[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await compareMarketplaceItems(selectedItems.map((item) => ({ id: item.id })));
      if (response) {
        setResult(response);
      } else {
        setError("BuyMesho comparison is currently unavailable. Your listings were not changed.");
      }
    } catch {
      setError("BuyMesho comparison is currently unavailable. Your listings were not changed.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-linear-to-r from-emerald-900 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/10 rounded-xl">
              <AiIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                BuyMesho Product Comparison
                <span className="text-[10px] font-semibold bg-white/10 text-emerald-100 border border-white/20 px-2 py-0.5 rounded-full uppercase">
                  Decision support
                </span>
              </h3>
              <p className="text-xs text-emerald-100/80">Compares canonical BuyMesho listing records</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white" aria-label="Close product comparison">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {comparisonItems.length >= 2 && (
            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600 flex items-start gap-2">
              <Scale className="w-4 h-4 text-zinc-800 shrink-0 mt-0.5" />
              <p>
                This comparison uses the canonical BuyMesho listing records identified by the selected listing IDs. Missing information is not treated as a fact, and the result is not an official valuation, verification or guarantee.
              </p>
            </div>
          )}

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin" />
              <p className="text-sm font-medium text-neutral-700">Comparing canonical BuyMesho listing information…</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              {error}
            </div>
          )}