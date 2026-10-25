import { defineConfig } from '@playwright/test';
import config from './playwright.config';

if (!process.env.BASE_URL)
  throw new Error('Set BASE_URL to the deployment origin before release verification.');
const url = new URL(process.env.BASE_URL);
if (
  !['http:', 'https:'].includes(url.protocol) ||
  url.username ||
  url.password ||
  url.pathname !== '/' ||
  url.search ||
  url.hash
) {
  throw new Error('BASE_URL must be an http(s) origin without credentials, query, or path.');
}

export default defineConfig({
  ...config,
  testDir: './release',
  webServer: undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { ...config.use, baseURL: url.origin },
});
