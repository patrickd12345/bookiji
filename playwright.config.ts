import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Root is just a convenience, projects override below.
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
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
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
      workers: 1, // lift to default after a couple of green runs
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
      // Keep these single-threaded to reduce flake.
      workers: 1,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

 
