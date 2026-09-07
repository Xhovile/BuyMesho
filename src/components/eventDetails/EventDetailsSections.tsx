import { useEffect } from "react";
import AccordionSection from "./AccordionSection";
import DetailRow from "./DetailRow";
import { fieldLabelFromKey, normalizeValue } from "./eventDetailsUtils";
import type { EventRecord } from "./eventDetailsTypes";

export default function EventDetailsSections({
  event,
  coreOpen,
  extraOpen,
  onToggleCore,
  onToggleExtra,
  extraSpecEntries,
}: {
  event: EventRecord;
  coreOpen: boolean;
  extraOpen: boolean;
  onToggleCore: () => void;
  onToggleExtra: () => void;
  extraSpecEntries: Array<[string, unknown]>;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;

    if (!coreOpen) onToggleCore();
    if (!extraOpen) onToggleExtra();
    // Intentionally run once on mount so desktop starts expanded without
    // preventing the user from closing either accordion afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <AccordionSection title="Core details" open={coreOpen} onToggle={onToggleCore}>
        <div className="divide-y divide-zinc-200/70">
          {[
            ["Organizer name", event.organizer_name],
            ["Venue", event.venue || "—"],
            ["Location", event.location || "—"],
            ["Contact WhatsApp", event.contact_whatsapp || "—"],
          ].map(([label, value]) => (
            <DetailRow key={label} label={label} value={String(value)} />
          ))}
        </div>
      </AccordionSection>

      <AccordionSection title="Event specific details" open={extraOpen} onToggle={onToggleExtra}>
        {extraSpecEntries.length > 0 ? (
          <div className="divide-y divide-zinc-200/70">
            {extraSpecEntries.map(([key, value]) => (
              <DetailRow key={key} label={fieldLabelFromKey(key)} value={normalizeValue(value)} />
            ))}
          </div>
        ) : (
          <div className="px-0 py-5 text-sm text-zinc-500">No extra event-specific fields.</div>
        )}
      </AccordionSection>
    </div>
  );
}
