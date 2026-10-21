export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`animate-pulse rounded-control bg-sunken ${className}`} />
  );
}

export function LoadError({ what }: { what: string }) {
  return <p className="text-[13px] text-negative">No se pudo cargar {what}.</p>;
}
