import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
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
    {
      command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node server/local-scanner.mjs',
      env: { PORT: '3001', PROJECTS_DIR: './e2e/fixtures', CORS_ORIGINS: 'http://127.0.0.1:4173' },
      url: 'http://127.0.0.1:3001/health',
      reuseExistingServer: false,
    },
  ],
});
