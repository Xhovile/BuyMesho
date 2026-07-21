import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, ChevronDown, Ticket, Upload, X } from "lucide-react";

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

type DropdownOption = { value: string; label: string };
type DropdownStyle = { top: number; left: number; width: number };

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
  if (typeof value !== "string") return { hour: "", minute: "" };
  const [rawHour = "", rawMinute = ""] = value.split(":");
  const hour = rawHour.trim();
  const minute = rawMinute.trim();
  return {
    hour: hour ? hour.padStart(2, "0") : "",
    minute: minute ? minute.padStart(2, "0") : "",
  };
}

function makeTimeValue(hour: string, minute: string) {
  return `${hour}:${minute}`;
}

function isDateLikeField(field: EventSpecField) {
  const key = field.key.toLowerCase();
  return key.includes("date") || key.includes("deadline");
}

function isTimeLikeField(field: EventSpecField) {
  return field.key.toLowerCase().includes("time");
}

function normalizeNumberFields(fields: EventSpecField[], values: Record<string, unknown>) {
  const nextValues: Record<string, unknown> = { ...values };

  for (const field of fields) {
    if (field.type !== "number") continue;
    const rawValue = nextValues[field.key];

    if (rawValue === null || rawValue === undefined || rawValue === "") {
      nextValues[field.key] = null;
      continue;
    }

    if (typeof rawValue === "number") continue;

    const numericValue = Number(String(rawValue).trim());
    nextValues[field.key] = Number.isNaN(numericValue) ? rawValue : numericValue;
  }

  return nextValues;
}

function AppDropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (nextValue: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<DropdownStyle | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const button = rootRef.current?.querySelector("button");
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = Math.min(rect.width, window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const top = rect.bottom + 8;
      setMenuStyle({ top, left, width });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={label}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm text-zinc-900 outline-none transition hover:border-zinc-300 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
      >
        <span className={selected ? "font-medium" : "text-zinc-400"}>{selected?.label || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && menuStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="z-[9999] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_70px_-35px_rgba(0,0,0,0.28)]"
              style={{
                position: "fixed",
                top: menuStyle.top,
                left: menuStyle.left,
                width: menuStyle.width,
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="max-h-64 overflow-auto p-2">
                {options.map((option) => {
                  const active = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition ${
                        active ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <span>{option.label}</span>
                      {active ? <span className="text-[10px] font-extrabold uppercase tracking-[0.18em]">Selected</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function TimePicker({ value, onChange }: { value: unknown; onChange: (nextValue: string) => void }) {
  const current = useMemo(() => parseTimeValue(value), [value]);
  const [hour, setHour] = useState(current.hour);
  const [minute, setMinute] = useState(current.minute);

  useEffect(() => {
    setHour(current.hour);
    setMinute(current.minute);
  }, [current.hour, current.minute]);

  const commitTime = (nextHour: string, nextMinute: string) => {
    if (nextHour && nextMinute) {
      onChange(makeTimeValue(nextHour, nextMinute));
    }
  };

  const hourOptions: DropdownOption[] = Array.from({ length: 24 }, (_, index) => {
    const hourValue = String(index).padStart(2, "0");
    return { value: hourValue, label: hourValue };
  });

  const minuteOptions: DropdownOption[] = Array.from({ length: 60 }, (_, index) => {
    const minuteValue = String(index).padStart(2, "0");
    return { value: minuteValue, label: minuteValue };
  });

  return (
    <div className="mt-2 grid grid-cols-2 gap-3">
      <div>
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">Hour</span>
        <AppDropdown
          label="Hour"
          value={hour}
          options={hourOptions}
          placeholder="HH"
          onChange={(nextHour) => {
            setHour(nextHour);
            commitTime(nextHour, minute);
          }}
        />
      </div>
      <div>
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">Minute</span>
        <AppDropdown
          label="Minute"
          value={minute}
          options={minuteOptions}
          placeholder="MM"
          onChange={(nextMinute) => {
            setMinute(nextMinute);
            commitTime(hour, nextMinute);
          }}
        />
      </div>
    </div>
  );
}

function RenderField({ field, value, error, onChange }: { field: EventSpecField; value: unknown; error?: string; onChange: (nextValue: unknown) => void }) {
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
        <input type="date" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} className={baseClass} />
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
        <AppDropdown
          label={field.label}
          value={typeof value === "string" ? value : ""}
          options={(field.options || []).map((option) => ({ value: option, label: option }))}
          placeholder={`Select ${field.label.toLowerCase()}`}
          onChange={(nextValue) => onChange(nextValue)}
        />
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
              <label key={option} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
                    onChange(e.target.checked ? [...current, option] : current.filter((item) => item !== option));
                  }}
                  className="h-4 w-4 rounded border-zinc-300 text-red-900 focus:ring-red-900"
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <input type="text" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={baseClass} />
      )}

      <FieldError message={error} />
    </label>
  );
}

export default function EventsCreatePage() {
  const eventTypes = useMemo(() => getEventItemTypes(), []);
  const [eventType, setEventType] = useState(INITIAL_EVENT_TYPE);
  const [values, setValues] = useState<Record<string, unknown>>(() => createEmptyEventValues(INITIAL_EVENT_TYPE));
  const [posterAssetUrl, setPosterAssetUrl] = useState("");
  const [posterUploading, setPosterUploading] = useState(false);
  const posterInputRef = useRef<HTMLInputElement | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const config = getEventItemConfig(eventType) ?? getEventItemConfig(INITIAL_EVENT_TYPE);
  const fieldMap = useMemo(() => {
    const map = new Map<string, EventSpecField>();
    config?.schema.fields.forEach((field) => map.set(field.key, field));
    return map;
  }, [config]);

  const uploadMediaFile = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("/api/upload/", { method: "POST", body: formData });
    const text = await res.text();

    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Upload returned an invalid response.");
      }
    }

    if (!res.ok) throw new Error(data?.error || "Upload failed");
    if (!data?.url) throw new Error("Upload succeeded, but no file URL was returned.");
    return data.url as string;
  };

  const handlePosterPick = () => posterInputRef.current?.click();

  const handlePosterChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPosterUploading(true);
    setFormError(null);

    try {
      const uploadedUrl = await uploadMediaFile(file);
      setPosterAssetUrl(uploadedUrl);
    } catch (err: any) {
      setFormError(err?.message || "Could not upload the poster image.");
    } finally {
      setPosterUploading(false);
      e.target.value = "";
    }
  };

  const handleTypeChange = (nextType: string) => {
    setEventType(nextType);
    setValues(createEmptyEventValues(nextType));
    setPosterAssetUrl("");
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
      const normalizedValues = normalizeNumberFields(config.schema.fields, values);
      const response = (await apiFetch("/api/events", {
        method: "POST",
        body: JSON.stringify({
          event_type: eventType,
          spec_values: {
            ...normalizedValues,
            ...(posterAssetUrl ? { poster_image_url: posterAssetUrl } : {}),
          },
        }),
      })) as { success?: boolean; event?: SavedEvent | null };

      if (!response?.event) throw new Error("The event was saved, but no event data was returned.");
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
              <p className="text-lg font-extrabold tracking-tight">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Create event</p>
            </div>
          </button>
          <button type="button" onClick={() => navigateBackOrPath(EVENTS_PATH)} className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50">
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-4 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.15)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Event creator</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-zinc-950 sm:text-5xl">Create an event</h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">Choose the event type first, then fill in the schema fields that appear for that type.</p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-900/15 sm:flex">
                <Ticket className="h-5 w-5" />
              </div>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-6">
                <label className="block">
                  <span className="text-sm font-bold text-zinc-900">Event type</span>
                  <AppDropdown
                    label="Event type"
                    value={eventType}
                    options={eventTypes.map((type) => ({ value: type, label: type }))}
                    placeholder="Select event type"
                    onChange={handleTypeChange}
                  />
                </label>

                {!config ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">No schema is available for this event type yet.</div>
                ) : (
                  config.fieldGroups.map((group) => {
                    const fields = group.keys.map((key) => fieldMap.get(key)).filter(Boolean) as EventSpecField[];
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

                <section className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-sm font-extrabold uppercase tracking-[0.2em] text-zinc-500">Poster</h2>
                    <span className="h-2.5 w-2.5 rounded-full bg-red-900" />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">Pick a poster from your device gallery. It will upload immediately.</p>
                  <input ref={posterInputRef} type="file" accept="image/*" onChange={handlePosterChange} className="hidden" />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePosterPick}
                      disabled={posterUploading}
                      className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-zinc-900/15 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Upload className="h-4 w-4" />
                      {posterUploading ? "Uploading..." : "Choose poster"}
                    </button>
                    {posterAssetUrl ? (
                      <button
                        type="button"
                        onClick={() => setPosterAssetUrl("")}
                        className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
                      >
                        <X className="h-4 w-4" />
                        Remove poster
                      </button>
                    ) : null}
                  </div>
                  {posterAssetUrl ? (
                    <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-zinc-200 bg-white">
                      <img src={posterAssetUrl} alt="Selected event poster" className="h-44 w-full object-cover" />
                    </div>
                  ) : null}
                </section>
              </div>

              {formError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900">{formError}</div> : null}

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
                    setPosterAssetUrl("");
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
                    <p>
                      <span className="font-bold text-white">Date:</span> {fieldValueAsText(previewDate)}
                    </p>
                    <p>
                      <span className="font-bold text-white">Venue:</span> {fieldValueAsText(previewLocation)}
                    </p>
                    <p>
                      <span className="font-bold text-white">Ticket mode:</span> {fieldValueAsText(previewTicketMode)}
                    </p>
                    <p>
                      <span className="font-bold text-white">Price:</span> {previewPrice}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
