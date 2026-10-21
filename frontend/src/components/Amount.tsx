import { formatEur } from '../lib/format';

type Tone = 'auto' | 'neutral';

type AmountProps = {
  value: number;
  /** `auto` colours by sign (green/orange); `neutral` keeps the text colour. */
  tone?: Tone;
  /** Prefix positive values with `+`. */
  signed?: boolean;
  className?: string;
};

/** A money figure in the mono face, tabular so columns line up. */
export function Amount({ value, tone = 'auto', signed = false, className = '' }: AmountProps) {
  const color =
    tone === 'neutral' || value === 0 ? '' : value > 0 ? 'text-positive' : 'text-negative';

  return (
    <span className={`font-mono font-medium tabular-nums whitespace-nowrap ${color} ${className}`}>
      {formatEur(value, { signed })}
    </span>
  );
}
