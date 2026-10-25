import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { database } from './offline/db';
import { processLocalQueue } from './offline/engine';

interface ExtendEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}
const worker = self as unknown as {
  __WB_MANIFEST: { url: string; revision?: string | null }[];
  addEventListener(
    type: string,
    listener: (event: ExtendEvent & { tag?: string; data?: { type?: string } }) => void,
  ): void;
  skipWaiting(): Promise<void>;
  clients: { matchAll(): Promise<{ postMessage(value: unknown): void }[]> };
};
// @ts-expect-error Workbox injects the precache manifest into the worker global.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));
registerRoute(
  ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/splash/'),
  new CacheFirst({
    cacheName: 'splash',
    plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536000 })],
  }),
);
registerRoute(
  ({ sameOrigin, url }) => sameOrigin && url.pathname.endsWith('.woff2'),
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 31536000 })],
  }),
);
async function runQueue(background = false) {
  await processLocalQueue(`worker:${crypto.randomUUID()}`);
  for (const client of await worker.clients.matchAll()) client.postMessage('h4ck3d:sync-complete');
  if (
    background &&
    (await (await database()).getAll('outbox')).some(
      (op) => op.kind === 'refresh-local' && op.status === 'pending',
    )
  )
    throw new Error('Local refresh pending retry');
}
worker.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void worker.skipWaiting();
  if (event.data?.type === 'RUN_LOCAL_QUEUE') event.waitUntil(runQueue());
});
worker.addEventListener('sync', (event) => {
  if (event.tag === 'h4ck3d-local-refresh') event.waitUntil(runQueue(true));
});
