import { useOfflineState, startOffline, renewSources } from '../offline/store';
import { Button } from './ui/Button';
export function StorageProblem() {
  const { error } = useOfflineState();
  if (!error) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-16 z-[100] mx-auto max-w-xl rounded-lg border border-border bg-surface p-4 text-sm text-primary shadow-xl"
    >
      <p>{error}</p>
      <Button variant="outline" size="sm" onClick={() => void startOffline().then(() => renewSources(true))}>
        Skúsiť znova
      </Button>
    </div>
  );
}
