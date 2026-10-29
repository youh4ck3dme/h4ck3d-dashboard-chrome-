import { SearchX } from 'lucide-react';
import { t } from '../lib/i18n';
import { Button } from './ui/Button';

interface EmptyStateProps {
  onClear: () => void;
}

export function EmptyState({ onClear }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface">
        <SearchX className="h-5 w-5 text-muted" />
      </div>
      <h3 className="mb-1 text-base font-medium text-primary">{t.empty.title}</h3>
      <p className="mb-6 max-w-sm text-sm text-muted">{t.empty.description}</p>
      <Button variant="outline" onClick={onClear}>
        {t.empty.action}
      </Button>
    </div>
  );
}
