import { ArrowLeft, Loader2 } from "lucide-react";

export default function SellerPayoutsAccessGate({
  loading,
  isSeller,
  onBack,
}: {
  loading: boolean;
  isSeller: boolean;
  onBack: () => void;
}) {
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7]">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
          <span className="font-semibold text-zinc-700">Loading seller payouts...</span>
        </div>
      </div>
    );
  }

  if (isSeller) return null;

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-zinc-900">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mt-6 rounded-[28px] border border-zinc-200/80 bg-white p-8 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
          <h1 className="text-3xl font-black tracking-tight">Seller payouts</h1>
          <p className="mt-3 text-sm text-zinc-600">
            You are not marked as a seller yet. Seller payout tools appear here after the account is
            approved as a seller.
          </p>
        </div>
      </div>
    </div>
  );
}
