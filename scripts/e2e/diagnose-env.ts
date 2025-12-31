#!/usr/bin/env tsx
/**
 * E2E Environment Diagnostics
 * 
 * Checks what environment variables and files are available for E2E testing.
 */

import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

console.log('🔍 E2E Environment Diagnostics\n')

// Check environment
const isCloudEnv = 
  process.env.CI === 'true' || 
  process.env.CURSOR === 'true' || 
  process.env.CODEX === 'true' || 
  process.env.DOCKER === 'true' || 
  process.cwd().includes('/workspace') ||
  process.cwd().includes('/tmp') ||
  fs.existsSync('/.dockerenv')

console.log('Environment Detection:')
console.log(`  Current directory: ${process.cwd()}`)
console.log(`  Cloud environment: ${isCloudEnv ? '✅ Yes' : '❌ No'}`)
console.log(`  CI: ${process.env.CI || 'not set'}`)
console.log(`  CURSOR: ${process.env.CURSOR || 'not set'}`)
console.log(`  CODEX: ${process.env.CODEX || 'not set'}`)
console.log(`  DOCKER: ${process.env.DOCKER || 'not set'}`)
console.log(`  /.dockerenv exists: ${fs.existsSync('/.dockerenv') ? '✅ Yes' : '❌ No'}`)
console.log('')

// Check .env files
const envFiles = [
  '.env.e2e',
  '.env.local',
  '.env',
  'env.local',
  'env',
]

console.log('Environment Files:')
for (const file of envFiles) {
  const filePath = path.resolve(process.cwd(), file)
  const exists = fs.existsSync(filePath)
  console.log(`  ${file}: ${exists ? '✅ Found' : '❌ Not found'}`)
  
  if (exists && file === '.env.e2e') {
    const env = dotenv.config({ path: filePath }).parsed || {}
    const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'not set'
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl)
    console.log(`    Supabase URL: ${supabaseUrl}`)
    console.log(`    Is localhost: ${isLocalhost ? '⚠️  Yes' : '✅ No (remote)'}`)
    console.log(`    E2E_ALLOW_REMOTE_SUPABASE: ${env.E2E_ALLOW_REMOTE_SUPABASE || 'not set'}`)
  }
}
console.log('')

// Check required environment variables
const requiredVars = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
]

console.log('Required Environment Variables:')
let allPresent = true
for (const varName of requiredVars) {
  const value = process.env[varName]
  const present = !!value
  allPresent = allPresent && present
  if (present) {
    // Show first/last few chars for security
    const displayValue = value.length > 20 
      ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}`
      : value
    console.log(`  ${varName}: ✅ ${displayValue}`)
  } else {
    console.log(`  ${varName}: ❌ Not set`)
  }
}
console.log('')

// Summary
console.log('Summary:')
if (isCloudEnv) {
  console.log('  ⚠️  Running in cloud environment')
  if (allPresent) {
    console.log('  ✅ All required environment variables are set')
    console.log('  💡 Run: pnpm e2e:force-remote to update .env.e2e')
  } else {
    console.log('  ❌ Missing required environment variables')
    console.log('  💡 Set these environment variables or create a .env file')
  }
} else {
  console.log('  ℹ️  Running in local environment')
  if (allPresent) {
    console.log('  ✅ All required environment variables are set')
  } else {
    console.log('  ⚠️  Some environment variables are missing (may be in .env file)')
  }
}

