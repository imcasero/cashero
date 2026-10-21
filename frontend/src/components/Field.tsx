import { ChevronDown, CircleAlert } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

const CONTROL =
  'h-12 w-full rounded-control border border-line bg-bg px-4 text-[16px] text-text placeholder:text-text-3 aria-invalid:border-negative';

/** A label above a control, with the field's error underneath. */
export function Field({
  label,
  error,
  className = '',
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-2">
        {label}
        {children}
      </label>
      <FieldError message={error} />
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[13px] text-negative">
      <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

export function TextInput({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`${CONTROL} font-normal ${className}`} {...props} />;
}

/** A native select with the design's chevron instead of the browser's. */
export function Select({ className = '', children, ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative block">
      <select className={`${CONTROL} appearance-none pr-10 font-normal ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-2"
        aria-hidden="true"
      />
    </span>
  );
}

/** An input with a unit (`€`, `%`) sitting inside its right edge. */
export function UnitInput({
  unit,
  ...props
}: { unit: string } & Omit<ComponentProps<typeof TextInput>, 'className'>) {
  return (
    <span className="relative block">
      <TextInput
        inputMode="decimal"
        autoComplete="off"
        className="pr-10 text-right font-mono"
        {...props}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-text-2"
      >
        {unit}
      </span>
    </span>
  );
}
