import { test, expect, type Page } from '@playwright/test';
import { records } from './storage';
import { projects } from '../src/data/projects';

const fixture = {
  ...projects[0],
  featured: false,
  id: 'gh-900',
  name: 'offline-fixture',
  repoFullName: 'owner/offline',
  sources: ['GitHub'],
};
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Načítavam H4CK3D Project Timeline' })).toHaveCount(0, {
    timeout: 8000,
  });
  await expect(page.getByText('Načítavam lokálne dáta…')).toHaveCount(0);
}
async function seed(page: Page) {
  await page.addInitScript(
    (fixture) => localStorage.setItem('h4ck3d:v1:source:GitHub', JSON.stringify([fixture])),
    fixture,
  );
}
async function detail(page: Page) {
  await page.getByRole('button', { name: 'Open offline-fixture', exact: true }).click();
}

test('legacy migration, offline edit, tab close and reopen preserve Roadmap', async ({ page, context }) => {
  await seed(page);
  await ready(page);
  await detail(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Roadmap', exact: true }).click();
  await expect.poll(async () => (await records(page, 'projectOverrides'))[0]?.roadmap).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('h4ck3d:v1:source:GitHub'))).toBeNull();
  // Close a tab, retain the browser profile, then reopen the offline installed shell.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.close();
  const next = await context.newPage();
  await ready(next);
  await detail(next);
  await expect(next.getByRole('button', { name: 'On roadmap', exact: true })).toBeVisible();
});

