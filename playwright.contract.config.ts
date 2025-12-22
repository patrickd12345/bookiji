import { defineConfig } from '@playwright/test'

const baseURL = process.env.BASE_URL || 'http://localhost:3000'

// Contract tests are API-level and should stay fast/deterministic.
export default defineConfig({
  testDir: './tests/api/contracts',
  timeout: 30_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL,
    // No screenshots/videos/traces for contract tests by default.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  // Start the Next dev server for API routes (reuse if already running).
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'contract' },
  ],
})










