import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  closeDatabase,
  database,
  migrateLegacy,
  readLocal,
  saveSnapshot,
  setRoadmap,
  disconnectSource,
  generationOf,
  latestOverride,
  identities,
  compareRevision,
} from './db';
import {
  backoff,
  claimOperation,
  enqueueLocalRefresh,
  failOperation,
  processLocalQueue,
  registerRefresh,
  refreshSource,
  forgetRefresh,
  retryAfterMs,
  SyncFailure,
  localEndpoint,
} from './engine';
import { projects } from '../data/projects';
import { localToProject, mergeProjects, vercelToProject } from '../lib/sources';

beforeEach(async () => {
  await closeDatabase();
  await deleteDB('h4ck3d-timeline');
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  forgetRefresh('GitHub');
  forgetRefresh('Vercel');
});
const p = { ...projects[0], id: 'gh-1', repoFullName: 'alice/demo' };

describe('durable migration and data boundaries', () => {
  it('migrates all three source keys and roadmap, then is idempotent', async () => {
    for (const name of ['GitHub', 'Vercel', 'Local'])
      localStorage.setItem(`h4ck3d:v1:source:${name}`, JSON.stringify([p]));
    localStorage.setItem('h4ck3d:roadmap:gh-1', 'true');
    expect((await migrateLegacy(localStorage)).migrated).toBe(4);
    const data = await readLocal();
    expect(data.snapshots).toHaveLength(3);
    expect(data.overrides[0].identity).toBe('repo:alice/demo');
    expect(localStorage.length).toBe(0);
    expect((await migrateLegacy(localStorage)).migrated).toBe(0);
  });
  it('keeps corrupt legacy records and newer IDB edits', async () => {
    await saveSnapshot('GitHub', [p]);
    await setRoadmap(p, false, 'new');
    localStorage.setItem('h4ck3d:v1:source:GitHub', JSON.stringify([p]));
    localStorage.setItem('h4ck3d:roadmap:gh-1', 'true');
    localStorage.setItem('h4ck3d:v1:source:Vercel', '{bad');
    expect((await migrateLegacy(localStorage)).invalid).toBe(1);
    expect((await readLocal()).overrides[0].roadmap).toBe(false);
    expect(localStorage.getItem('h4ck3d:v1:source:Vercel')).toBe('{bad');
  });
  it('retries migration after failure before cleanup without duplicating data', async () => {
    localStorage.setItem('h4ck3d:v1:source:Local', JSON.stringify([p]));
    const proxy = Object.create(localStorage) as Storage;
    Object.defineProperties(proxy, {
      length: { get: () => localStorage.length },
      key: { value: (i: number) => localStorage.key(i) },
      getItem: { value: (k: string) => localStorage.getItem(k) },
      removeItem: {
        value: () => {
          throw new Error('closed');
        },
      },
    });
    await expect(migrateLegacy(proxy)).rejects.toThrow();
    expect((await readLocal()).snapshots).toHaveLength(1);
    await migrateLegacy(localStorage);
    expect((await readLocal()).snapshots).toHaveLength(1);
  });
  it('does not resurrect a disconnected legacy source', async () => {
    await disconnectSource('GitHub');
    localStorage.setItem('h4ck3d:v1:source:GitHub', JSON.stringify([p]));
    await migrateLegacy(localStorage);
    expect((await readLocal()).snapshots).toEqual([]);
  });
  it('retains expired snapshots and overrides after refresh', async () => {
    await saveSnapshot('GitHub', [p]);
    await setRoadmap(p, true, 'a');
    const db = await database();
    const snap = (await db.get('sourceSnapshots', 'GitHub'))!;
    await db.put('sourceSnapshots', { ...snap, expiresAt: 0 });
    expect((await readLocal()).snapshots[0].projects).toHaveLength(1);
    await saveSnapshot('GitHub', [{ ...p, name: 'refreshed' }]);
    expect((await readLocal()).overrides[0].roadmap).toBe(true);
  });
  it('rejects malformed imports instead of claiming a durable save', async () => {
    await expect(saveSnapshot('GitHub', [{ ...p, tech: null } as unknown as typeof p])).rejects.toThrow();
    expect((await readLocal()).snapshots).toHaveLength(0);
  });
});

