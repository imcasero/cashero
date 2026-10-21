import type { ComponentProps } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent',
  secondary: 'border border-line text-text hover:bg-sunken',
  danger: 'border border-negative text-negative hover:bg-sunken',
};

type ButtonProps = ComponentProps<'button'> & {
  variant?: Variant;
  /** Fill the row instead of fitting the label. */
  block?: boolean;
};

export function Button({
  variant = 'primary',
  block = false,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-control px-5 font-semibold disabled:cursor-not-allowed disabled:border-transparent disabled:bg-sunken disabled:text-text-3 ${
        VARIANTS[variant]
      } ${block ? 'w-full' : ''} ${className}`}
      {...props}
    />
  );
}
