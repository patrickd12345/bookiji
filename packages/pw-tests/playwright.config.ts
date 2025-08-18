import { defineConfig, devices } from '@playwright/test';

// Guard against NODE_OPTIONS preloads that could cause conflicts
if (process.env.NODE_OPTIONS?.includes('ts-node') || process.env.NODE_OPTIONS?.includes('tsconfig-paths')) {
  throw new Error('NODE_OPTIONS preloads are not allowed for Playwright.');
}

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],
  retries: 1,
  fullyParallel: false,
  workers: 1,
  
  expect: {
    timeout: 10_000,
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
      name: 'chromium', 
      use: { ...devices['Desktop Chrome'] } 
    },
  ],

  webServer: {
    command: process.env.PW_SERVER_CMD || 'cd ../.. && pnpm dev',
    url: 'http://localhost:3000',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
