import { DEFAULT_CURRENCY } from '../constants/app';

const currencySymbols: Record<string, string> = {
  MWK: 'MK',
  USD: '$',
  GBP: '£',
  EUR: '€',
};

export function formatMoney(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const symbol = currencySymbols[currency.toUpperCase()] ?? currency.toUpperCase();

  return `${symbol} ${formatter.format(safeAmount)}`;
}
