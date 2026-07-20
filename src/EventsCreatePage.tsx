import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Ticket } from "lucide-react";

import {
  EVENTS_PATH,
  EXPLORE_PATH,
  HOME_PATH,
  navigateBackOrPath,
  navigateToPath,
} from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import {
  createEmptyEventValues,
  getEventItemConfig,
  getEventItemTypes,
  type EventSpecField,
  validateEventValues,
} from "./eventSchemas";

type SavedEvent = {
  id: number;
  creator_uid: string | null;
  event_type: string;
  event_title: string;
  organizer_name: string;
  event_date: string;
  start_time: string;
  venue: string;
  location: string;
  ticket_mode: string;
  ticket_price: number | null;
  ticket_link: string | null;
  description: string;
  contact_whatsapp: string | null;
  poster_alt: string | null;
  spec_values: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
};

const INITIAL_EVENT_TYPE = getEventItemTypes()[0] ?? "Concert";

function fieldValueAsText(value: unknown) {
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return "Free";
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric <= 0) return String(value);
  return `MK ${numeric.toLocaleString()}`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-rose-600">{message}</p>;
}

function RenderField({
  field,
  value,
  error,
  onChange,
}: {
  field: EventSpecField;
  value: unknown;
  error?: string;
  onChange: (nextValue: unknown) => void;
}) {
  const baseClass =
    "mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";

  return (
    <label className="block">
      <span className="text-sm font-bold text-zinc-900">
        {field.label}
        {field.required ? <span className="ml-1 text-red-900">*</span> : null}
      </span>
      {field.helpText ? <span className="mt-1 block text-xs text-zinc-500">{field.helpText}</span> : null}

      {field.type === "textarea" ? (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`${baseClass} min-h-[120px] resize-y`}
        />
      ) : field.type === "select" ? (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
        >
          <option value="">Select {field.label.toLowerCase()}</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === "number" ? (
        <input
          type="number"
          inputMode="numeric"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={baseClass}
        />
      ) : field.type === "boolean" ? (
        <label className="mt-2 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-red-900 focus:ring-red-900"
          />
          <span>{field.helpText || "Toggle this option"}</span>
        </label>
      ) : field.type === "multiselect" ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(field.options || []).map((option) => {
            const selected = Array.isArray(value) ? value.includes(option) : false;
            return (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
                    onChange(
                      e.target.checked
                        ? [...current, option]
                        : current.filter((item) => item !== option)
                    );
                  }}
                  className="h-4 w-4 rounded border-zinc-300 text-red-900 focus:ring-red-900"
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={baseClass}
        />
      )}

      <FieldError message={error} />
    </label>
  );
}

