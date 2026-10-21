import { parseAmount } from '../../lib/format';

/** The surplus the example card splits, as in the design. */
export const EXAMPLE_SURPLUS = 1000;

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Reads a percentage field. An empty field is 0 (the account gets nothing); null means the text is
 * not a percentage between 0 and 100.
 */
export function parseShare(text: string): number | null {
  if (!text.trim()) return 0;
  const value = parseAmount(text);
  if (value === null || value > 100) return null;
  // The database keeps two decimals, so that is the precision that gets compared and sent.
  return round2(value);
}

/** A stored share as it is edited: `50`, `12,5`, and empty for 0. */
export function formatShareInput(value: number): string {
  return value === 0 ? '' : String(value).replace('.', ',');
}

/** Sum of the shares, rounded to the precision the backend checks against 100. */
export function totalShare(shares: number[]): number {
  return round2(shares.reduce((sum, share) => sum + share, 0));
}

export type ExampleLine = { accountId: string; amount: number };

/**
 * What a close would do with a surplus: each account gets its share (rounded to cents, like the
 * backend does), and whatever is not handed out stays in the primary account.
 */
export function splitSurplus(
  surplus: number,
  shares: { accountId: string; share: number }[],
): { lines: ExampleLine[]; stays: number } {
  const lines = shares
    .filter(({ share }) => share > 0)
    .map(({ accountId, share }) => ({ accountId, amount: round2((surplus * share) / 100) }));
  const stays = round2(surplus - lines.reduce((sum, line) => sum + line.amount, 0));
  return { lines, stays };
}

/**
 * Fill of each segment of the stacked bar: shades of the bar colour, one per account, fading into
 * the background. The primary account takes the accent.
 */
export function segmentColor(index: number | 'primary'): string {
  if (index === 'primary') return 'var(--accent)';
  const mix = [100, 76, 56, 40, 28][index % 5];
  return `color-mix(in srgb, var(--bar) ${mix}%, var(--bg))`;
}
