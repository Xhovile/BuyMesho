export const CAT_TIME_ZONE = 'Africa/Blantyre';

export function getNextCatMidnightMs(referenceAt: string | number | Date = Date.now()): number {
  const referenceDate = new Date(referenceAt);
  if (Number.isNaN(referenceDate.getTime())) return Date.now();

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAT_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(referenceDate);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return Date.now();
  }

  return Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0);
}

export function getCountdownParts(targetMs: number, nowMs: number = Date.now()) {
  const diffMs = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return { diffMs, days, hours, minutes, seconds };
}

export function canReleaseEscrow(referenceAt: string | number | Date = Date.now()): boolean {
  return Date.now() >= getNextCatMidnightMs(referenceAt);
}
