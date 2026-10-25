import { type ReactNode, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useDialog } from '../../hooks/useDialog';

interface SourcesModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function SourcesModal({ open, onClose, children }: SourcesModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(open, ref, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 hidden items-center justify-center bg-black/60 p-6 lg:flex"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sources-title"
        tabIndex={-1}
        className="flex max-h-[85dvh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-app focus:outline-none"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <h2 id="sources-title" className="text-base font-medium text-primary">
            Zdroje projektov
          </h2>
          <Button variant="ghost" size="icon" aria-label="Zavrieť" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="scroll-y no-scrollbar min-h-0 flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}
