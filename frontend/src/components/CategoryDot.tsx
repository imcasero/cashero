type CategoryDotProps = {
  /** Category colour; falls back to the neutral slate. */
  color?: string | null;
  className?: string;
};

export function CategoryDot({ color, className = '' }: CategoryDotProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color ?? 'var(--color-cat-pizarra)' }}
    />
  );
}
