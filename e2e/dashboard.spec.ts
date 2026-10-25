import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const demoRepo = {
  id: 101,
  name: 'real-import',
  full_name: 'demo/real-import',
  html_url: 'https://github.com/demo/real-import',
  description: 'Imported project',
  language: 'TypeScript',
  homepage: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-02',
  pushed_at: '2026-01-02',
  stargazers_count: 0,
  forks_count: 0,
  private: true,
  archived: false,
  fork: false,
  default_branch: 'main',
  size: 800,
};
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Načítavam H4CK3D Project Timeline' })).toHaveCount(0, {
    timeout: 8000,
  });
  await expect(page.getByRole('heading', { name: 'H4CK3D Project Timeline' })).toBeVisible();
}
async function sources(page: Page) {
  await page.getByRole('button', { name: /Zdroje/ }).click();
}
async function github(page: Page) {
  await sources(page);
  await page.getByRole('button', { name: /Pripojiť GitHub/ }).click();
}

test('search, empty state, reset, project detail and roadmap persist', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await ready(page);
  await expect(page.getByText('Ukážkové údaje', { exact: false })).toBeVisible();
  if (isMobile) await page.getByRole('button', { name: 'Search', exact: true }).click();
  const search = page.getByRole('searchbox', { name: isMobile ? 'Search projects' : 'Jump to project' });
  await search.fill('zzzz-nonexistent');
  await expect(page.getByText('No projects match these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear all filters' }).click();
  if (isMobile) await page.getByRole('button', { name: 'Close search' }).click();
  await page
    .getByRole('button', { name: /^Open / })
    .first()
    .click();
  const detail = page.getByRole(isMobile ? 'dialog' : 'complementary', { name: / detail$/ });
  await expect(detail).toBeVisible();
  await detail.getByRole('button', { name: 'Roadmap', exact: true }).click();
  await expect(detail.getByRole('button', { name: 'On roadmap', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await page
    .getByRole('button', { name: /^Open / })
    .first()
    .click();
  await expect(page.getByRole('button', { name: 'On roadmap', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('GitHub import survives reload, clears token and disconnect restores demo', async ({ page }) => {
  await page.route('https://api.github.com/**', (route) => route.fulfill({ json: [demoRepo] }));
  await ready(page);
  await github(page);
  await page.getByLabel('Personal Access Token', { exact: true }).fill('fake-e2e-token');
  await page.getByRole('button', { name: /Pripojiť a načítať repozitáre/ }).click();
  await page.getByText('real-import', { exact: true }).click();
  await page.getByRole('button', { name: /Importovať/ }).click();
  // Return from mobile sources to timeline.
  const timeline = page.getByRole('button', { name: 'Timeline', exact: true });
  if (await timeline.isVisible()) await timeline.click();
  await expect(page.getByRole('button', { name: 'Open real-import', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('fake-e2e-token');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open real-import', exact: true })).toBeVisible();
  await sources(page);
  await page.getByRole('button', { name: /Odpojiť/ }).click();
  await page.reload();
  await expect(page.getByText('Ukážkové údaje', { exact: false })).toBeVisible();
});

test('invalid GitHub response shows an error and closing clears credentials', async ({ page }) => {
  await page.route('https://api.github.com/**', (route) =>
    route.fulfill({ status: 401, json: { message: 'Bad credentials' } }),
  );
  await ready(page);
  await github(page);
  await page.getByLabel('Personal Access Token', { exact: true }).fill('fake-invalid');
  await page.getByRole('button', { name: /Pripojiť a načítať repozitáre/ }).click();
  await expect(page.getByRole('alert')).toContainText('Neplatný token');
  await page.getByRole('dialog').getByRole('button', { name: 'Zavrieť', exact: true }).click();
  await github(page);
  await expect(page.getByLabel('Personal Access Token', { exact: true })).toHaveValue('');
});

test('malformed stored projects recover to a usable timeline', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('h4ck3d:v1:source:GitHub', '[{"id":"bad","name":"Broken"}]'),
  );
  await ready(page);
  await expect(page.getByRole('button', { name: /^Open / }).first()).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('production CSP, manifest and service worker support offline reload', async ({ page, context }) => {
  const violations: string[] = [];
  await page.exposeFunction('recordViolation', (text: string) => violations.push(text));
  await page.addInitScript(() =>
    document.addEventListener('securitypolicyviolation', (event) => {
      (window as unknown as Window & { recordViolation: (text: string) => void }).recordViolation(
        `${event.violatedDirective}: ${event.blockedURI}`,
      );
    }),
  );
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
  const manifest = await context.request.get('/manifest.webmanifest');
  const data = await manifest.json();
  expect(data.display).toBe('standalone');
  expect(data.icons).toHaveLength(3);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'H4CK3D Project Timeline' })).toBeVisible();
  expect(violations).toEqual([]);
});

test('keyboard dialog and accessibility audit', async ({ page }) => {
  await ready(page);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
  await github(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'GitHub Sync' })).toHaveCount(0);
});

test('Vercel import maps a production deployment without persisting its token', async ({
  page,
  isMobile,
}) => {
  await page.route('https://api.vercel.com/**', (route) =>
    route.fulfill({
      json: {
        projects: [
          {
            id: 'e2e',
            name: 'vercel-import',
            framework: 'vite',
            createdAt: 1,
            updatedAt: 1,
            targets: { production: { readyState: 'READY', alias: ['example.vercel.app'] } },
          },
        ],
        pagination: { next: null },
      },
    }),
  );
  await ready(page);
  await sources(page);
  const card = page.getByRole('region', { name: 'Vercel', exact: true });
  await card.getByLabel(/Vercel token/).fill('fake-vercel-token');
  await card.getByRole('button', { name: 'Pripojiť Vercel', exact: true }).click();
  await expect(card.getByText('1 projektov načítaných')).toBeVisible();
  if (isMobile) await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  else
    await page
      .getByRole('dialog', { name: 'Zdroje projektov' })
      .getByRole('button', { name: 'Zavrieť' })
      .click();
  await page.getByRole('button', { name: 'Open vercel-import' }).click();
  await expect(page.getByRole('link', { name: 'Open on Vercel' })).toHaveAttribute(
    'href',
    'https://example.vercel.app/',
  );
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('fake-vercel-token');
});

test('real local scanner → HTTP → UI import → reload', async ({ page, isMobile }) => {
  await ready(page);
  await sources(page);
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
  await expect(page.getByRole('button', { name: 'Open scanner-integration-fixture' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open scanner-integration-fixture' })).toBeVisible();
});