export default function EventsCreatePage() {
  const eventTypes = useMemo(() => getEventItemTypes(), []);
  const [eventType, setEventType] = useState(INITIAL_EVENT_TYPE);
  const [values, setValues] = useState<Record<string, unknown>>(() => createEmptyEventValues(INITIAL_EVENT_TYPE));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<SavedEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const config = getEventItemConfig(eventType) ?? getEventItemConfig(INITIAL_EVENT_TYPE);
  const fieldMap = useMemo(() => {
    const map = new Map<string, EventSpecField>();
    config?.schema.fields.forEach((field) => {
      map.set(field.key, field);
    });
    return map;
  }, [config]);

  const handleTypeChange = (nextType: string) => {
    setEventType(nextType);
    setValues(createEmptyEventValues(nextType));
    setFieldErrors({});
    setFormError(null);
    setCreatedEvent(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config) {
      setFormError("No event schema is available for this selection.");
      return;
    }

    const validation = validateEventValues(eventType, values);
    if (!validation.isValid) {
      const nextErrors: Record<string, string> = {};
      validation.errors.forEach((err) => {
        nextErrors[err.key] = err.message;
      });
      setFieldErrors(nextErrors);
      setFormError("Fix the highlighted fields and try again.");
      setCreatedEvent(null);
      return;
    }

    setSubmitting(true);
    try {
      const response = (await apiFetch("/api/events", {
        method: "POST",
        body: JSON.stringify({
          event_type: eventType,
          spec_values: values,
        }),
      })) as { success?: boolean; event?: SavedEvent | null };

      if (!response?.event) {
        throw new Error("The event was saved, but no event data was returned.");
      }

      setFieldErrors({});
      setFormError(null);
      setCreatedEvent(response.event);
      setValues(response.event.spec_values ?? values);
      setEventType(response.event.event_type || eventType);
    } catch (err: any) {
      setFormError(err?.message || "Could not save the event.");
      setCreatedEvent(null);
    } finally {
      setSubmitting(false);
    }
  };

  const previewSource = createdEvent?.spec_values ?? values;
  const previewTitle = String(
    createdEvent?.event_title || previewSource.event_title || previewSource.theme || previewSource.event_focus || eventType
  );
  const previewDate = createdEvent?.event_date || previewSource.event_date || previewSource.registration_deadline || previewSource.start_time;
  const previewLocation = createdEvent?.location || previewSource.location || previewSource.venue || previewSource.university_name || previewSource.host_organization;
  const previewTicketMode = createdEvent?.ticket_mode || previewSource.ticket_mode;
  const previewPrice = formatMoney(createdEvent?.ticket_price ?? previewSource.ticket_price);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-900 text-xl font-extrabold text-white shadow-lg shadow-red-900/20">B</div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight"><span className="text-red-900">Buy</span><span className="text-zinc-700">Mesho</span></p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Create event</p>
            </div>
          </button>
          <button type="button" onClick={() => navigateBackOrPath(EVENTS_PATH)} className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50">Back</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-4 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.15)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Event creator</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-zinc-950 sm:text-5xl">Create an event</h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
                  Choose the event type first, then fill in the schema fields that appear for that type.
                </p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-900/15 sm:flex">
                <Ticket className="h-5 w-5" />
              </div>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-6">
                <label className="block">
                  <span className="text-sm font-bold text-zinc-900">Event type</span>
                  <div className="relative mt-2">
                    <select
                      value={eventType}
                      onChange={(e) => handleTypeChange(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                    >
                      {eventTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  </div>
                </label>

                {!config ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    No schema is available for this event type yet.
                  </div>
                ) : (
                  config.fieldGroups.map((group) => {
                    const fields = group.keys
                      .map((key) => fieldMap.get(key))
                      .filter(Boolean) as EventSpecField[];

                    if (fields.length === 0) return null;

                    return (
                      <section key={group.title} className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-4">
                          <h2 className="text-sm font-extrabold uppercase tracking-[0.2em] text-zinc-500">{group.title}</h2>
                          <span className="h-2.5 w-2.5 rounded-full bg-red-900" />
                        </div>

                        <div className="mt-4 grid gap-4">
                          {fields.map((field) => (
                            <RenderField
                              key={field.key}
                              field={field}
                              value={values[field.key]}
                              error={fieldErrors[field.key]}
                              onChange={(nextValue) => {
                                setValues((current) => ({ ...current, [field.key]: nextValue }));
                                setFieldErrors((current) => {
                                  if (!current[field.key]) return current;
                                  const next = { ...current };
                                  delete next[field.key];
                                  return next;
                                });
                              }}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })
                )}
              </div>

              {formError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900">
                  {formError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-zinc-900/15 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Posting..." : "Post event"}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setValues(createEmptyEventValues(eventType));
                    setFieldErrors({});
                    setFormError(null);
                    setCreatedEvent(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
                >
                  Reset
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.15)] sm:p-6">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Saved preview</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-zinc-950">How the event will look</h2>

              <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-zinc-950 text-white shadow-[0_18px_50px_-28px_rgba(0,0,0,0.35)]">
                <div className="bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.28),transparent_35%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.22),transparent_28%)] px-5 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-red-200/80">{eventType}</p>
                      <h3 className="mt-2 text-3xl font-black tracking-[-0.05em] leading-[0.95]">{previewTitle}</h3>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                      <Ticket className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 text-sm text-zinc-100/90">
                    <p><span className="font-bold text-white">Date:</span> {fieldValueAsText(previewDate)}</p>
                    <p><span className="font-bold text-white">Venue:</span> {fieldValueAsText(previewLocation)}</p>
                    <p><span className="font-bold text-white">Ticket mode:</span> {fieldValueAsText(previewTicketMode)}</p>
                    <p><span className="font-bold text-white">Price:</span> {previewPrice}</p>
                  </div>
                </div>
              </div>

              {createdEvent ? (
                <div className="mt-4 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-extrabold">
                    <CheckCircle2 className="h-4 w-4" />
                    Event saved
                  </div>
                  <p className="mt-2 leading-relaxed">
                    The event has been posted to the database and is now ready for the Events directory flow.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                  When you post, the saved event will appear here using the server response.
                </p>
              )}
            </section>

            <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.15)] sm:p-6">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">What this page does</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-600">
                <li>• Picks the event schema from the type you choose.</li>
                <li>• Shows the matching fields and validation rules.</li>
                <li>• Saves the event to the backend and shows the persisted response.</li>
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
