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

export function nextMonthKey(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return toMonthKey(new Date(year, monthNumber, 1));
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

/** `28 sept 2026`. */
export function formatDayWithYear(day: string): string {
  return parseDay(day)
    .toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace('.', '');
}

/** `YYYY-MM-DD` for a date, in local time. */
export function toDayKey(date: Date): string {
  return `${toMonthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayKey(): string {
  return toDayKey(new Date());
}

/** The last `count` months as `YYYY-MM`, newest first, starting at `from`. */
export function recentMonths(from: string, count: number): string[] {
  const months = [from];
  while (months.length < count) months.push(previousMonthKey(months[months.length - 1]));
  return months;
}

/**
 * Reads what a person types in an amount field: `64,37`, `1.234,56` or `64.37`.
 * Returns null when it is not a number.
 */
export function parseAmount(text: string): number | null {
  const trimmed = text.trim().replace(/\s/g, '');
  if (!trimmed) return null;
  // With a comma, dots are thousands separators; without one, a dot is the decimal point.
  const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed;
  if (!/^\d*\.?\d+$|^\d+\.$/.test(normalized)) return null;
  return Number(normalized);
}

/** `64,37`: a stored amount as it is edited in the amount field. */
export function formatAmountInput(value: number): string {
  return value.toFixed(2).replace('.', ',');
}
