export const EVENT_ATTENDANCE_MODE_BY_LABEL = {
  "in person": "https://schema.org/OfflineEventAttendanceMode",
  online: "https://schema.org/OnlineEventAttendanceMode",
  hybrid: "https://schema.org/MixedEventAttendanceMode",
} as const;

export function normalizeEventDeliveryMode(value: unknown): "In Person" | "Online" | "Hybrid" | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();

  if (normalized === "in person" || normalized === "in-person" || normalized === "in_person") {
    return "In Person";
  }
  if (normalized === "online") return "Online";
  if (normalized === "hybrid") return "Hybrid";
  return null;
}

export function getEventAttendanceMode(specValues: Record<string, unknown> | null | undefined) {
  const raw =
    specValues?.delivery_mode ??
    specValues?.event_delivery_mode ??
    specValues?.attendance_mode;

  const mode = normalizeEventDeliveryMode(raw);
  if (!mode) return undefined;

  return EVENT_ATTENDANCE_MODE_BY_LABEL[mode.toLowerCase() as keyof typeof EVENT_ATTENDANCE_MODE_BY_LABEL];
}
