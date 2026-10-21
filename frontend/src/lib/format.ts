const MINUS = '−';

const euro = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  // es-ES skips the thousands separator on 4-digit numbers by default; the design always shows it.
  useGrouping: 'always',
});

const percent = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `24.427,87 €`. With `signed`, adds an explicit `+` and uses a true minus sign. */
export function formatEur(value: number, { signed = false } = {}): string {
  const cents = Math.round(Math.abs(value) * 100) / 100;
  const body = euro.format(cents);
  if (cents === 0) return body;
  if (value < 0) return `${MINUS}${body}`;
  return signed ? `+${body}` : body;
}

/** `2,50` for a rate stored as 2.5. */
export function formatPercent(value: number): string {
  return percent.format(value);
}

/** `YYYY-MM` for a date, in local time. */
export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonthKey(): string {
  return toMonthKey(new Date());
}

export function previousMonthKey(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return toMonthKey(new Date(year, monthNumber - 2, 1));
}

/** First and last day of a `YYYY-MM` month as `YYYY-MM-DD`. */
export function monthRange(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` };
}

/** Parses `YYYY-MM-DD` as a local date (new Date(string) would read it as UTC). */
export function parseDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

/** `octubre`. */
export function monthName(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('es-ES', { month: 'long' });
}

/** `Octubre de 2026`. */
export function monthLabel(month: string): string {
  const name = monthName(month);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${month.slice(0, 4)}`;
}

/** `13 oct`. */
export function formatShortDay(day: string): string {
  return parseDay(day)
    .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    .replace('.', '');
}
