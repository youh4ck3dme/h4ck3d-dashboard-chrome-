import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff, X } from 'lucide-react';
import { Button } from './ui/Button';

const UPDATE_CHECK_MS = 60 * 60 * 1000;

/** Toast shown when a new service-worker version is waiting or the app is ready for offline use. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => {
        if (navigator.onLine) registration.update().catch(() => undefined);
      }, UPDATE_CHECK_MS);
    },
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });

  // "Offline ready" is informational — hide it automatically.
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 4000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;

  const close = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-sm items-center gap-3 rounded-lg border border-border bg-surface-2 p-3 shadow-2xl lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
    >
      {needRefresh ? (
        <RefreshCw className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      ) : (
        <WifiOff className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      )}
      <p className="min-w-0 flex-1 text-xs text-primary">
        {needRefresh ? 'Nová verzia je pripravená.' : 'Aplikácia funguje aj offline.'}
      </p>
      {needRefresh && (
        <Button variant="primary" size="sm" onClick={() => updateServiceWorker(true)}>
          Aktualizovať
        </Button>
      )}
      <Button variant="ghost" size="icon" aria-label="Zavrieť" onClick={close}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
