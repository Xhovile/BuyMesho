import { Monitor, Palette } from "lucide-react";
import {
  MIN_WEBSITE_PROJECT_TOTAL,
  formatMoney,
  type PaymentMode,
} from "./config";
import { ChoiceButton, GraphicServicePicker } from "./shared";

export interface StudioPaymentOptionsProps {
  needsGraphic: boolean;
  needsWebsite: boolean;
  graphicId: string;
  graphicCustomTotal: string;
  websiteTotal: string;
  paymentMode: PaymentMode;
  balanceAmount: string;
  projectReference: string;
  graphicTotal: number;
  combinedProjectTotal: number;
  amountDue: number;
  theme: "blue" | "red" | "split";
  onGraphicIdChange: (value: string) => void;
  onGraphicCustomTotalChange: (value: string) => void;
  onWebsiteTotalChange: (value: string) => void;
  onPaymentModeChange: (value: PaymentMode) => void;
  onBalanceAmountChange: (value: string) => void;
  onProjectReferenceChange: (value: string) => void;
}

export default function StudioPaymentOptions({
  needsGraphic,
  needsWebsite,
  graphicId,
  graphicCustomTotal,
  websiteTotal,
  paymentMode,
  balanceAmount,
  projectReference,
  graphicTotal,
  combinedProjectTotal,
  amountDue,
  theme,
  onGraphicIdChange,
  onGraphicCustomTotalChange,
  onWebsiteTotalChange,
  onPaymentModeChange,
  onBalanceAmountChange,
  onProjectReferenceChange,
}: StudioPaymentOptionsProps) {
  return (
<>
          <div className="space-y-3">
              {needsGraphic ? (
                <div className="rounded-xl border border-[#168cff]/25 bg-[#eef8ff] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#168cff]">Graphic Design</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">Choose a design from the poster.</p>
                    </div>
                    <Palette className="h-4 w-4 text-[#168cff]" />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <div className="min-w-0 flex-1">
                      <GraphicServicePicker value={graphicId} onChange={onGraphicIdChange} />
                    </div>
                    {graphicId === "custom" ? (
                      <input
                        value={graphicCustomTotal}
                        onChange={(event) => onGraphicCustomTotalChange(event.target.value.replace(/[^0-9.]/g, ""))}
                        className="w-32 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-[#168cff]"
                        placeholder="Total MWK"
                        inputMode="numeric"
                      />
                    ) : null}
                  </div>
                  <p className="mt-2 text-[10px] text-zinc-500">
                    Project price: <span className="font-black text-white">{formatMoney(graphicTotal)}</span>
                  </p>
                </div>
              ) : null}

              {needsWebsite ? (
                <div className="rounded-xl border border-[#ff1d25]/25 bg-[#fff1f1] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff5b61]">Web Development</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">Websites from MWK 80,000.</p>
                    </div>
                    <Monitor className="h-4 w-4 text-[#ff5b61]" />
                  </div>
                  <label className="mt-2 block">
                    <span className="sr-only">Agreed website project price</span>
                    <input
                      value={websiteTotal}
                      onChange={(event) => onWebsiteTotalChange(event.target.value.replace(/[^0-9.]/g, ""))}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-700 focus:border-[#ff1d25]"
                      placeholder="Agreed project price (MWK)"
                      inputMode="numeric"
                    />
                  </label>
                </div>
              ) : null}

              {paymentMode === "balance" ? (
                <div className="space-y-2">
                  <input
                    value={projectReference}
                    onChange={(event) => onProjectReferenceChange(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-[#fffdfa] px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
                    placeholder="Project reference"
                  />

                  {needsWebsite ? (
                    <div>
                      <label className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                        Website balance to pay
                      </label>
                      <input
                        value={balanceAmount}
                        onChange={(event) => onBalanceAmountChange(event.target.value.replace(/[^0-9.]/g, ""))}
                        className="w-full rounded-xl border border-zinc-200 bg-[#fffdfa] px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
                        placeholder="Enter website balance (MWK)"
                        inputMode="numeric"
                      />
                      <p className="mt-1 text-[10px] text-zinc-500">
                        Enter the agreed remaining website balance. Graphic balances remain 50%.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#168cff]/20 bg-[#168cff]/5 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[#168cff]">Graphic balance</p>
                      <p className="mt-0.5 text-sm font-black text-zinc-900">{formatMoney(graphicTotal / 2)}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">Fixed at 50% of the listed project price.</p>
                    </div>
                  )}
                </div>
              ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-zinc-900">Payment</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">We start new work after a 50% deposit.</p>
              </div>
              <span className="text-sm font-black text-zinc-900">{formatMoney(amountDue)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ChoiceButton
                active={paymentMode === "deposit"}
                title="50% Deposit"
                subtitle={combinedProjectTotal > 0 ? formatMoney(combinedProjectTotal / 2) : "Half now"}
                onClick={() => onPaymentModeChange("deposit")}
                accent={theme === "blue" ? "blue" : theme === "red" ? "red" : "neutral"}
              />
              <ChoiceButton
                active={paymentMode === "full"}
                title="Full Payment"
                subtitle={combinedProjectTotal > 0 ? formatMoney(combinedProjectTotal) : "Pay all"}
                onClick={() => onPaymentModeChange("full")}
                accent="neutral"
              />
              <ChoiceButton
                active={paymentMode === "balance"}
                title="Final Balance"
                subtitle={
                  paymentMode === "balance"
                    ? needsWebsite
                      ? "Enter website balance"
                      : needsGraphic
                        ? formatMoney(graphicTotal / 2)
                        : "Existing project"
                    : "Existing project"
                }
                onClick={() => onPaymentModeChange("balance")}
                accent="neutral"
              />
            </div>
          </div>


</>
  );
}
