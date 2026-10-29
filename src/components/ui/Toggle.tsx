interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="group flex min-h-[44px] cursor-pointer items-center justify-between gap-3 lg:min-h-0">
      <span className="text-xs font-medium text-muted transition-colors group-hover:text-primary">
        {label}
      </span>
      <span className="relative">
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden
          className={`block h-4 w-8 rounded-full transition-colors peer-focus-visible:ring-1 peer-focus-visible:ring-white/40 ${
            checked ? 'bg-primary' : 'border border-border bg-surface'
          }`}
        />
        <span
          aria-hidden
          className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full transition-transform ${
            checked ? 'translate-x-4 bg-app' : 'translate-x-0 bg-muted'
          }`}
        />
      </span>
    </label>
  );
}
