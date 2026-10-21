import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  /** Right-aligned control, e.g. the "Añadir movimiento" button. */
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[12px] font-semibold tracking-wider text-text-3 uppercase">{eyebrow}</p>
        <h1 className="mt-1 text-[26px] leading-tight font-semibold lg:text-[30px]">{title}</h1>
      </div>
      {action}
    </header>
  );
}