describe('atomic writes, identity and concurrent changes', () => {
  it('orders concurrent field writes by serialized logical revision, not wall clock', async () => {
    const [a, b] = await Promise.all([setRoadmap(p, true, 'a'), setRoadmap(p, false, 'b')]);
    expect(b.revision.clock).toBe(a.revision.clock + 1);
    expect((await readLocal()).overrides[0].roadmap).toBe(false);
    expect(
      compareRevision({ ...a.revision, clock: 1, actor: 'a' }, { ...a.revision, clock: 1, actor: 'b' }),
    ).toBeLessThan(0);
  });
  it('keeps independent project edits and queue operations in one transaction', async () => {
    await Promise.all([
      setRoadmap(p, true, 'a', true),
      setRoadmap({ ...p, id: 'gh-2', repoFullName: 'bob/demo' }, false, 'b', true),
    ]);
    const data = await readLocal();
    expect(data.overrides).toHaveLength(2);
    expect(data.operations).toHaveLength(2);
    expect(
      data.operations.every((op) => op.kind === 'remote-set' && op.id === op.revision?.operationId),
    ).toBe(true);
  });
  it('retains queued operations across connection restarts without a remote adapter', async () => {
    await setRoadmap(p, true, 'a', true);
    await closeDatabase();
    await processLocalQueue('worker');
    expect((await readLocal()).operations).toHaveLength(1);
  });
  it('preserves old Vercel identity when GitHub becomes primary', async () => {
    const vc = vercelToProject({ id: 'old', name: 'same', framework: null, createdAt: 1, updatedAt: 1 });
    await setRoadmap(vc, true, 'a');
    const merged = mergeProjects([[{ ...p, name: 'same' }], [vc]])[0];
    expect(latestOverride((await readLocal()).overrides, identities(merged))?.roadmap).toBe(true);
  });
  it('aborts both override and queue when quota prevents the second write', async () => {
    const original = IDBObjectStore.prototype.put;
    const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['put']>
    ) {
      if (this.name === 'outbox') throw new DOMException('Full', 'QuotaExceededError');
      return original.apply(this, args);
    });
    await expect(setRoadmap(p, true, 'a', true)).rejects.toThrow('Full');
    spy.mockRestore();
    expect((await readLocal()).overrides).toHaveLength(0);
    expect((await readLocal()).operations).toHaveLength(0);
  });
});

describe('outbox fencing, retries and disconnection', () => {
  async function seed() {
    await saveSnapshot('Local', [p], undefined, 'http://127.0.0.1:3001');
    await enqueueLocalRefresh();
  }
  it('deduplicates queue creation, concurrent claims and recovers a crashed lease', async () => {
    await seed();
    await enqueueLocalRefresh();
    expect((await readLocal()).operations).toHaveLength(1);
    const [a, b] = await Promise.all([
      claimOperation('refresh:Local', 'a', 100),
      claimOperation('refresh:Local', 'b', 100),
    ]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    const recovered = await claimOperation('refresh:Local', 'c', 60_101);
    expect(recovered?.fence).toBeGreaterThan(a?.fence ?? b!.fence);
  });
  it('stale workers cannot overwrite a recovered operation', async () => {
    await seed();
    const old = (await claimOperation('refresh:Local', 'a', 100))!;
    await claimOperation(old.id, 'b', 60_101);
    await failOperation(old, new Error('late'), 70_000);
    expect((await readLocal()).operations[0].leaseOwner).toBe('b');
  });
  it('honors Retry-After, stops auth failures and bounds transient retries', async () => {
    await seed();
    const first = (await claimOperation('refresh:Local', 'a', 100))!;
    await failOperation(first, new SyncFailure('limit', 429, 120_000), 200);
    let op = (await readLocal()).operations[0];
    expect(op.nextAttemptAt).toBe(120_200);
    expect(await claimOperation(op.id, 'b', 1000)).toBeUndefined();
    op = (await claimOperation(op.id, 'b', 120_201))!;
    await failOperation(op, new SyncFailure('auth', 401), 130_000);
    expect((await readLocal()).operations[0].status).toBe('blocked');
    await enqueueLocalRefresh(true);
    for (let i = 0; i < 5; i++) {
      const claimed = (await claimOperation('refresh:Local', 'a', Date.now() + 10_000_000 * i))!;
      await failOperation(claimed, new Error('offline'), Date.now() + 10_000_000 * i);
    }
    expect((await readLocal()).operations[0].status).toBe('error');
    await enqueueLocalRefresh();
    expect((await readLocal()).operations[0].status).toBe('error');
  });
  it('does not commit a response arriving after disconnect', async () => {
    await seed();
    let release!: (r: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((r) => {
            release = r;
          }),
      ),
    );
    const pending = processLocalQueue('a');
    await vi.waitFor(() => expect(release).toBeDefined());
    await disconnectSource('Local');
    release(new Response(JSON.stringify({ projects: [{ name: 'late', path: '/late' }] })));
    await pending;
    expect((await readLocal()).snapshots).toHaveLength(0);
    expect((await readLocal()).operations).toHaveLength(0);
  });
  it('only one concurrent processor calls the scanner and commits a valid import', async () => {
    await seed();
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ projects: [{ name: 'local', path: '/local', dependencies: ['react'] }] }),
        ),
    );
    vi.stubGlobal('fetch', fetch);
    await Promise.all([processLocalQueue('a'), processLocalQueue('b')]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((await readLocal()).snapshots[0].projects[0].name).toBe('local');
  });
  it('missing credentials do not make network calls and 401 removes session refresh access', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(refreshSource('GitHub', 'a')).rejects.toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
    const refresh = vi.fn(async () => {
      throw new SyncFailure('auth', 401);
    });
    registerRefresh('GitHub', refresh);
    await expect(refreshSource('GitHub', 'a')).rejects.toMatchObject({ status: 401 });
    expect(refresh).toHaveBeenCalledTimes(1);
    await expect(refreshSource('GitHub', 'a')).rejects.toMatchObject({ status: 401 });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('generation rejects a stale foreground write', async () => {
    const generation = await generationOf('GitHub');
    await disconnectSource('GitHub');
    expect(await saveSnapshot('GitHub', [p], generation)).toBe(false);
  });
  it('rejects non-loopback worker endpoints and parses deterministic backoff', () => {
    expect(() => localEndpoint('https://example.com')).toThrow();
    expect(() => localEndpoint('http://secret:token@localhost:3001')).toThrow();
    expect(backoff(0, () => 0.5)).toBe(1000);
    expect(backoff(3, () => 0.5, 90_000)).toBe(90_000);
    expect(retryAfterMs('5')).toBe(5000);
    expect(retryAfterMs('bad')).toBeUndefined();
    expect(localToProject({ name: 'x', path: '/x' }).visibility).toBe('Internal');
  });
});

