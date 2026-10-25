import { SearchX } from 'lucide-react';
import { Button } from './ui/Button';
interface EmptyStateProps {
  onClear: () => void;
}
export function EmptyState({ onClear }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface">
        <SearchX className="h-5 w-5 text-muted" />
      </div>
      <h3 className="mb-1 text-base font-medium text-primary">No projects match these filters.</h3>
      <p className="mb-6 max-w-sm text-sm text-muted">
        Try adjusting your search or filter criteria to find what you're looking for.
      </p>
      <Button variant="outline" onClick={onClear}>
        Clear all filters
      </Button>
    </div>
  );
}
