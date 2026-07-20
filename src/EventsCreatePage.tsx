import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, ChevronDown, Ticket, X } from "lucide-react";

import { EVENTS_PATH, HOME_PATH, navigateBackOrPath, navigateToPath } from "./lib/appNavigation";
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

function parseTimeValue(value: unknown): { hour: string; minute: string } {
  if (typeof value !== "string" || !value.includes(":")) {
    return { hour: "", minute: "" };
  }

  const [rawHour, rawMinute] = value.split(":");
  const hour = rawHour?.trim();
  const minute = rawMinute?.trim();

  if (!hour || !minute) {
    return { hour: "", minute: "" };
  }

  return {
    hour: hour.padStart(2, "0"),
    minute: minute.padStart(2, "0"),
  };
}

function makeTimeValue(hour: string, minute: string) {
  if (!hour || !minute) return "";
  return `${hour}:${minute}`;
}

function isDateLikeField(field: EventSpecField) {
  const key = field.key.toLowerCase();
  return key.includes("date") || key.includes("deadline");
}

function isTimeLikeField(field: EventSpecField) {
  return field.key.toLowerCase().includes("time");
}

function TimePicker({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (nextValue: string) => void;
}) {
  const current = parseTimeValue(value);
  const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
  const minuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

  return (
    <div className="mt-2 grid grid-cols-2 gap-3">
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">Hour</span>
        <select
          value={current.hour}
          onChange={(e) => onChange(makeTimeValue(e.target.value, current.minute))}
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
        >
          <option value="">HH</option>
          {hourOptions.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">Minute</span>
        <select
          value={current.minute}
          onChange={(e) => onChange(makeTimeValue(current.hour, e.target.value))}
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
        >
          <option value="">MM</option>
          {minuteOptions.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
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

      {isDateLikeField(field) ? (
        <input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
        />
      ) : isTimeLikeField(field) ? (
        <TimePicker value={value} onChange={(nextValue) => onChange(nextValue)} />
      ) : field.type === "textarea" ? (
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
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

      navigateToPath(EVENTS_PATH, { replace: true });
    } catch (err: any) {
      setFormError(err?.message || "Could not save the event.");
    } finally {
      setSubmitting(false);
    }
  };

  const previewSource = values;
  const previewTitle = String(previewSource.event_title || previewSource.theme || previewSource.event_focus || eventType);
  const previewDate = previewSource.event_date || previewSource.registration_deadline || previewSource.start_time;
  const previewLocation = previewSource.location || previewSource.venue || previewSource.university_name || previewSource.host_organization;
  const previewTicketMode = previewSource.ticket_mode;
  const previewPrice = formatMoney(previewSource.ticket_price);

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

              <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                When you post, the form will close immediately and return you to Events.
              </p>
            </section>

            <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.15)] sm:p-6">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">What this page does</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-600">
                <li>• Picks the event schema from the type you choose.</li>
                <li>• Shows a real calendar for date fields.</li>
                <li>• Uses hour and minute dropdowns for time fields.</li>
                <li>• Replaces the history entry after posting so Back will not reopen the form.</li>
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
