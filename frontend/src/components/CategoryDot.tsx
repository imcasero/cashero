type CategoryDotProps = {
  /** Category colour; falls back to the neutral slate. */
  color?: string | null;
  /** The budgets list marks categories with a rounded square instead of a dot. */
  square?: boolean;
  className?: string;
};

export function CategoryDot({ color, square = false, className = '' }: CategoryDotProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${square ? 'size-3 rounded-[3px]' : 'size-2 rounded-full'} ${className}`}
      style={{ backgroundColor: color ?? 'var(--color-cat-pizarra)' }}
    />
  );
}
