import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  retries: 1,
  fullyParallel: true,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      threshold: 0.01,
      maxDiffPixels: 100,
    },
  },
  use: {
    baseURL: process.env.BASE_URL!, // e.g. Vercel preview URL
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'e2e',
      testDir: 'tests/e2e',
      testMatch: /.*\.(spec|test)\.(ts|tsx)$/,
      testIgnore: ['**/_helpers/**', '**/*.helper.*', '**/*.fixture.*'],
      use: { ...devices['Desktop Chrome'] },
      workers: 1,
    },
    {
      name: 'visual',
      testDir: 'tests/visual',
      testMatch: /.*\.(spec|test)\.(ts|tsx)$/,
      testIgnore: ['**/_helpers/**', '**/*.helper.*', '**/*.fixture.*'],
      use: { ...devices['Desktop Chrome'], colorScheme: 'light' },
    },
    {
      name: 'synthetics',
      testDir: 'tests/synthetics',
      testMatch: /.*\.(spec|test)\.(ts|tsx)$/,
      testIgnore: ['**/_helpers/**', '**/*.helper.*', '**/*.fixture.*'],
      workers: 1,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});


