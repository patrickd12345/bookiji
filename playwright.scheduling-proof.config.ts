// playwright.scheduling-proof.config.ts
// Configuration for scheduling proof test
// Runs in headed mode with video recording to playwright/videos/

import { defineConfig, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { getRuntimeMode } from './src/env/runtimeMode'
import { loadEnvFile } from './src/env/loadEnv'

// Load exactly one env file according to runtime mode
// For Playwright, default to e2e mode if not explicitly set
if (!process.env.RUNTIME_MODE && !process.env.DOTENV_CONFIG_PATH) {
  process.env.RUNTIME_MODE = 'e2e'
}
const mode = getRuntimeMode()
loadEnvFile(mode)

if (process.env.E2E !== 'true') {
  throw new Error('Refusing to run Playwright without `E2E=true` (use `.env.e2e`).')
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl || !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl)) {
  throw new Error(`Refusing to run E2E against non-local Supabase: ${supabaseUrl ?? '(missing)'}`)
}

const baseURL = process.env.BASE_URL || 'http://localhost:3000'

// Ensure videos directory exists
const videosDir = path.resolve(process.cwd(), 'playwright', 'videos')
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true })
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/scheduling-proof.spec.ts',

  fullyParallel: false, // Run sequentially
  retries: 0, // No retries - we want to see failures
  timeout: 120_000, // Longer timeout for comprehensive tests

  use: {
    baseURL,
    headless: false, // HEADED MODE - User must see the browser
    bypassCSP: true,
    trace: 'retain-on-failure', // Trace only when failures occur
    screenshot: 'on', // Always take screenshots
    video: 'on',
    viewport: { width: 1280, height: 720 },
  },

  expect: {
    timeout: 10_000,
  },

  projects: [
    {
      name: 'scheduling-proof-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  // Videos will be saved to outputDir/{project}/{test}.webm
  // Set outputDir to playwright/videos to match requirement
  outputDir: 'playwright/videos',

  // Always generate reports
  reporter: [
    ['html', { outputFolder: 'playwright-report/scheduling-proof', open: 'never' }],
    ['list'],
  ],
})

