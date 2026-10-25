import { validOperation } from './db';
import { database, generationOf, saveSnapshot, type Operation, type Override, type Source } from './db';
import { localToProject } from '../lib/sources';
import { isLocalProject } from '../lib/validation';
import { fetchWithTimeout } from '../lib/request';
import type { Project } from '../data/projects';

export class SyncFailure extends Error {
  constructor(
    message: string,
    public status?: number,
    public retryAfter?: number,
  ) {
    super(message);
  }
}
export function retryAfterMs(value: string | null, now = Date.now()) {
  if (!value) return undefined;
  const n = Number(value);
  const ms = Number.isFinite(n) ? n * 1000 : Date.parse(value) - now;
  return Number.isFinite(ms) ? Math.max(0, ms) : undefined;
}
export function backoff(attempt: number, random = Math.random, retryAfter?: number) {
  return Math.max(
    retryAfter ?? 0,
    Math.min(60_000, 1000 * 2 ** Math.min(attempt, 6)) * (0.75 + random() * 0.5),
  );
}
export interface RemoteSyncAdapter {
  readonly userId: string;
  push(
    operation: { idempotencyKey: string; userId: string; change: Override },
    signal: AbortSignal,
  ): Promise<{ acknowledgedRevision: Override['revision']; conflict?: Override }>;
  pull(
    cursor: string | null,
    signal: AbortSignal,
  ): Promise<{
    changes: Override[];
    cursor: string;
    tombstones: { identity: string; revision: Override['revision'] }[];
  }>;
}
export type Refresh = (signal: AbortSignal) => Promise<Project[]>;
const refreshers = new Map<Source, Refresh>();
const controllers = new Map<Source, AbortController>();
export function registerRefresh(source: Source, refresh: Refresh) {
  controllers.get(source)?.abort();
  refreshers.set(source, refresh);
}
export function forgetRefresh(source: Source) {
  controllers.get(source)?.abort();
  controllers.delete(source);
  refreshers.delete(source);
}
export function canRefresh(source: Source) {
  return source === 'Local' || refreshers.has(source);
}
export async function enqueueLocalRefresh(force = false) {
  const db = await database();
  const tx = db.transaction(['outbox', 'sourceSnapshots', 'syncMeta'], 'readwrite');
  const snapshot = await tx.objectStore('sourceSnapshots').get('Local');
  if (snapshot?.endpoint) {
    const existing = await tx.objectStore('outbox').get('refresh:Local');
    if (!existing || (force && (existing.status === 'error' || existing.status === 'blocked')))
      await tx.objectStore('outbox').put({
        id: 'refresh:Local',
        kind: 'refresh-local',
        source: 'Local',
        generation: Number((await tx.objectStore('syncMeta').get('generation:Local'))?.value ?? 0),
        status: 'pending',
        attempts: 0,
        nextAttemptAt: 0,
        leaseUntil: 0,
        fence: (existing?.fence ?? 0) + 1,
      });
  }
  await tx.done;
}
export async function claimOperation(id: string, owner: string, now = Date.now()) {
  const db = await database();
  const tx = db.transaction('outbox', 'readwrite');
  const op = await tx.store.get(id);
  if (
    !op ||
    !validOperation(op) ||
    op.status === 'blocked' ||
    op.status === 'error' ||
    op.nextAttemptAt > now ||
    (op.status === 'running' && op.leaseUntil > now)
  ) {
    await tx.done;
    return undefined;
  }
  const claimed: Operation = {
    ...op,
    status: 'running',
    leaseOwner: owner,
    leaseUntil: now + 60_000,
    fence: op.fence + 1,
  };
  await tx.store.put(claimed);
  await tx.done;
  return claimed;
}
async function completeLocal(op: Operation, projects: Project[], endpoint: string) {
  const db = await database();
  const tx = db.transaction(['outbox', 'sourceSnapshots', 'syncMeta'], 'readwrite');
  const current = await tx.objectStore('outbox').get(op.id);
  const generation = Number((await tx.objectStore('syncMeta').get('generation:Local'))?.value ?? 0);
  if (
    current &&
    current.leaseOwner === op.leaseOwner &&
    current.fence === op.fence &&
    generation === op.generation &&
    current.leaseUntil > Date.now()
  ) {
    const now = Date.now();
    await tx.objectStore('sourceSnapshots').put({
      source: 'Local',
      projects,
      fetchedAt: now,
      expiresAt: now + 86_400_000,
      schemaVersion: 1,
      generation,
      endpoint,
    });
    await tx.objectStore('outbox').delete(op.id);
  }
  await tx.done;
}
export async function failOperation(op: Operation, error: unknown, now = Date.now()) {
  const db = await database();
  const tx = db.transaction('outbox', 'readwrite');
  const current = await tx.store.get(op.id);
  if (current && current.leaseOwner === op.leaseOwner && current.fence === op.fence) {
    const status = error instanceof SyncFailure ? error.status : undefined;
    const attempts = current.attempts + 1;
    const blocked = status === 401 || status === 403;
    const permanent = status !== undefined && status >= 400 && status < 500 && status !== 429;
    await tx.store.put({
      ...current,
      status: blocked ? 'blocked' : attempts >= 5 || permanent ? 'error' : 'pending',
      attempts,
      leaseUntil: 0,
      nextAttemptAt:
        now + backoff(attempts - 1, Math.random, error instanceof SyncFailure ? error.retryAfter : undefined),
    });
  }
  await tx.done;
}
export function localEndpoint(input: string) {
  const u = new URL(input);
  if (
    !['http:', 'https:'].includes(u.protocol) ||
    !['localhost', '127.0.0.1'].includes(u.hostname) ||
    u.username ||
    u.password ||
    u.pathname !== '/' ||
    u.search ||
    u.hash
  )
    throw new Error('Skener musí používať loopback origin bez prihlasovacích údajov.');
  return u.origin;
}
export async function processLocalQueue(owner: string) {
  const db = await database();
  for (const pending of await db.getAll('outbox')) {
    // Remote operations intentionally remain unacknowledged without a real authenticated adapter.
    if (!validOperation(pending) || pending.kind !== 'refresh-local') continue;
    const op = await claimOperation(pending.id, owner);
    if (!op) continue;
    try {
      const snapshot = await db.get('sourceSnapshots', 'Local');
      if (!snapshot?.endpoint) throw new SyncFailure('Pripoj lokálny skener.', 401);
      const endpoint = localEndpoint(snapshot.endpoint);
      const response = await fetchWithTimeout(`${endpoint}/api/local/projects`);
      if (!response.ok)
        throw new SyncFailure(
          'Obnovenie skenera zlyhalo.',
          response.status,
          retryAfterMs(response.headers.get('retry-after')),
        );
      const data: unknown = await response.json();
      const list = Array.isArray(data)
        ? data
        : data && typeof data === 'object' && 'projects' in data
          ? data.projects
          : null;
      if (!Array.isArray(list) || !list.every(isLocalProject)) throw new SyncFailure('Neplatný import.', 422);
      await completeLocal(op, list.map(localToProject), endpoint);
    } catch (error) {
      await failOperation(op, error);
    }
  }
}
/** Foreground authenticated refreshes use a DB lease and generation fence, but never persist credentials. */
export async function refreshSource(source: Source, owner: string, force = false) {
  if (source === 'Local') {
    if (!(await (await database()).get('sourceSnapshots', 'Local'))?.endpoint)
      throw new SyncFailure('Pripoj lokálny skener.', 401);
    await enqueueLocalRefresh(force);
    await processLocalQueue(owner);
    return;
  }
  const refresh = refreshers.get(source);
  if (!refresh) throw new SyncFailure('Vyžaduje opätovné pripojenie zdroja.', 401);
  const db = await database();
  const tx = db.transaction('syncMeta', 'readwrite');
  const key = `lease:${source}`;
  const existing = await tx.store.get(key);
  let lease: { owner: string; until: number } | undefined;
  try {
    lease = JSON.parse(String(existing?.value ?? 'null')) as typeof lease;
  } catch {
    /* expired invalid lease */
  }
  if (lease && lease.until > Date.now()) {
    await tx.done;
    return;
  }
  const token = crypto.randomUUID();
  await tx.store.put({ key, value: JSON.stringify({ owner: token, until: Date.now() + 60_000 }) });
  await tx.done;
  const generation = await generationOf(source);
  const controller = new AbortController();
  controllers.set(source, controller);
  const deadline = setTimeout(() => controller.abort(), 50_000);
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const projects = await refresh(controller.signal);
        if (!controller.signal.aborted)
          await saveSnapshot(source, projects, generation, undefined, { key, owner: token });
        return;
      } catch (error) {
        if (controller.signal.aborted) {
          if ((await generationOf(source)) !== generation) return;
          throw new SyncFailure('Obnovenie prekročilo časový limit.');
        }
        if (error instanceof SyncFailure && (error.status === 401 || error.status === 403)) {
          forgetRefresh(source);
          throw error;
        }
        if (
          attempt === 2 ||
          (error instanceof SyncFailure &&
            error.status !== undefined &&
            error.status < 500 &&
            error.status !== 429)
        )
          throw error;
        const delay = backoff(
          attempt,
          Math.random,
          error instanceof SyncFailure ? error.retryAfter : undefined,
        );
        // Long Retry-After is deferred to a later foreground trigger rather than holding a lease.
        if (delay > 30_000) {
          await db.put('syncMeta', { key: `retry:${source}`, value: Date.now() + delay });
          throw error;
        }
        await new Promise<void>((resolve, reject) => {
          const done = () => {
            clearTimeout(timer);
            controller.signal.removeEventListener('abort', abort);
          };
          const abort = () => {
            done();
            reject(new DOMException('Aborted', 'AbortError'));
          };
          const timer = setTimeout(() => {
            done();
            resolve();
          }, delay);
          controller.signal.addEventListener('abort', abort, { once: true });
        });
      }
    }
  } finally {
    clearTimeout(deadline);
    const release = db.transaction('syncMeta', 'readwrite');
    const value = await release.store.get(key);

    try {
      if (JSON.parse(String(value?.value ?? '{}')).owner === token) await release.store.delete(key);
    } catch {
      /* no owned lease */
    }
    await release.done;
    if (controllers.get(source) === controller) controllers.delete(source);
  }
}
