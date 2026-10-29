import { useOfflineState, renewSources, reportStorageError } from '../offline/store';
import { encodeBackup } from '../offline/compression';
import { Button } from './ui/Button';
export function OfflineStatus() {
  const state = useOfflineState();
  const stale = state.snapshots.some((s) => s.expiresAt <= Date.now());
  const reconnect = Object.entries(state.statuses)
    .filter(([, s]) => s === 'reconnect')
    .map(([name]) => name);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
      <span role="status">
        {state.writesPending
          ? 'Ukladám zmenu…'
          : state.error
            ? 'Úložisko vyžaduje pozornosť'
            : !state.ready
              ? 'Načítavam lokálne dáta…'
              : state.snapshots.length || state.overrides.length
                ? 'Uložené na tomto zariadení'
                : 'Lokálne úložisko pripravené'}
        {stale ? ' · Zastarané metadáta, offline kópia zostáva dostupná' : ''}
        {state.operations.length ? ` · ${state.operations.length} čakajúcich úloh` : ''}
      </span>
      {reconnect.length > 0 && <span>Vyžaduje pripojenie: {reconnect.join(', ')}</span>}
      <Button variant="outline" size="sm" onClick={() => void renewSources(true)}>
        Obnoviť zdroje
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          void (async () => {
            try {
              const packed = await encodeBackup({ snapshots: state.snapshots, overrides: state.overrides });
              const url = URL.createObjectURL(packed.blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `h4ck3d-backup.json${packed.encoding === 'gzip' ? '.gz' : ''}`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch {
              reportStorageError('Zálohu sa nepodarilo vytvoriť. Uložené dáta zostali nezmenené.');
            }
          })()
        }
        disabled={!state.ready || state.writesPending > 0}
      >
        Exportovať lokálnu zálohu
      </Button>
      {state.operations.some((op) => op.status === 'error' || op.status === 'blocked') && (
        <span role="alert">Obnovenie zlyhalo alebo vyžaduje pripojenie. Skús znova.</span>
      )}
    </div>
  );
}
