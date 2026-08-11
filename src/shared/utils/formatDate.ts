import { DEFAULT_DATE_LOCALE } from '../constants/app';

export function formatDate(value: string | number | Date, locale: string = DEFAULT_DATE_LOCALE): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
