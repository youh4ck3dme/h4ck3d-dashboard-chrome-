import type { InputHTMLAttributes, ReactNode } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
}

export function TextField({ label, hint, className = '', ...props }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <input
        className={`h-11 w-full rounded-md border border-border bg-app px-3 text-sm text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-white/30 lg:h-8 ${className}`}
        autoComplete="off"
        spellCheck={false}
        {...props}
      />

      {hint && <span className="text-xs text-placeholder">{hint}</span>}
    </label>
  );
}
