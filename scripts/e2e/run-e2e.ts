#!/usr/bin/env tsx
/**
 * All-in-One E2E Test Runner
 * 
 * This script:
 * 1. Auto-detects environment and fixes .env.e2e configuration
 * 2. Checks prerequisites
 * 3. Seeds test users
 * 4. Runs E2E tests
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

// Helper to wait (for async operations)
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const envE2EPath = path.resolve(process.cwd(), '.env.e2e')
// Priority order: .env.local first (most specific), then .env, then backups
const envPaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'env.local'),
  path.resolve(process.cwd(), 'env'),
  // Check backup files as last resort
  path.resolve(process.cwd(), '.env.local.bak'),
  path.resolve(process.cwd(), '.env.bak'),
]

console.log('🚀 Starting E2E test run...\n')

// Step 0: Protect .env.local (restore from backup if missing)
const envLocalPath = path.resolve(process.cwd(), '.env.local')
const envLocalBakPath = path.resolve(process.cwd(), '.env.local.bak')
if (!fs.existsSync(envLocalPath) && fs.existsSync(envLocalBakPath)) {
  console.log('⚠️  .env.local missing, restoring from .env.local.bak...')
  try {
    fs.copyFileSync(envLocalBakPath, envLocalPath)
    console.log('✅ Restored .env.local from backup\n')
  } catch (error) {
    console.warn('⚠️  Failed to restore .env.local from backup\n')
  }
}

// Step 1: Auto-detect and fix configuration
const requiredVars = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SECRET_KEY', // or SUPABASE_SERVICE_ROLE_KEY for backward compatibility
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY', // or NEXT_PUBLIC_SUPABASE_ANON_KEY for backward compatibility
]

// Detect cloud environment (more comprehensive)
const isCloudEnv = 
  process.env.CI === 'true' || 
  process.env.CURSOR === 'true' || 
  process.env.CODEX === 'true' || 
  process.env.DOCKER === 'true' ||
  process.env.GITHUB_ACTIONS === 'true' ||
  process.cwd().includes('/workspace') ||
  process.cwd().includes('/tmp') ||
  fs.existsSync('/.dockerenv') ||
  fs.existsSync('/.gitpod') ||
  (process.env.HOME && process.env.HOME.includes('codespace'))

// Load all potential env sources
const loadEnvFromFiles = () => {
  const envVars: Record<string, string> = {}
  const foundFiles: string[] = []
  
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      foundFiles.push(path.basename(envPath))
      try {
        const loaded = dotenv.config({ path: envPath }).parsed || {}
        Object.assign(envVars, loaded)
      } catch (error) {
        console.warn(`⚠️  Failed to load ${path.basename(envPath)}: ${error}`)
      }
    }
  }
  
  if (foundFiles.length > 0) {
    console.log(`   Found env files: ${foundFiles.join(', ')}`)
  }
  
  return envVars
}

// Get all available env vars (from files + process.env)
const fileEnvVars = loadEnvFromFiles()
const allEnvVars = { ...fileEnvVars, ...process.env }

// Helper to check for variables with backward compatibility
const hasVar = (name: string, altName?: string): boolean => {
  return !!(allEnvVars[name] || (altName && allEnvVars[altName]))
}

// Check if we have all required vars from any source (with backward compatibility)
const hasSupabaseSecretKey = hasVar('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY')
const hasSupabasePublishableKey = hasVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
const hasAllRequiredVars = 
  hasVar('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL') &&
  hasSupabaseSecretKey &&
  hasSupabasePublishableKey

let needsSync = false
let syncReason = ''

if (fs.existsSync(envE2EPath)) {
  const e2eEnv = dotenv.config({ path: envE2EPath }).parsed || {}
  const supabaseUrl = e2eEnv.SUPABASE_URL || e2eEnv.NEXT_PUBLIC_SUPABASE_URL || ''
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl)
  
  // Check if we have localhost in cloud env
  if (isLocalhost && isCloudEnv) {
    needsSync = true
    syncReason = 'localhost in cloud environment'
  } 
  // Check if required vars are missing (with backward compatibility)
  const e2eHasSecretKey = !!(e2eEnv.SUPABASE_SECRET_KEY || e2eEnv.SUPABASE_SERVICE_ROLE_KEY)
  const e2eHasPublishableKey = !!(e2eEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || e2eEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const e2eHasUrl = !!(e2eEnv.SUPABASE_URL || e2eEnv.NEXT_PUBLIC_SUPABASE_URL)
  
  if (!e2eHasUrl || !e2eHasSecretKey || !e2eHasPublishableKey) {
    needsSync = true
    syncReason = 'missing required variables'
  }
  // Check if we have better credentials available elsewhere
  // BUT: Don't overwrite localhost if .env.e2e already has all required vars and we're not in cloud
  else if (hasAllRequiredVars) {
    const remoteUrl = allEnvVars.SUPABASE_URL || allEnvVars.NEXT_PUBLIC_SUPABASE_URL || ''
    const isRemote = remoteUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(remoteUrl)
    // Only sync to remote if we're in a cloud environment AND .env.e2e has localhost
    // Otherwise, preserve the existing .env.e2e configuration
    if (isRemote && isLocalhost && isCloudEnv) {
      needsSync = true
      syncReason = 'remote credentials available but .env.e2e has localhost (cloud environment)'
    }
    // If .env.e2e has localhost and we're NOT in cloud, keep it (local development)
    // If .env.e2e has all required vars, keep it as-is
  }
} else {
  needsSync = true
  syncReason = '.env.e2e not found'
}

if (needsSync) {
  console.log(`📝 ${syncReason}, attempting to fix...`)
  
  // Debug: Show what we found
  console.log('   Checking for credentials...')
  const foundInFiles = requiredVars.filter(v => fileEnvVars[v])
  const foundInEnv = requiredVars.filter(v => process.env[v] && !fileEnvVars[v])
  
  if (foundInFiles.length > 0) {
    console.log(`   ✅ Found in files: ${foundInFiles.join(', ')}`)
  }
  if (foundInEnv.length > 0) {
    console.log(`   ✅ Found in env: ${foundInEnv.join(', ')}`)
  }
  
  if (!hasAllRequiredVars) {
    console.error('\n❌ Cannot find remote Supabase credentials!')
    console.error('   Required variables:')
    requiredVars.forEach(v => {
      const hasVar = !!allEnvVars[v]
      const source = fileEnvVars[v] ? 'file' : (process.env[v] ? 'env' : 'missing')
      console.error(`     ${hasVar ? '✅' : '❌'} ${v}${hasVar ? ` (from ${source})` : ''}`)
    })
    
    // Show what files we checked
    console.error('\n   Checked files:')
    envPaths.forEach(p => {
      const exists = fs.existsSync(p)
      console.error(`     ${exists ? '✅' : '❌'} ${path.basename(p)}`)
    })
    
    console.error('\n   Options:')
    console.error('   1. Create a .env or .env.local file with remote Supabase credentials')
    console.error('   2. Set environment variables:')
    requiredVars.forEach(v => console.error(`      export ${v}=your-value`))
    console.error('   3. Run: pnpm e2e:diagnose (to see what\'s available)')
    process.exit(1)
  }
  
  // We have all required vars, create/update .env.e2e
  console.log('✅ Found all required Supabase credentials')
  
  // Determine source
  const source = envPaths.find(p => fs.existsSync(p)) 
    ? `file (${path.basename(envPaths.find(p => fs.existsSync(p))!)})`
    : 'environment variables'
  console.log(`   Source: ${source}`)
  
  // Create .env.e2e
  const lines = [
    '# E2E Test Environment Configuration',
    '# Auto-generated by pnpm e2e:all',
    `# Source: ${source}`,
    '',
    'E2E=true',
    '',
  ]
  
  const supabaseUrl = allEnvVars.SUPABASE_URL || allEnvVars.NEXT_PUBLIC_SUPABASE_URL || ''
  const isRemote = supabaseUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl)
  
  if (isRemote) {
    lines.push('# Remote Supabase detected - enabling remote mode')
    lines.push('E2E_ALLOW_REMOTE_SUPABASE=true')
    lines.push('')
  }
  
  lines.push('# Supabase Configuration')
  // Use new variable names, with fallback to old names
  const supabaseUrl = allEnvVars.SUPABASE_URL || allEnvVars.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecretKey = allEnvVars.SUPABASE_SECRET_KEY || allEnvVars.SUPABASE_SERVICE_ROLE_KEY
  const supabasePublishableKey = allEnvVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || allEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (supabaseUrl) lines.push(`SUPABASE_URL=${supabaseUrl}`)
  if (supabaseUrl && supabaseUrl !== allEnvVars.NEXT_PUBLIC_SUPABASE_URL) {
    lines.push(`NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`)
  }
  if (supabaseSecretKey) lines.push(`SUPABASE_SECRET_KEY=${supabaseSecretKey}`)
  if (supabasePublishableKey) lines.push(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=${supabasePublishableKey}`)

  // Optional E2E credential overrides
  const credentialVars = [
    'E2E_VENDOR_EMAIL',
    'E2E_VENDOR_PASSWORD',
    'E2E_CUSTOMER_EMAIL',
    'E2E_CUSTOMER_PASSWORD',
    'E2E_ADMIN_EMAIL',
    'E2E_ADMIN_PASSWORD',
  ]

  const presentCredentialVars = credentialVars.filter(key => allEnvVars[key])
  if (presentCredentialVars.length > 0) {
    lines.push('')
    lines.push('# E2E Credential Overrides')
    presentCredentialVars.forEach(key => {
      lines.push(`${key}=${allEnvVars[key]}`)
    })
  }
  
  // Preserve BASE_URL if set, otherwise use default
  if (allEnvVars.BASE_URL) {
    lines.push('')
    lines.push(`BASE_URL=${allEnvVars.BASE_URL}`)
  } else if (allEnvVars.E2E_BASE_URL) {
    lines.push('')
    lines.push(`BASE_URL=${allEnvVars.E2E_BASE_URL}`)
  } else {
    lines.push('')
    lines.push('BASE_URL=http://localhost:3000')
  }
  
  // Preserve E2E_SKIP_SEED if set
  if (allEnvVars.E2E_SKIP_SEED) {
    lines.push('')
    lines.push(`E2E_SKIP_SEED=${allEnvVars.E2E_SKIP_SEED}`)
  }
  
  fs.writeFileSync(envE2EPath, lines.join('\n') + '\n')
  console.log('✅ Updated .env.e2e')
  if (isRemote) {
    console.log('⚠️  Remote Supabase detected - E2E_ALLOW_REMOTE_SUPABASE=true set')
    console.log(`   Supabase URL: ${supabaseUrl}`)
  } else {
    console.log('ℹ️  Local Supabase detected')
  }
  console.log('')
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

// Step 2.5: Check Supabase connectivity before seeding (async wrapper)
await (async () => {
const supabaseUrl = allEnvVars.SUPABASE_URL || allEnvVars.NEXT_PUBLIC_SUPABASE_URL || ''
const isLocalSupabase = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl)

if (isLocalSupabase && process.env.E2E_SKIP_SEED !== 'true') {
  console.log('\n🔍 Checking if local Supabase is running...')
  
  // Try to check Supabase status
  let supabaseRunning = false
  try {
    const statusOutput = execSync('npx supabase status', { 
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10000 
    })
    // Check if status shows running services
    if (statusOutput.includes('API URL:') || statusOutput.includes('DB URL:')) {
      supabaseRunning = true
      console.log('✅ Local Supabase is running')
    }
  } catch (error) {
    // Supabase CLI not available or containers not running
    console.log('⚠️  Could not verify Supabase status (Docker may not be running)')
  }
  
  // If we can't verify, try a quick HTTP connection test
  if (!supabaseRunning) {
    try {
      // Simple HTTP check - try to reach the API endpoint
      const testUrl = supabaseUrl.replace(/\/$/, '') + '/rest/v1/'
      const curlResult = execSync(
        `curl -s -o nul -w "%{http_code}" --max-time 3 "${testUrl}"`,
        { encoding: 'utf-8', timeout: 5000, stdio: 'pipe', shell: true }
      )
      if (curlResult.trim() === '200' || curlResult.trim() === '401' || curlResult.trim() === '404') {
        // Any response means the server is reachable
        supabaseRunning = true
        console.log('✅ Local Supabase is reachable')
      }
    } catch (error) {
      // curl failed or timeout - server not reachable
    }
    
    if (!supabaseRunning) {
      console.log('⚠️  Local Supabase is not reachable')
      console.log('')
      
      // Try to auto-start Supabase if Docker is available
      let dockerAvailable = false
      try {
        execSync('docker --version', { stdio: 'pipe', timeout: 3000 })
        dockerAvailable = true
      } catch {
        // Docker not available
      }
      
      if (dockerAvailable && !process.env.E2E_NO_AUTO_START) {
        console.log('🚀 Attempting to start Supabase automatically...')
        try {
          // Start Supabase in background (non-blocking)
          console.log('   Running: pnpm db:start')
          execSync('pnpm db:start', { 
            stdio: 'inherit',
            timeout: 120_000 // 2 minutes max for startup
          })
          
          // Wait a bit for services to be ready
          console.log('   Waiting for Supabase to be ready...')
          await wait(5000)
          
          // Verify it's running now
          try {
            const statusOutput = execSync('npx supabase status', { 
              encoding: 'utf-8',
              stdio: 'pipe',
              timeout: 10000 
            })
            if (statusOutput.includes('API URL:') || statusOutput.includes('DB URL:')) {
              supabaseRunning = true
              console.log('✅ Supabase started successfully!')
            }
          } catch {
            // Status check failed, but might still be starting
            console.log('   ⏳ Supabase is starting (may take a moment)...')
            // Try one more time after a longer wait
            await wait(10000)
            try {
              const testUrl = supabaseUrl.replace(/\/$/, '') + '/rest/v1/'
              const curlResult = execSync(
                `curl -s -o nul -w "%{http_code}" --max-time 3 "${testUrl}"`,
                { encoding: 'utf-8', timeout: 5000, stdio: 'pipe', shell: true }
              )
              if (curlResult.trim() === '200' || curlResult.trim() === '401' || curlResult.trim() === '404') {
                supabaseRunning = true
                console.log('✅ Supabase is now reachable!')
              }
            } catch {
              // Still not ready
            }
          }
        } catch (error: any) {
          console.log('   ❌ Failed to start Supabase automatically')
          if (error.message?.includes('Docker') || error.message?.includes('docker')) {
            console.log('   💡 Docker may not be running. Start Docker Desktop and try again.')
          }
        }
      }
      
      if (!supabaseRunning) {
        console.log('')
        console.log('💡 Options:')
        if (dockerAvailable) {
          console.log('  1. Start Supabase manually: pnpm db:start')
          console.log('  2. Use remote Supabase: pnpm e2e:setup-remote')
        } else {
          console.log('  1. Use remote Supabase (recommended): pnpm e2e:setup-remote')
          console.log('     → Get a free Supabase project at https://app.supabase.com')
        }
        console.log('  3. Skip seeding (if users already exist): E2E_SKIP_SEED=true pnpm e2e:all')
        console.log('')
        console.log('⏭️  Auto-skipping seeding and continuing with tests...')
        console.log('   (Tests may fail if required users don\'t exist)')
        console.log('   (Supabase-dependent tests will be automatically skipped)')
        console.log('   (Set E2E_NO_AUTO_START=true to skip auto-start attempts)')
        process.env.E2E_SKIP_SEED = 'true'
        process.env.E2E_SKIP_SUPABASE_TESTS = 'true'
      }
    }
  }
}
})() // End async IIFE

// Step 3: Seed test users (unless skipped)
if (process.env.E2E_SKIP_SEED !== 'true') {
  console.log('\n🌱 Seeding test users...')
  try {
    execSync('pnpm e2e:seed', { stdio: 'inherit' })
    console.log('✅ User seeding completed')
  } catch (error: any) {
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || error.message || ''
    
    // Check for timeout or connection errors
    if (errorOutput.includes('Connection timeout') ||
        errorOutput.includes('timeout') ||
        errorOutput.includes('ECONNREFUSED') ||
        errorOutput.includes('Cannot connect') ||
        errorOutput.includes('UND_ERR_HEADERS_TIMEOUT')) {
      console.error('\n❌ Cannot connect to Supabase for seeding')
      console.error('')
      console.error('💡 Options:')
      console.error('  1. Start local Supabase: pnpm db:start')
      console.error('  2. Use remote Supabase: pnpm e2e:setup-remote')
      console.error('  3. Skip seeding: E2E_SKIP_SEED=true pnpm e2e:all')
      console.error('')
      
      // If it's a local Supabase, auto-skip and continue
      if (isLocalSupabase) {
        console.error('⚠️  Auto-skipping seeding and continuing with tests...')
        console.error('   (Tests may fail if required users don\'t exist)')
        console.error('   (Supabase-dependent tests will be automatically skipped)')
        process.env.E2E_SKIP_SEED = 'true'
        process.env.E2E_SKIP_SUPABASE_TESTS = 'true'
      } else {
        // Remote Supabase - this is more serious
        console.error('❌ Cannot connect to remote Supabase')
        console.error('   Verify:')
        console.error('   - SUPABASE_URL is correct')
        console.error('   - Project is active (not paused) in Supabase dashboard')
        console.error('   - Network can reach Supabase')
        console.error('   - API keys are valid')
        process.exit(1)
      }
    } else {
      // Other seeding error (not connectivity)
      console.error('\n❌ Failed to seed test users')
      console.error('   Error:', errorOutput.substring(0, 500))
      process.exit(1)
    }
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

