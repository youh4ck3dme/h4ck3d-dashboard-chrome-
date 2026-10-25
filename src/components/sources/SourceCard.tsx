import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, type LucideIcon } from 'lucide-react';
import { Button } from '../ui/Button';
interface SourceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  count: number;
  children: ReactNode;
}
export function SourceCard({ icon: Icon, title, description, count, children }: SourceCardProps) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2">
          <Icon className="h-5 w-5 text-muted" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-primary">{title}</h3>
            {count > 0 && (
              <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                {count} projektov
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
export function SourceConnected({
  text,
  onDisconnect,
  action,
}: {
  text: string;
  onDisconnect: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-xs text-primary">
        <CheckCircle2 className="h-4 w-4 text-muted" aria-hidden />
        {text}
      </span>
      <div className="flex items-center gap-2">
        {action}
        <Button variant="ghost" size="md" onClick={onDisconnect}>
          Odpojiť
        </Button>
      </div>
    </div>
  );
}
export function SourceError({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-border bg-app p-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
      <p className="text-xs leading-relaxed text-muted">{message}</p>
    </div>
  );
}
