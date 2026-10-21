type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name; the visible "Activa" / "En pausa" text sits next to the switch. */
  label: string;
  disabled?: boolean;
};

/** An on/off switch. The button is 44px wide for touch; the track inside is what is drawn. */
export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="grid h-11 w-14 shrink-0 place-items-center disabled:opacity-60"
    >
      <span
        className={`relative block h-7 w-12 rounded-full border ${
          checked ? 'border-transparent bg-accent' : 'border-line bg-sunken'
        }`}
      >
        <span
          className={`absolute top-1/2 size-5 -translate-y-1/2 rounded-full ${
            checked ? 'right-1 bg-on-accent' : 'left-1 bg-text-3'
          }`}
        />
      </span>
    </button>
  );
}
