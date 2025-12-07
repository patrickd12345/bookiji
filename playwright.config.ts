// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',

  fullyParallel: true,
  retries: 1,
  timeout: 45_000,

  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },

  projects: [
    {
      name: 'chromium',
      use: devices['Desktop Chrome'],
    },
    {
      name: 'firefox',
      use: devices['Desktop Firefox'],
    },
    {
      name: 'webkit',
      use: devices['Desktop Safari'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 45_000,
  },
})
