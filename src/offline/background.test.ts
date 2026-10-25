import { expect, it, vi } from 'vitest';
import { requestBackgroundSync } from './background';
it('registers the durable queue tag when native API is available (capability simulation)', async () => {
  const register = vi.fn(async () => undefined);
  expect(await requestBackgroundSync({ sync: { register } })).toBe(true);
  expect(register).toHaveBeenCalledWith('h4ck3d-local-refresh');
});
it('reports unsupported native API so foreground fallback remains responsible', async () => {
  expect(await requestBackgroundSync(undefined)).toBe(false);
  expect(await requestBackgroundSync({})).toBe(false);
});
it('does not lose the queue if native registration is denied', async () => {
  expect(
    await requestBackgroundSync({
      sync: {
        register: vi.fn(async () => {
          throw new Error('denied');
        }),
      },
    }),
  ).toBe(false);
});
