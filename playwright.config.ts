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
const allowRemoteSupabase = process.env.E2E_ALLOW_REMOTE_SUPABASE === 'true' || 
                            process.env.CI === 'true' || 
                            process.env.CURSOR === 'true' ||
                            process.env.CODEX === 'true'

if (!supabaseUrl) {
  throw new Error(`E2E requires SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL`)
}

const isLocalSupabase = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl)
if (!isLocalSupabase && !allowRemoteSupabase) {
  throw new Error(
    `Refusing to run E2E against non-local Supabase: ${supabaseUrl}\n` +
    `Set E2E_ALLOW_REMOTE_SUPABASE=true to allow remote Supabase (e.g., for cloud environments).`
  )
}

if (!isLocalSupabase) {
  console.warn(`⚠️  Running E2E against remote Supabase: ${supabaseUrl}`)
  console.warn(`   Ensure this is a test/staging instance, not production!`)
}

const baseURL = process.env.BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './playwright.global-setup.ts',

  // Full-suite stability: avoid overloading local Next.js + Supabase on Windows.
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 120_000,

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
    command: 'npx dotenv-cli -e .env.e2e -- npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