test('two tabs receive durable edits and a stale refresh does not erase Roadmap', async ({
  page,
  context,
}) => {
  await seed(page);
  await ready(page);
  const second = await context.newPage();
  await ready(second);
  await detail(page);
  await detail(second);
  await page.getByRole('button', { name: 'Roadmap', exact: true }).click();
  await expect(second.getByRole('button', { name: 'On roadmap', exact: true })).toBeVisible();
  await second.getByRole('button', { name: 'On roadmap', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Roadmap', exact: true })).toBeVisible();
  await expect.poll(async () => (await records(page, 'projectOverrides'))[0]?.roadmap).toBe(false);
});

test('no Background Sync API still opens stale data and requests credentials without calling GitHub', async ({
  page,
}) => {
  let calls = 0;
  await page.route('https://api.github.com/**', (route) => {
    calls++;
    return route.abort();
  });
  await page.addInitScript(() => {
    if ('ServiceWorkerRegistration' in window)
      Object.defineProperty(ServiceWorkerRegistration.prototype, 'sync', {
        get: () => undefined,
        configurable: true,
      });
  });
  await seed(page);
  await ready(page);
  await expect(page.getByText(/Zastarané metadáta/)).toBeVisible();
  await expect(page.getByText('Vyžaduje pripojenie: GitHub')).toBeVisible();
  await page.getByRole('button', { name: 'Obnoviť zdroje', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open offline-fixture', exact: true })).toBeVisible();
  expect(calls).toBe(0);
});

test('durable write failure rolls back optimistic UI and explicitly reports unsaved change', async ({
  page,
}) => {
  await seed(page);
  await ready(page);
  await detail(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['put']>
    ) {
      if (this.name === 'projectOverrides') throw new DOMException('Full', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Roadmap', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('nepodarilo uložiť');
  await expect(page.getByRole('button', { name: 'Roadmap', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  expect(await records(page, 'projectOverrides')).toHaveLength(0);
});

test('slow scanner refresh is deduplicated and disconnect fences its late response', async ({
  page,
  isMobile,
}) => {
  await ready(page);
  await page.getByRole('button', { name: /Zdroje/ }).click();
  const card = page.getByRole('region', { name: 'Lokálne projekty', exact: true });
  await card.getByLabel(/Adresa lokálneho servera/).fill('http://127.0.0.1:3001');
  await card.getByRole('button', { name: 'Prehľadať projekty', exact: true }).click();
  await expect(card.getByText('1 lokálnych projektov')).toBeVisible();
  if (isMobile) await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  else
    await page
      .getByRole('dialog', { name: 'Zdroje projektov' })
      .getByRole('button', { name: 'Zavrieť' })
      .click();
  let requests = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('http://127.0.0.1:3001/api/local/projects', async (route) => {
    requests++;
    await gate;
    await route
      .fulfill({ json: { projects: [{ name: 'late-resurrection', path: '/late' }] } })
      .catch(() => undefined);
  });
  await page.getByRole('button', { name: 'Obnoviť zdroje', exact: true }).click();
  await expect.poll(() => requests).toBe(1);
  await page.getByRole('button', { name: 'Obnoviť zdroje', exact: true }).click();
  await page.getByRole('button', { name: /Zdroje/ }).click();
  await page.getByRole('button', { name: 'Odpojiť', exact: true }).click();
  release();
  await expect.poll(async () => (await records(page, 'sourceSnapshots')).length).toBe(0);
  expect(requests).toBe(1);
  await expect.poll(async () => (await records(page, 'outbox')).length).toBe(0);
});

test('a real service worker consumes a durable local-refresh operation', async ({ page, isMobile }) => {
  await ready(page);
  await page.getByRole('button', { name: /Zdroje/ }).click();
  const card = page.getByRole('region', { name: 'Lokálne projekty', exact: true });
  await card.getByLabel(/Adresa lokálneho servera/).fill('http://127.0.0.1:3001');
  await card.getByRole('button', { name: 'Prehľadať projekty', exact: true }).click();
  await expect(card.getByText('1 lokálnych projektov')).toBeVisible();
  if (isMobile) await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  else
    await page
      .getByRole('dialog', { name: 'Zdroje projektov' })
      .getByRole('button', { name: 'Zavrieť' })
      .click();
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('h4ck3d-timeline', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['outbox', 'sourceSnapshots'], 'readwrite');
        const snapshotRequest = tx.objectStore('sourceSnapshots').get('Local');
        snapshotRequest.onsuccess = () => {
          tx.objectStore('outbox').put({
            id: 'worker-fixture',
            kind: 'refresh-local',
            source: 'Local',
            generation: snapshotRequest.result.generation,
            status: 'pending',
            attempts: 0,
            nextAttemptAt: 0,
            leaseUntil: 0,
            fence: 0,
          });
        };
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
    registration.active!.postMessage({ type: 'RUN_LOCAL_QUEUE' });
  });
  await expect.poll(async () => (await records(page, 'outbox')).length).toBe(0);
  // This proves actual worker execution via message, not native browser sync scheduling.
  await expect(page.getByRole('button', { name: 'Open scanner-integration-fixture' })).toBeVisible();
});

test('offline refresh stays queued and drains when connectivity returns', async ({
  page,
  context,
  isMobile,
}) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    if ('ServiceWorkerRegistration' in window)
      Object.defineProperty(ServiceWorkerRegistration.prototype, 'sync', {
        get: () => undefined,
        configurable: true,
      });
  });
  await ready(page);
  await page.getByRole('button', { name: /Zdroje/ }).click();
  const card = page.getByRole('region', { name: 'Lokálne projekty', exact: true });
  await card.getByLabel(/Adresa lokálneho servera/).fill('http://127.0.0.1:3001');
  await card.getByRole('button', { name: 'Prehľadať projekty', exact: true }).click();
  await expect(card.getByText('1 lokálnych projektov')).toBeVisible();
  if (isMobile) await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  else
    await page
      .getByRole('dialog', { name: 'Zdroje projektov' })
      .getByRole('button', { name: 'Zavrieť' })
      .click();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Obnoviť zdroje', exact: true }).click();
  await expect.poll(async () => (await records(page, 'outbox')).length).toBe(1);
  await context.setOffline(false);
  await expect.poll(async () => (await records(page, 'outbox')).length, { timeout: 45000 }).toBe(0);
  await expect(page.getByRole('button', { name: 'Open scanner-integration-fixture' })).toBeVisible();
});
