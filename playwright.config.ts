// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

const envPath = path.resolve(process.cwd(), '.env.e2e')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true })
}

if (process.env.E2E !== 'true') {
  throw new Error('Refusing to run Playwright without `E2E=true` (use `.env.e2e`).')
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl || !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl)) {
  throw new Error(`Refusing to run E2E against non-local Supabase: ${supabaseUrl ?? '(missing)'}`)
}

const baseURL = process.env.BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',

  fullyParallel: true,
  retries: 1,
  timeout: 45_000,

  use: {
    baseURL,
    headless: true,
    bypassCSP: true,
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
