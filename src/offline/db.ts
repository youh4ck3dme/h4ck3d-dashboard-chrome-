import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Project } from '../data/projects';
import { isProjectList } from '../lib/validation';

export type Source = 'GitHub' | 'Vercel' | 'Local';
export const SOURCES: Source[] = ['GitHub', 'Vercel', 'Local'];
export const TTL = 24 * 60 * 60 * 1000;
export interface Revision {
  clock: number;
  actor: string;
  operationId: string;
}
export interface Override {
  identity: string;
  roadmap: boolean;
  revision: Revision;
  schemaVersion: 1;
}
export interface Snapshot {
  source: Source;
  projects: Project[];
  fetchedAt: number;
  expiresAt: number;
  schemaVersion: 1;
  generation: number;
  endpoint?: string;
}
export interface Operation {
  id: string;
  kind: 'refresh-local' | 'remote-set';
  source?: Source;
  identity?: string;
  roadmap?: boolean;
  revision?: Revision;
  generation: number;
  status: 'pending' | 'running' | 'blocked' | 'error';
  attempts: number;
  nextAttemptAt: number;
  leaseUntil: number;
  leaseOwner?: string;
  fence: number;
}
interface Meta {
  key: string;
  value: string | number;
}
export interface TimelineDB extends DBSchema {
  sourceSnapshots: { key: Source; value: Snapshot; indexes: { expiresAt: number } };
  projectOverrides: { key: string; value: Override; indexes: { clock: number } };
  outbox: {
    key: string;
    value: Operation;
    indexes: { status: string; nextAttemptAt: number; source: string };
  };
  syncMeta: { key: string; value: Meta };
}
let connection: Promise<IDBPDatabase<TimelineDB>> | undefined;
export function database() {
  connection ??= openDB<TimelineDB>('h4ck3d-timeline', 1, {
    upgrade(db) {
      const snapshots = db.createObjectStore('sourceSnapshots', { keyPath: 'source' });
      snapshots.createIndex('expiresAt', 'expiresAt');
      const overrides = db.createObjectStore('projectOverrides', { keyPath: 'identity' });
      overrides.createIndex('clock', 'revision.clock');
      const queue = db.createObjectStore('outbox', { keyPath: 'id' });
      queue.createIndex('status', 'status');
      queue.createIndex('nextAttemptAt', 'nextAttemptAt');
      queue.createIndex('source', 'source');
      db.createObjectStore('syncMeta', { keyPath: 'key' });
    },
    blocked() {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('h4ck3d:storage-blocked'));
    },
    blocking() {
      void connection?.then((db) => db.close());
      connection = undefined;
    },
    terminated() {
      connection = undefined;
    },
  }).catch((error) => {
    connection = undefined;
    throw error;
  });
  return connection;
}
export async function closeDatabase() {
  const pending = connection;
  connection = undefined;
  if (pending) (await pending).close();
}
export function identities(
  p: Pick<Project, 'id' | 'repoFullName' | 'localPath' | 'identityAliases'>,
): string[] {
  return [
    ...(p.repoFullName ? [`repo:${p.repoFullName.toLowerCase()}`] : []),
    ...(p.localPath ? [`local:${p.localPath}`] : []),
    `id:${p.id}`,
    ...(p.identityAliases ?? []),
  ];
}
export function compareRevision(a: Revision, b: Revision) {
  return (
    a.clock - b.clock ||
    (a.actor < b.actor ? -1 : a.actor > b.actor ? 1 : 0) ||
    (a.operationId < b.operationId ? -1 : a.operationId > b.operationId ? 1 : 0)
  );
}
export interface ConflictStrategy {
  select(local: Override, incoming: Override): Override;
}
export const lastWriteWins: ConflictStrategy = {
  select: (a, b) => (compareRevision(a.revision, b.revision) >= 0 ? a : b),
};
export function latestOverride(
  items: Override[],
  keys: string[],
  strategy: ConflictStrategy = lastWriteWins,
) {
  return items
    .filter((v) => keys.includes(v.identity))
    .reduce<Override | undefined>(
      (selected, incoming) => (selected ? strategy.select(selected, incoming) : incoming),
      undefined,
    );
}
export function validOverride(v: Override) {
  return (
    !!v &&
    v.schemaVersion === 1 &&
    typeof v.identity === 'string' &&
    typeof v.roadmap === 'boolean' &&
    !!v.revision &&
    Number.isSafeInteger(v.revision.clock) &&
    v.revision.clock >= 0 &&
    typeof v.revision.actor === 'string' &&
    typeof v.revision.operationId === 'string'
  );
}
export function validOperation(v: Operation) {
  return (
    !!v &&
    typeof v.id === 'string' &&
    ['refresh-local', 'remote-set'].includes(v.kind) &&
    ['pending', 'running', 'blocked', 'error'].includes(v.status) &&
    Number.isFinite(v.nextAttemptAt) &&
    Number.isFinite(v.leaseUntil) &&
    Number.isSafeInteger(v.fence) &&
    Number.isSafeInteger(v.attempts) &&
    v.attempts >= 0 &&
    Number.isSafeInteger(v.generation)
  );
}
export async function readLocal() {
  const db = await database();
  const tx = db.transaction(['sourceSnapshots', 'projectOverrides', 'outbox'], 'readonly');
  const [snapshots, overrides, operations] = await Promise.all([
    tx.objectStore('sourceSnapshots').getAll(),
    tx.objectStore('projectOverrides').getAll(),
    tx.objectStore('outbox').getAll(),
  ]);
  await tx.done;
  return {
    snapshots: snapshots.filter(
      (s) =>
        s &&
        SOURCES.includes(s.source) &&
        s.schemaVersion === 1 &&
        Number.isFinite(s.fetchedAt) &&
        Number.isFinite(s.expiresAt) &&
        isProjectList(s.projects),
    ),
    overrides: overrides.filter(validOverride),
    operations: operations.filter(validOperation),
  };
}
export async function saveSnapshot(
  source: Source,
  projects: Project[],
  expectedGeneration?: number,
  endpoint?: string,
  lease?: { key: string; owner: string },
) {
  if (!isProjectList(projects)) throw new Error('Import obsahuje neplatné projekty.');
  const db = await database();
  const tx = db.transaction(['sourceSnapshots', 'syncMeta', 'outbox'], 'readwrite');
  try {
    const meta = tx.objectStore('syncMeta');
    let generation = Number((await meta.get(`generation:${source}`))?.value ?? 0);
    if (expectedGeneration !== undefined && generation !== expectedGeneration) {
      await tx.done;
      return false;
    }
    if (lease) {
      const raw = (await meta.get(lease.key))?.value;
      let current: { owner?: string; until?: number } = {};
      try {
        current = JSON.parse(String(raw));
      } catch {
        /* no valid lease */
      }
      if (current.owner !== lease.owner || (current.until ?? 0) <= Date.now()) {
        await tx.done;
        return false;
      }
    }
    if (expectedGeneration === undefined) {
      generation++;
      await meta.put({ key: `generation:${source}`, value: generation });
      for (const old of await tx.objectStore('outbox').index('source').getAll(source))
        await tx.objectStore('outbox').delete(old.id);
    }
    const now = Date.now();
    await tx.objectStore('sourceSnapshots').put({
      source,
      projects,
      fetchedAt: now,
      expiresAt: now + TTL,
      schemaVersion: 1,
      generation,
      ...(endpoint ? { endpoint } : {}),
    });
    await tx.done;
    return true;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* completed/aborted transaction */
    }
    await tx.done.catch(() => undefined);
    throw error;
  }
}
export async function generationOf(source: Source) {
  return Number((await (await database()).get('syncMeta', `generation:${source}`))?.value ?? 0);
}
export async function disconnectSource(source: Source) {
  const db = await database();
  const tx = db.transaction(['sourceSnapshots', 'syncMeta', 'outbox'], 'readwrite');
  const meta = tx.objectStore('syncMeta');
  const generation = Number((await meta.get(`generation:${source}`))?.value ?? 0) + 1;
  await meta.put({ key: `generation:${source}`, value: generation });
  await tx.objectStore('sourceSnapshots').delete(source);
  for (const op of await tx.objectStore('outbox').index('source').getAll(source))
    await tx.objectStore('outbox').delete(op.id);
  await tx.done;
}
export async function setRoadmap(
  p: Pick<Project, 'id' | 'repoFullName' | 'localPath' | 'identityAliases'>,
  roadmap: boolean,
  actor: string,
  remote = false,
) {
  const db = await database();
  const tx = db.transaction(['projectOverrides', 'syncMeta', 'outbox'], 'readwrite');
  try {
    const meta = tx.objectStore('syncMeta');
    const store = tx.objectStore('projectOverrides');
    const keys = identities(p);
    let clock = Number((await meta.get('clock'))?.value ?? 0);
    // Reconcile legacy IDs/identities in the same transaction as the edit.
    for (const key of keys) clock = Math.max(clock, (await store.get(key))?.revision.clock ?? 0);
    const revision = { clock: clock + 1, actor, operationId: crypto.randomUUID() };
    const value: Override = { identity: keys[0], roadmap, revision, schemaVersion: 1 };
    await meta.put({ key: 'clock', value: revision.clock });
    await store.put(value);
    if (remote)
      await tx.objectStore('outbox').put({
        id: revision.operationId,
        kind: 'remote-set',
        identity: value.identity,
        roadmap,
        revision,
        generation: 0,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: 0,
        leaseUntil: 0,
        fence: 0,
      });
    await tx.done;
    return value;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* already aborted */
    }
    await tx.done.catch(() => undefined);
    throw error;
  }
}
/** Valid legacy values are removed only after a durable transaction and an unchanged-value check. */
export async function migrateLegacy(storage: Storage) {
  const db = await database();
  const entries: [string, string][] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && (/^h4ck3d:v1:source:(GitHub|Vercel|Local)$/.test(key) || key.startsWith('h4ck3d:roadmap:'))) {
      const raw = storage.getItem(key);
      if (raw !== null) entries.push([key, raw]);
    }
  }
  const tx = db.transaction(['sourceSnapshots', 'projectOverrides', 'syncMeta'], 'readwrite');
  try {
    const migrated: [string, string][] = [];
    const imported: Project[] = [];
    for (const [key, raw] of entries.filter(([k]) => k.startsWith('h4ck3d:v1:source:'))) {
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        continue;
      }
      if (!isProjectList(value)) continue;
      const source = key.split(':')[3] as Source;
      const old = await tx.objectStore('sourceSnapshots').get(source);
      const generation = Number((await tx.objectStore('syncMeta').get(`generation:${source}`))?.value ?? 0);
      if (!old && generation === 0)
        await tx
          .objectStore('sourceSnapshots')
          .put({ source, projects: value, fetchedAt: 0, expiresAt: 0, schemaVersion: 1, generation });
      imported.push(...value);
      migrated.push([key, raw]);
    }
    for (const [key, raw] of entries.filter(([k]) => k.startsWith('h4ck3d:roadmap:'))) {
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        continue;
      }
      if (typeof value !== 'boolean') continue;
      const id = key.slice('h4ck3d:roadmap:'.length);
      const p = imported.find((p) => p.id === id);
      const identity = p ? identities(p)[0] : `id:${id}`;
      if (!(await tx.objectStore('projectOverrides').get(identity)))
        await tx.objectStore('projectOverrides').put({
          identity,
          roadmap: value,
          revision: { clock: 0, actor: 'migration', operationId: id },
          schemaVersion: 1,
        });
      migrated.push([key, raw]);
    }
    await tx.done;
    for (const [key, raw] of migrated) if (storage.getItem(key) === raw) storage.removeItem(key);
    return { migrated: migrated.length, invalid: entries.length - migrated.length };
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* completed/aborted transaction */
    }
    await tx.done.catch(() => undefined);
    throw error;
  }
}
