#!/usr/bin/env tsx
/**
 * All-in-One E2E Test Runner
 * 
 * This script:
 * 1. Checks prerequisites
 * 2. Syncs environment variables from .env to .env.e2e if needed
 * 3. Seeds test users
 * 4. Runs E2E tests
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

const envE2EPath = path.resolve(process.cwd(), '.env.e2e')
const envPaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
]

console.log('🚀 Starting E2E test run...\n')

// Step 1: Check if .env.e2e exists and has correct config, if not try to create/update it
const requiredVars = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

let needsSync = false
if (fs.existsSync(envE2EPath)) {
  // Check if .env.e2e has localhost but we're in a cloud environment
  const e2eEnv = dotenv.config({ path: envE2EPath }).parsed || {}
  const supabaseUrl = e2eEnv.SUPABASE_URL || e2eEnv.NEXT_PUBLIC_SUPABASE_URL || ''
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl)
  const isCloudEnv = process.env.CI === 'true' || process.env.CURSOR === 'true' || process.env.CODEX === 'true' || 
                     process.env.DOCKER === 'true' || process.cwd().includes('/workspace')
  
  // If we have localhost in cloud env, or missing vars, we need to sync
  if ((isLocalhost && isCloudEnv) || !requiredVars.every(v => e2eEnv[v])) {
    needsSync = true
    console.log('📝 .env.e2e needs updating (localhost in cloud env or missing vars)')
  }
} else {
  needsSync = true
  console.log('📝 .env.e2e not found, checking for .env files or environment variables...')
}

if (needsSync) {
  const envPath = envPaths.find(p => fs.existsSync(p))
  if (envPath) {
    console.log(`✅ Found ${path.basename(envPath)}, syncing to .env.e2e...`)
    try {
      execSync('pnpm e2e:sync-env', { stdio: 'inherit' })
    } catch (error) {
      console.error('❌ Failed to sync environment variables')
      process.exit(1)
    }
  } else {
    // Check if env vars are in process.env
    const hasVars = requiredVars.every(v => process.env[v])
    
    if (!hasVars) {
      console.error('❌ No .env file found and required environment variables are missing')
      console.error('   Please create .env.e2e or set these environment variables:')
      requiredVars.forEach(v => console.error(`     - ${v}`))
      process.exit(1)
    } else {
      console.log('✅ Required environment variables found in process.env')
      // Create minimal .env.e2e from process.env
      const lines = [
        '# E2E Test Environment Configuration',
        '# Auto-generated from process.env',
        '',
        'E2E=true',
        '',
      ]
      
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const isRemote = !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl)
      
      if (isRemote) {
        lines.push('E2E_ALLOW_REMOTE_SUPABASE=true')
        lines.push('')
      }
      
      lines.push('# Supabase Configuration')
      requiredVars.forEach(key => {
        const value = process.env[key]
        if (value) {
          lines.push(`${key}=${value}`)
        }
      })
      
      if (process.env.BASE_URL) {
        lines.push('')
        lines.push(`BASE_URL=${process.env.BASE_URL}`)
      } else {
        lines.push('')
        lines.push('BASE_URL=http://localhost:3000')
      }
      
      fs.writeFileSync(envE2EPath, lines.join('\n') + '\n')
      console.log('✅ Created .env.e2e from environment variables')
      if (isRemote) {
        console.log('⚠️  Remote Supabase detected - E2E_ALLOW_REMOTE_SUPABASE=true set')
      }
    }
  }
}

// Step 2: Check prerequisites
console.log('\n🔍 Checking prerequisites...')
try {
  execSync('pnpm e2e:check', { stdio: 'inherit' })
} catch (error) {
  console.error('\n❌ Prerequisites check failed')
  console.error('   Fix the issues above before running tests')
  process.exit(1)
}

// Step 3: Seed test users (unless skipped)
if (process.env.E2E_SKIP_SEED !== 'true') {
  console.log('\n🌱 Seeding test users...')
  try {
    execSync('pnpm e2e:seed', { stdio: 'inherit' })
  } catch (error: any) {
    // Check if it's a connection error
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('connect')) {
      console.error('\n❌ Cannot connect to Supabase')
      console.error('   Make sure Supabase is running (pnpm db:start) or use a remote instance')
      console.error('   For remote Supabase, ensure E2E_ALLOW_REMOTE_SUPABASE=true in .env.e2e')
    } else {
      console.error('\n❌ Failed to seed test users')
    }
    process.exit(1)
  }
} else {
  console.log('\n⏭️  Skipping user seeding (E2E_SKIP_SEED=true)')
}

// Step 4: Run E2E tests
console.log('\n🧪 Running E2E tests...\n')

const testArgs = process.argv.slice(2).join(' ')
const testCommand = testArgs ? `pnpm e2e -- ${testArgs}` : 'pnpm e2e'

try {
  execSync(testCommand, { stdio: 'inherit' })
  console.log('\n✅ E2E tests completed successfully!')
} catch (error) {
  console.error('\n❌ E2E tests failed')
  process.exit(1)
}

