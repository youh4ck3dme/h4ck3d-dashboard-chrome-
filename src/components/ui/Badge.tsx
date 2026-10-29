import type { ReactNode } from 'react';
interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'status';
  statusType?: 'outline' | 'filled';
}
export function Badge({ children, variant = 'default', statusType }: BadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
      {variant === 'status' && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${statusType === 'filled' ? 'bg-muted' : 'border border-muted'}`}
        />
      )}
      {children}
    </span>
  );
}
