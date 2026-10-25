import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const origin = new URL(baseURL).origin;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote'],
        }
      : {},
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    ...(process.env.TEST_WEBKIT
      ? [
          {
            name: 'mobile-webkit',
            use: { ...devices['iPhone 14'], browserName: 'webkit' as const, launchOptions: {} },
          },
        ]
      : []),
  ],
  webServer: [
    ...(!process.env.BASE_URL
      ? [
          {
            command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
            url: baseURL,
            reuseExistingServer: !process.env.CI,
          },
        ]
      : []),
    {
      command: 'node server/local-scanner.mjs',
      env: { PORT: '3001', PROJECTS_DIR: './e2e/fixtures', CORS_ORIGINS: origin },
      url: 'http://127.0.0.1:3001/health',
      reuseExistingServer: false,
    },
  ],
});
