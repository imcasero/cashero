type Tone = 'ok' | 'warning' | 'over';

const FILL: Record<Tone, string> = {
  ok: 'bg-bar',
  warning: 'bg-warning',
  over: 'bg-negative',
};

type ProgressBarProps = {
  /** 0..1 is the bar's fill; anything above 1 is clamped to full. */
  ratio: number;
  tone: Tone;
  label: string;
};

export function ProgressBar({ ratio, tone, label }: ProgressBarProps) {
  const width = Math.min(Math.max(ratio, 0), 1) * 100;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
      className="h-2 overflow-hidden rounded-full bg-sunken"
    >
      <div className={`h-full rounded-full ${FILL[tone]}`} style={{ width: `${width}%` }} />
    </div>
  );
}
