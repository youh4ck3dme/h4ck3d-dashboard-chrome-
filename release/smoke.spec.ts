import { test, expect } from '@playwright/test';

// These are hosting gates: run against a real preview/production origin, not vite preview.
test('public HTML, security policy, deep route and missing assets', async ({ request }) => {
  const root = await request.get('/');
  expect(root.status()).toBe(200);
  expect(root.headers()['content-type']).toContain('text/html');
  expect(await root.text()).toContain('H4CK3D Project Timeline');
  const headers = root.headers();
  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['strict-transport-security']).toContain('max-age=');
  expect(headers['cache-control']).toMatch(/max-age=0|no-cache|no-store/);
  const deep = await request.get('/release-check/deep-route');
  expect(deep.status()).toBe(200);
  expect(await deep.text()).toContain('H4CK3D Project Timeline');
  for (const path of ['/assets/release-check-missing.js', '/release-check-missing.css']) {
    expect((await request.get(path)).status()).toBe(404);
  }
});

test('manifest, icons, worker and immutable asset cache', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/json|manifest/);
  expect(response.headers()['cache-control']).toMatch(/max-age=0|no-cache|no-store/);
  const manifest = await response.json();
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) {
    const image = await request.get(`/${icon.src}`);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/');
  }
  const sw = await request.get('/sw.js');
  expect(sw.status()).toBe(200);
  expect(sw.headers()['content-type']).toMatch(/javascript/);
  expect(sw.headers()['cache-control']).toMatch(/max-age=0|no-cache|no-store/);
  const html = await (await request.get('/')).text();
  const asset = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  expect(asset).toBeTruthy();
  const script = await request.get(asset!);
  expect(script.status()).toBe(200);
  expect(script.headers()['cache-control']).toContain('immutable');
});

test('browser render, console/CSP and offline reload on the deployed origin', async ({ page, context }) => {
  const errors: string[] = [];
  const violations: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.exposeFunction('recordReleaseCSP', (value: string) => violations.push(value));
  await page.addInitScript(() =>
    document.addEventListener('securitypolicyviolation', (event) => {
      (window as unknown as { recordReleaseCSP: (value: string) => void }).recordReleaseCSP(
        event.violatedDirective,
      );
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Načítavam H4CK3D Project Timeline' })).toHaveCount(0, {
    timeout: 8000,
  });
  await expect(page.getByRole('heading', { name: 'H4CK3D Project Timeline' })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'H4CK3D Project Timeline' })).toBeVisible();
  expect(errors).toEqual([]);
  expect(violations).toEqual([]);
});
