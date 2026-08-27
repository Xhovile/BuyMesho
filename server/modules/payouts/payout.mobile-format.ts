function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

/** Normalize a Malawi mobile number to PayChangu's 9-digit subscriber format. */
export function normalizePayChanguMobile(value: unknown): string {
  if (value === null || value === undefined) throw new Error('mobile is required');

  const raw = String(value).trim();
  if (!raw) throw new Error('mobile is required');

  const digits = onlyDigits(raw);

  if (digits.length === 9) return digits;
  if (digits.length === 10 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith('265')) return digits.slice(3);

  throw new Error('mobile must be a valid Malawi number for PayChangu payout');
}
