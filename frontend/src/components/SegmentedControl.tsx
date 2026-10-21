type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** A few mutually exclusive choices side by side, e.g. expense / income / transfer. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-control border border-line bg-bg p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={`h-10 rounded-[8px] text-[14px] font-medium ${
            option.value === value ? 'border border-line bg-surface text-text' : 'text-text-2'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
