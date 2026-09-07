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
  return (
    <div className="space-y-4 md:grid md:grid-cols-2 md:items-start md:gap-4 md:space-y-0">
      <div className="min-w-0">
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
      </div>

      <div className="min-w-0">
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
    </div>
  );
}
