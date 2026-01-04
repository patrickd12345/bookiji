#!/usr/bin/env tsx
/**
 * Navigation Completeness Test Runner
 * 
 * Runs the navigation completeness and runtime sanity test against bookiji.com
 * This test verifies all navigation paths are reachable and pages don't have runtime errors.
 * 
 * Usage:
 *   pnpm tsx scripts/e2e/run-navigation-completeness.ts
 */

import { execSync } from 'node:child_process'
import path from 'node:path'
import { getRuntimeMode } from '../../src/env/runtimeMode'
import { loadEnvFile } from '../../src/env/loadEnv'
import { logRuntimeBanner } from '../../src/env/runtimeBanner'

const ARTIFACT_DIR = path.resolve(process.cwd(), 'playwright', 'navigation-artifacts')

console.log('🧭 Running Navigation Completeness Test against bookiji.com\n')
console.log('   This will test all roles: guest, customer, vendor, admin')
console.log('   Entry points: /, /main (guest), /customer/dashboard, /vendor/dashboard, /admin\n')

// Set runtime mode and load env explicitly (read-only for production)
process.env.RUNTIME_MODE = process.env.RUNTIME_MODE || 'prod'
const mode = getRuntimeMode()
loadEnvFile(mode)
logRuntimeBanner()

// Set environment variables
process.env.E2E = 'true'
process.env.BASE_URL = 'https://bookiji.com'

// Production read-only: allow remote Supabase but do not seed
process.env.E2E_ALLOW_REMOTE_SUPABASE = 'true'
process.env.E2E_SKIP_SEED = 'true'

// Prefer explicit admin credentials for production traversal (matches DB seed migration).
process.env.E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@bookiji.com'
process.env.E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Taratata!1232123'

console.log('📋 Configuration:')
console.log(`   BASE_URL: ${process.env.BASE_URL}`)
console.log(`   Artifacts will be saved to: ${ARTIFACT_DIR}\n`)

try {
  // Run the navigation completeness test
  execSync(
    'pnpm e2e tests/e2e/navigation-completeness-and-sanity.spec.ts',
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        E2E: 'true',
        BASE_URL: 'https://bookiji.com',
        E2E_ALLOW_REMOTE_SUPABASE: 'true',
        // Allow seeding for production test users
      },
    }
  )
  
  console.log('\n✅ Navigation completeness test completed!')
  console.log(`\n📁 Artifacts saved to: ${ARTIFACT_DIR}`)
  console.log('   - navigation-graph.json (all roles)')
  console.log('   - navigation-graph.{guest|customer|vendor|admin}.json (per-role)')
  console.log('   - navigation-orphans.json (unreachable routes)')
  console.log('   - runtime-failures.json (all roles)')
  console.log('   - runtime-failures.{guest|customer|vendor|admin}.json (per-role)')
  console.log('   - summary.md (human-readable report)')
} catch (error) {
  console.error('\n❌ Navigation completeness test failed')
  console.error(`\n📁 Check artifacts in: ${ARTIFACT_DIR}`)
  process.exit(1)
}
