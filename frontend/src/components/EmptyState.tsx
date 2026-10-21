import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

/** What a screen shows instead of its content: what will go here, and the next step. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-control bg-surface text-text-2">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="text-[17px] font-semibold">{title}</h2>
      <p className="max-w-sm text-[14px] text-text-2">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
