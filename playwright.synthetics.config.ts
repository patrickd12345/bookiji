import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/synthetics',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    userAgent: devices['Desktop Chrome'].userAgent,
  },

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
