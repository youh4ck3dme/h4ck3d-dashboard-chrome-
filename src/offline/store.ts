import { requestBackgroundSync } from './background';
import { enqueueLocalRefresh } from './engine';
import { useSyncExternalStore } from 'react';
import type { Project } from '../data/projects';
import {
  database,
  disconnectSource,
  identities,
  latestOverride,
  migrateLegacy,
  readLocal,
  saveSnapshot,
  setRoadmap,
  type Operation,
  type Override,
  type Snapshot,
  type Source,
} from './db';
import { canRefresh, forgetRefresh, processLocalQueue, refreshSource, SyncFailure } from './engine';

export type SourceStatus = 'local' | 'refreshing' | 'reconnect' | 'error';
interface State {
  ready: boolean;
  writesPending: number;
  snapshots: Snapshot[];
  overrides: Override[];
  operations: Operation[];
  error: string | null;
  statuses: Partial<Record<Source, SourceStatus>>;
}
let state: State = {
  ready: false,
  writesPending: 0,
  snapshots: [],
  overrides: [],
  operations: [],
  error: null,
  statuses: {},
};
const listeners = new Set<() => void>();
const actor = crypto.randomUUID();
let activeWrites = 0;
let started = false;
let reloading = 0;
let channel: BroadcastChannel | undefined;
const emit = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
function notify() {
  channel?.postMessage('changed');
  try {
    localStorage.setItem('h4ck3d:offline:signal', crypto.randomUUID());
  } catch {
    /* BroadcastChannel/focus still work */
  }
}
export async function reloadLocal() {
  const sequence = ++reloading;
  try {
    const value = await readLocal();
    if (sequence === reloading) emit({ ...value, ready: true });
  } catch {
    emit({
      ready: true,
      error:
        'Úložisko nie je dostupné. Zmeny nie sú trvalo uložené. Skús znova alebo uvoľni miesto v prehliadači.',
    });
  }
}
export async function startOffline() {
  if (started) return;
  started = true;
  window.addEventListener(
    'h4ck3d:storage-blocked',
    () => emit({ ready: true, error: 'Zavri staršie karty aplikácie, aby sa mohla aktualizovať databáza.' }),
    { once: true },
  );
  try {
    const result = await migrateLegacy(localStorage);
    if (result.invalid)
      emit({ error: 'Niektoré staré záznamy sú poškodené. Pôvodné hodnoty zostali zachované.' });
    await reloadLocal();
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('h4ck3d:offline');
      channel.onmessage = () => void reloadLocal();
    }
    window.addEventListener('storage', (event) => {
      if (event.key === 'h4ck3d:offline:signal') void reloadLocal();
      if (
        event.newValue !== null &&
        (event.key?.startsWith('h4ck3d:v1:source:') || event.key?.startsWith('h4ck3d:roadmap:'))
      )
        emit({
          error:
            'Staršia karta používa pôvodné úložisko. Zavri ju a znova otvor aplikáciu pred ďalšími zmenami.',
        });
    });
    window.addEventListener('online', () => void renewSources());
    window.addEventListener('focus', () => {
      void reloadLocal().then(() => renewSources());
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void reloadLocal().then(() => renewSources());
    });
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data === 'h4ck3d:sync-complete') void reloadLocal();
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') void renewSources();
    }, 30_000);
    void renewSources();
  } catch {
    started = false;
    emit({
      ready: true,
      error: 'Migrácia alebo uloženie zlyhalo. Pôvodné dáta neboli vymazané. Skús znova.',
    });
  }
}
export function useOfflineState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => state,
  );
}
export async function importSnapshot(source: Source, projects: Project[], endpoint?: string) {
  emit({ writesPending: ++activeWrites });
  try {
    await saveSnapshot(source, projects, undefined, endpoint);
    await reloadLocal();
    emit({ error: null, statuses: { ...state.statuses, [source]: 'local' } });
    notify();
    return true;
  } catch {
    emit({ error: 'Import sa nepodarilo uložiť. Dáta nie sú bezpečne uložené na zariadení.' });
    return false;
  } finally {
    emit({ writesPending: --activeWrites });
  }
}
export async function clearOfflineSource(source: Source) {
  forgetRefresh(source);
  emit({ writesPending: ++activeWrites });
  try {
    await disconnectSource(source);
    await reloadLocal();
    emit({ statuses: { ...state.statuses, [source]: 'local' } });
    notify();
  } catch {
    emit({ error: 'Odpojenie sa nepodarilo uložiť. Skús znova.' });
  } finally {
    emit({ writesPending: --activeWrites });
  }
}
const optimistic = new Map<string, { token: string; value: boolean }>();
export function roadmapValue(p: Project) {
  return (
    optimistic.get(identities(p)[0])?.value ??
    latestOverride(state.overrides, identities(p))?.roadmap ??
    false
  );
}
export async function updateRoadmap(p: Project, value: boolean) {
  const key = identities(p)[0];
  const token = crypto.randomUUID();
  optimistic.set(key, { token, value });
  emit({ error: null, writesPending: ++activeWrites });
  try {
    await setRoadmap(p, value, actor);
  } catch {
    emit({ error: 'Roadmap sa nepodarilo uložiť. Zmena bola vrátená; skús znova alebo uvoľni miesto.' });
  } finally {
    if (optimistic.get(key)?.token === token) optimistic.delete(key);
    await reloadLocal();
    emit({ writesPending: --activeWrites });
    notify();
  }
}
let renewing: Promise<void> | undefined;
export function renewSources(force = false) {
  renewing ??= (async () => {
    const db = await database();
    for (const snapshot of (await readLocal()).snapshots) {
      if (!canRefresh(snapshot.source)) {
        emit({ statuses: { ...state.statuses, [snapshot.source]: 'reconnect' } });
        continue;
      }
      const retryAt = Number((await db.get('syncMeta', `retry:${snapshot.source}`))?.value ?? 0);
      const requested = (await db.get('syncMeta', `refresh-requested:${snapshot.source}`))?.value === 1;
      if (!force && !requested && snapshot.expiresAt > Date.now()) continue;
      if (!force && retryAt > Date.now()) continue;
      if (force) await db.put('syncMeta', { key: `refresh-requested:${snapshot.source}`, value: 1 });
      if (snapshot.source === 'Local' && snapshot.endpoint) await enqueueLocalRefresh(force);
      if (navigator.onLine === false) continue;
      emit({ statuses: { ...state.statuses, [snapshot.source]: 'refreshing' } });
      try {
        await refreshSource(snapshot.source, actor, force);
        await db.delete('syncMeta', `refresh-requested:${snapshot.source}`);
        emit({ statuses: { ...state.statuses, [snapshot.source]: 'local' } });
      } catch (error) {
        emit({
          statuses: {
            ...state.statuses,
            [snapshot.source]:
              error instanceof SyncFailure && (error.status === 401 || error.status === 403)
                ? 'reconnect'
                : 'error',
          },
        });
        // Bound repeated focus/online failures even after foreground retries are exhausted.
        if (!(error instanceof SyncFailure && (error.status === 401 || error.status === 403)))
          await db.put('syncMeta', {
            key: `retry:${snapshot.source}`,
            value: Math.max(
              retryAt,
              Number((await db.get('syncMeta', `retry:${snapshot.source}`))?.value ?? 0),
              Date.now() + 60_000,
            ),
          });
      }
    }
    if (navigator.onLine !== false) await processLocalQueue(actor);
    await reloadLocal();
    notify();
    if (state.operations.some((op) => op.status === 'pending')) {
      const registration = await navigator.serviceWorker?.getRegistration();
      await requestBackgroundSync(
        registration as
          (ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }) | undefined,
      );
    }
  })()
    .catch(() => emit({ error: 'Obnovenie zlyhalo. Posledné uložené dáta zostávajú dostupné.' }))
    .finally(() => {
      renewing = undefined;
    });
  return renewing;
}

export function reportStorageError(message: string) {
  emit({ error: message });
}
