import type { Page } from '@playwright/test';
export async function records(page: Page, store: string) {
  return page.evaluate(
    (store) =>
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const request = indexedDB.open('h4ck3d-timeline', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(store, 'readonly');
          const get = tx.objectStore(store).getAll();
          get.onerror = () => reject(get.error);
          get.onsuccess = () => {
            db.close();
            resolve(get.result as Record<string, unknown>[]);
          };
        };
      }),
    store,
  );
}
