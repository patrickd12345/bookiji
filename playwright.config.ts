import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/e2e/**/*.spec.ts', '**/a11y/**/*.spec.ts', '**/chaos/**/*.spec.ts', '**/generated.spec.ts'],
  retries: process.env.CI ? 2 : 0,
  fullyParallel: true,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      threshold: 0.01,
      maxDiffPixels: 100,
    },
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: !process.env.HEADED,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Make sure no Vitest setup is auto-imported here
  globalSetup: undefined,
  globalTeardown: undefined,

  webServer: {
    command: process.env.PW_WEB_CMD || 'pnpm start',
    url: process.env.BASE_URL || 'http://localhost:3000',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Explicitly exclude any setup files
  testIgnore: ['**/setup.ts', '**/setup.js', '**/_helpers/**', '**/*.helper.*', '**/*.fixture.*'],
});

 
