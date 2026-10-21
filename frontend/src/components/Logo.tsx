export function Logo() {
  return (
    <span className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-control bg-accent text-on-accent">
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M7 9h10M7 12h7M7 15h10" />
        </svg>
      </span>
      <span className="text-[18px] font-semibold">Cashero</span>
    </span>
  );
}
