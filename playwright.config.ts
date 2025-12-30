// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

// Load .env.e2e if it exists, otherwise fall back to .env or .env.local
const envE2EPath = path.resolve(process.cwd(), '.env.e2e')
const envPaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
]

if (fs.existsSync(envE2EPath)) {
  dotenv.config({ path: envE2EPath, override: true })
} else {
  // Fall back to .env.local or .env if .env.e2e doesn't exist
  const envPath = envPaths.find(p => fs.existsSync(p))
  if (envPath) {
    dotenv.config({ path: envPath, override: true })
    console.warn(`⚠️  Using ${path.basename(envPath)} instead of .env.e2e for E2E tests`)
    console.warn('   Run `pnpm e2e:sync-env` to create .env.e2e from your .env file')
  }
}

if (process.env.E2E !== 'true') {
  throw new Error('Refusing to run Playwright without `E2E=true` (use `.env.e2e` or `.env`).')
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl) {
  throw new Error(`Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL`)
}

// Allow remote Supabase when explicitly enabled or in cloud environments
const allowRemoteSupabase = 
  process.env.E2E_ALLOW_REMOTE_SUPABASE === 'true' ||
  process.env.CI === 'true' ||
  process.env.CURSOR === 'true' ||
  process.env.CODEX === 'true'

const isLocalSupabase = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl)

if (!isLocalSupabase && !allowRemoteSupabase) {
  throw new Error(
    `Refusing to run E2E against non-local Supabase: ${supabaseUrl}\n` +
    `Set E2E_ALLOW_REMOTE_SUPABASE=true to allow remote Supabase, or use a local instance.`
  )
}

if (!isLocalSupabase) {
  console.warn(`⚠️  Using remote Supabase: ${supabaseUrl}`)
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
    command: fs.existsSync(envE2EPath) 
      ? 'npx dotenv-cli -e .env.e2e -- npm run dev'
      : 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