describe('foreground source coordination', () => {
  it('deduplicates authenticated refreshes across independent callers', async () => {
    await saveSnapshot('GitHub', [p]);
    await setRoadmap(p, true, 'actor');
    let finish!: (items: (typeof p)[]) => void;
    const refresh = vi.fn(
      () =>
        new Promise<(typeof p)[]>((resolve) => {
          finish = resolve;
        }),
    );
    registerRefresh('GitHub', refresh);
    const first = refreshSource('GitHub', 'tab-a');
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await refreshSource('GitHub', 'tab-b');
    expect(refresh).toHaveBeenCalledTimes(1);
    finish([{ ...p, name: 'new snapshot' }]);
    await first;
    expect((await readLocal()).snapshots[0].projects[0].name).toBe('new snapshot');
    expect((await readLocal()).overrides[0].roadmap).toBe(true);
  });
  it('does not accept a response whose foreground lease was replaced', async () => {
    const db = await database();
    await db.put('syncMeta', {
      key: 'lease:GitHub',
      value: JSON.stringify({ owner: 'new-owner', until: Date.now() + 60_000 }),
    });
    expect(await saveSnapshot('GitHub', [p], 0, undefined, { key: 'lease:GitHub', owner: 'old-owner' })).toBe(
      false,
    );
    expect((await readLocal()).snapshots).toHaveLength(0);
  });
  it('uses a pluggable deterministic conflict strategy', async () => {
    const a = await setRoadmap(p, true, 'a');
    const b = { ...a, identity: 'id:alias', roadmap: false };
    expect(latestOverride([a, b], [a.identity, b.identity], { select: (local) => local })?.roadmap).toBe(
      true,
    );
  });
});

describe('atomic recovery on source/migration quota errors', () => {
  it('keeps previous snapshot, queue and generation if a replacement import cannot be stored', async () => {
    await saveSnapshot('Local', [p], undefined, 'http://127.0.0.1:3001');
    await enqueueLocalRefresh();
    const before = await generationOf('Local');
    const original = IDBObjectStore.prototype.put;
    const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['put']>
    ) {
      if (this.name === 'sourceSnapshots') throw new DOMException('Full', 'QuotaExceededError');
      return original.apply(this, args);
    });
    await expect(saveSnapshot('Local', [{ ...p, name: 'must not commit' }])).rejects.toThrow('Full');
    spy.mockRestore();
    expect((await readLocal()).snapshots[0].projects[0].name).toBe(p.name);
    expect((await readLocal()).operations).toHaveLength(1);
    expect(await generationOf('Local')).toBe(before);
  });
  it('aborts the complete migration if writing a later source fails', async () => {
    localStorage.setItem('h4ck3d:v1:source:GitHub', JSON.stringify([p]));
    localStorage.setItem('h4ck3d:v1:source:Vercel', JSON.stringify([p]));
    const original = IDBObjectStore.prototype.put;
    let writes = 0;
    const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['put']>
    ) {
      if (this.name === 'sourceSnapshots' && ++writes === 2)
        throw new DOMException('Full', 'QuotaExceededError');
      return original.apply(this, args);
    });
    await expect(migrateLegacy(localStorage)).rejects.toThrow('Full');
    spy.mockRestore();
    expect((await readLocal()).snapshots).toHaveLength(0);
    expect(localStorage.length).toBe(2);
    await migrateLegacy(localStorage);
    expect((await readLocal()).snapshots).toHaveLength(2);
  });
});
