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
                      <p className="mt-0.5 text-[10px] text-bm-text-subtle">Choose a design from the poster.</p>
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
                        className="w-32 rounded-xl border border-bm-border bg-white px-3 py-2.5 text-sm text-bm-text outline-none focus:border-[#168cff]"
                        placeholder="Total MWK"
                        inputMode="numeric"
                      />
                    ) : null}
                  </div>
                  <p className="mt-2 text-[10px] text-bm-text-subtle">
                    Project price: <span className="font-black text-white">{formatMoney(graphicTotal)}</span>
                  </p>
                </div>
              ) : null}

              {needsWebsite ? (
                <div className="rounded-xl border border-[#ff1d25]/25 bg-[#fff1f1] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff5b61]">Web Development</p>
                      <p className="mt-0.5 text-[10px] text-bm-text-subtle">Websites from MWK 80,000.</p>
                    </div>
                    <Monitor className="h-4 w-4 text-[#ff5b61]" />
                  </div>
                  <label className="mt-2 block">
                    <span className="sr-only">Agreed website project price</span>
                    <input
                      value={websiteTotal}
                      onChange={(event) => onWebsiteTotalChange(event.target.value.replace(/[^0-9.]/g, ""))}
                      className="w-full rounded-xl border border-bm-border bg-white px-3 py-2.5 text-sm text-bm-text outline-none placeholder:text-bm-text-muted focus:border-[#ff1d25]"
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
                    className="w-full rounded-xl border border-bm-border bg-[#fffdfa] px-3 py-2.5 text-sm text-bm-text outline-none placeholder:text-bm-text-subtle focus:border-bm-focus"
                    placeholder="Project reference"
                  />

                  {needsWebsite ? (
                    <div>
                      <label className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-bm-text-muted">
                        Website balance to pay
                      </label>
                      <input
                        value={balanceAmount}
                        onChange={(event) => onBalanceAmountChange(event.target.value.replace(/[^0-9.]/g, ""))}
                        className="w-full rounded-xl border border-bm-border bg-[#fffdfa] px-3 py-2.5 text-sm text-bm-text outline-none placeholder:text-bm-text-subtle focus:border-bm-focus"
                        placeholder="Enter website balance (MWK)"
                        inputMode="numeric"
                      />
                      <p className="mt-1 text-[10px] text-bm-text-subtle">
                        Enter the agreed remaining website balance. Graphic balances remain 50%.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#168cff]/20 bg-[#168cff]/5 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[#168cff]">Graphic balance</p>
                      <p className="mt-0.5 text-sm font-black text-bm-text">{formatMoney(graphicTotal / 2)}</p>
                      <p className="mt-0.5 text-[10px] text-bm-text-subtle">Fixed at 50% of the listed project price.</p>
                    </div>
                  )}
                </div>
              ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-bm-text">Payment</p>
                <p className="mt-0.5 text-[10px] text-bm-text-subtle">We start new work after a 50% deposit.</p>
              </div>
              <span className="text-sm font-black text-bm-text">{formatMoney(amountDue)}</span>
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
