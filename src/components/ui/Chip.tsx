import type { ButtonHTMLAttributes } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({ active = false, children, className = '', type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={`inline-flex h-11 min-w-[44px] shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full px-3.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 active:scale-95 lg:h-8 ${
        active
          ? 'border border-primary bg-primary text-app'
          : 'border border-border bg-surface text-muted hover:bg-surface-2 hover:text-primary'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
