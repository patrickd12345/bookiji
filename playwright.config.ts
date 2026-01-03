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
  // Do not override explicitly provided environment variables (e.g. BASE_URL for remote/prod runs).
  dotenv.config({ path: envE2EPath, override: false })
} else {
  // Fall back to .env.local or .env if .env.e2e doesn't exist
  const envPath = envPaths.find(p => fs.existsSync(p))
  if (envPath) {
    dotenv.config({ path: envPath, override: false })
    console.warn(`⚠️  Using ${path.basename(envPath)} instead of .env.e2e for E2E tests`)
    console.warn('   Run `pnpm e2e:sync-env` to create .env.e2e from your .env file')
  }
}

if (process.env.E2E !== 'true') {
  throw new Error('Refusing to run Playwright without `E2E=true` (use `.env.e2e` or `.env`).')
}

const baseURL = process.env.BASE_URL || 'http://localhost:3000'

/**
 * By default this repo's E2E suite expects a Supabase instance (local by default).
 *
 * For "navigation-only" runs against a remote/prod BASE_URL, allow opting out of
 * Supabase requirements so UI traversal can still execute and role-based tests
 * can self-skip via skipIfSupabaseUnavailable().
 */
const allowNoSupabase = process.env.E2E_ALLOW_NO_SUPABASE === 'true' || process.env.E2E_NAVIGATION_ONLY === 'true'
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL

if (!allowNoSupabase) {
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
    console.warn(`⚠️  Running E2E against remote Supabase: ${supabaseUrl}`)
    console.warn(`   Ensure this is a test/staging instance, not production!`)
  }
} else if (!supabaseUrl) {
  console.warn('⚠️  E2E_ALLOW_NO_SUPABASE=true: skipping Supabase environment validation.')
  console.warn('   Only Supabase-free tests should be executed in this mode.\n')
}

const isLocalBaseURL = (() => {
  try {
    const origin = new URL(baseURL).origin
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  } catch {
    return false
  }
})()

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './playwright.global-setup.ts',

  // Performance: Use parallel workers when Supabase is available, sequential when not
  // Check if Supabase is likely available (not a perfect check, but helps)
  fullyParallel: process.env.E2E_SKIP_SEED !== 'true',
  workers: process.env.E2E_SKIP_SEED === 'true' ? 1 : 2, // Use 2 workers if Supabase available
  retries: 1,
  timeout: 60_000, // Reduced from 120s to 60s - fail faster

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
    // Only run other browsers if explicitly requested (saves time)
    ...(process.env.E2E_ALL_BROWSERS === 'true' ? [
      {
        name: 'firefox',
        use: devices['Desktop Firefox'],
      },
      {
        name: 'webkit',
        use: devices['Desktop Safari'],
      },
    ] : []),
  ],

  // If BASE_URL is remote (staging/prod), do not attempt to start a local dev server.
  // The suite should be able to run against an externally-hosted environment.
  webServer: isLocalBaseURL
    ? {
        command: fs.existsSync(envE2EPath) ? 'npx dotenv-cli -e .env.e2e -- npm run dev' : 'npm run dev',
        port: 3000,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
})
