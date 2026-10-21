import { CircleAlert, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'negative' | 'offline';

const TONES: Record<Tone, string> = {
  negative: 'bg-sunken text-negative',
  offline: 'bg-sunken text-text-2',
};

/** An inline message that sits where the problem can be fixed. */
export function Notice({
  tone,
  children,
  action,
}: {
  tone: Tone;
  children: ReactNode;
  action?: ReactNode;
}) {
  const Icon = tone === 'offline' ? WifiOff : CircleAlert;
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control px-4 py-3 text-[14px] ${TONES[tone]}`}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">{children}</p>
      {action}
    </div>
  );
}
