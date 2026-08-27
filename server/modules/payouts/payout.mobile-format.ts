export function normalizePayChanguMobileNumber(value: unknown): string {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/\D+/g, '');

  if (digits.length === 9) return digits;
  if (digits.length === 10 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith('265')) return digits.slice(3);

  throw new Error('PayChangu mobile payout requires a valid Malawi mobile number with nine digits');
}
