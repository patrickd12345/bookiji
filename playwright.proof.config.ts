// playwright.proof.config.ts
// Configuration for production-readiness proof suite
// Runs in headed mode with full video/screenshot/trace recording

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
  testMatch: '**/bookiji-full-proof.spec.ts',

  fullyParallel: false, // Run sequentially for visibility
  retries: 0, // No retries - we want to see failures
  timeout: 120_000, // Longer timeout for comprehensive tests

  use: {
    baseURL,
    headless: false, // HEADED MODE - User must see the browser
    bypassCSP: true,
    trace: 'on', // Always record trace
    screenshot: 'on', // Always take screenshots
    video: 'on', // Always record video
    viewport: { width: 1280, height: 720 },
  },

  expect: {
    timeout: 10_000,
  },

  projects: [
    {
      name: 'proof-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  outputDir: 'test-results/proof',

  // Always generate reports
  reporter: [
    ['html', { outputFolder: 'playwright-report/proof', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/proof/results.json' }]
  ],
})

