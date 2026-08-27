function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

/**
 * Convert a Malawi mobile number into PayChangu's 9-digit subscriber format.
 * Accepted inputs include 099xxxxxxx, 26599xxxxxxx, +265 99xxxxxxx,
 * and the already-normalized 9-digit form.
 */
export function normalizePayChanguMobile(value: unknown): string {
  if (value === null || value === undefined) {
    throw new Error('mobile is required');
  }

  const raw = String(value).trim();
  if (!raw) throw new Error('mobile is required');

  const digits = onlyDigits(raw);

  if (digits.length === 9) return digits;
  if (digits.length === 10 && digits.startsWith('0')) return digits.slice(1);

  if (digits.length === 12 && digits.startsWith('265')) {
    const subscriber = digits.slice(3);
    if (subscriber.length === 9) return subscriber;
  }

  throw new Error('mobile must be a valid Malawi number for PayChangu payout');
}
