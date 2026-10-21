import type { ReactNode } from 'react';

type Tone = 'neutral' | 'accent' | 'close';

const TONES: Record<Tone, string> = {
  neutral: 'bg-sunken text-text-2',
  accent: 'bg-accent text-on-accent',
  close: 'bg-close-soft text-close-text',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
