#!/usr/bin/env tsx
/**
 * E2E Test Prerequisites Checker
 * 
 * Validates that all required dependencies and services are available
 * before running E2E tests. Provides helpful guidance for missing components.
 * 
 * Usage:
 *   pnpm tsx scripts/e2e/check-prerequisites.ts
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
  fix?: string
}

const checks: CheckResult[] = []

// Check Docker availability
function checkDocker(): CheckResult {
  try {
    execSync('docker --version', { stdio: 'ignore' })
    try {
      execSync('docker ps', { stdio: 'ignore' })
      return {
        name: 'Docker',
        status: 'pass',
        message: 'Docker is installed and running',
      }
    } catch {
      return {
        name: 'Docker',
        status: 'warn',
        message: 'Docker is installed but daemon is not running',
        fix: 'Start Docker Desktop or run: sudo systemctl start docker',
      }
    }
  } catch {
    return {
      name: 'Docker',
      status: 'fail',
      message: 'Docker is not installed or not in PATH',
      fix: 'Install Docker Desktop: https://docs.docker.com/desktop',
    }
  }
}

// Check Supabase CLI
function checkSupabaseCLI(): CheckResult {
  try {
    execSync('supabase --version', { stdio: 'ignore' })
    return {
      name: 'Supabase CLI',
      status: 'pass',
      message: 'Supabase CLI is installed',
    }
  } catch {
    return {
      name: 'Supabase CLI',
      status: 'warn',
      message: 'Supabase CLI not found (optional if using remote Supabase)',
      fix: 'Install with: pnpm add -D supabase',
    }
  }
}

// Check Node.js version
function checkNodeVersion(): CheckResult {
  try {
    const version = execSync('node --version', { encoding: 'utf-8' }).trim()
    const major = parseInt(version.replace('v', '').split('.')[0])
    if (major >= 18) {
      return {
        name: 'Node.js',
        status: 'pass',
        message: `Node.js ${version} is installed`,
      }
    }
    return {
      name: 'Node.js',
      status: 'fail',
      message: `Node.js ${version} is too old (requires >= 18)`,
      fix: 'Update Node.js: https://nodejs.org/',
    }
  } catch {
    return {
      name: 'Node.js',
      status: 'fail',
      message: 'Node.js is not installed',
      fix: 'Install Node.js 18+: https://nodejs.org/',
    }
  }
}

// Check Playwright browsers
function checkPlaywrightBrowsers(): CheckResult {
  try {
    const playwrightPath = resolve(process.cwd(), 'node_modules', '@playwright', 'test')
    if (!existsSync(playwrightPath)) {
      return {
        name: 'Playwright',
        status: 'fail',
        message: 'Playwright is not installed',
        fix: 'Run: pnpm install',
      }
    }
    
    try {
      execSync('pnpm exec playwright --version', { stdio: 'ignore' })
      return {
        name: 'Playwright',
        status: 'pass',
        message: 'Playwright is installed',
      }
    } catch {
      return {
        name: 'Playwright',
        status: 'warn',
        message: 'Playwright browsers may not be installed',
        fix: 'Run: pnpm exec playwright install --with-deps',
      }
    }
  } catch {
    return {
      name: 'Playwright',
      status: 'fail',
      message: 'Playwright is not installed',
      fix: 'Run: pnpm install',
    }
  }
}

// Check environment variables
function checkEnvironmentVariables(): CheckResult {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SECRET_KEY',
  ]
  
  const optional = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ]
  
  const missing = required.filter(key => !process.env[key])
  const hasOptional = optional.some(key => process.env[key])
  
  if (missing.length === 0) {
    return {
      name: 'Environment Variables',
      status: 'pass',
      message: 'Required environment variables are set',
    }
  }
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const isRemote = supabaseUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(supabaseUrl)
  
  if (isRemote) {
    return {
      name: 'Environment Variables',
      status: missing.length > 0 ? 'fail' : 'warn',
      message: `Missing: ${missing.join(', ')}`,
      fix: missing.includes('SUPABASE_URL')
        ? 'Set SUPABASE_URL to your remote Supabase project URL'
        : 'Set SUPABASE_SECRET_KEY from your Supabase project settings',
    }
  }
  
  return {
    name: 'Environment Variables',
    status: 'fail',
    message: `Missing: ${missing.join(', ')}`,
    fix: 'Create .env.e2e file or set environment variables. See docs/testing/CLOUD_E2E_SETUP.md',
  }
}

// Check local Supabase connection
async function checkLocalSupabase(): Promise<CheckResult> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return {
      name: 'Local Supabase',
      status: 'warn',
      message: 'Cannot check (SUPABASE_URL not set)',
    }
  }
  
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(supabaseUrl)
  if (!isLocal) {
    return {
      name: 'Local Supabase',
      status: 'pass',
      message: 'Using remote Supabase (cloud mode)',
    }
  }
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    
    if (response.status === 200 || response.status === 401) {
      return {
        name: 'Local Supabase',
        status: 'pass',
        message: 'Local Supabase is running',
      }
    }
  } catch {
    // fetch failed - Supabase not running
  }
  
  return {
    name: 'Local Supabase',
    status: 'fail',
    message: 'Local Supabase is not running',
    fix: 'Start Supabase with: pnpm db:start',
  }
}

// Check remote Supabase connection
async function checkRemoteSupabase(): Promise<CheckResult> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return {
      name: 'Remote Supabase',
      status: 'warn',
      message: 'Cannot check (SUPABASE_URL not set)',
    }
  }
  
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(supabaseUrl)
  if (isLocal) {
    return {
      name: 'Remote Supabase',
      status: 'pass',
      message: 'Using local Supabase (Docker mode)',
    }
  }
  
  const allowRemote = process.env.E2E_ALLOW_REMOTE_SUPABASE === 'true' ||
                     process.env.CI === 'true' ||
                     process.env.CURSOR === 'true' ||
                     process.env.CODEX === 'true'
  
  if (!allowRemote) {
    return {
      name: 'Remote Supabase',
      status: 'warn',
      message: 'Remote Supabase detected but E2E_ALLOW_REMOTE_SUPABASE not set',
      fix: 'Set E2E_ALLOW_REMOTE_SUPABASE=true to enable cloud E2E testing',
    }
  }
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      signal: controller.signal,
      headers: {
        'apikey': process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      },
    })
    clearTimeout(timeout)
    
    if (response.status === 200 || response.status === 401) {
      return {
        name: 'Remote Supabase',
        status: 'pass',
        message: 'Remote Supabase is accessible',
      }
    }
    
    return {
      name: 'Remote Supabase',
      status: 'fail',
      message: `Remote Supabase returned status ${response.status}`,
      fix: 'Check your SUPABASE_URL and API keys',
    }
  } catch (error: any) {
    return {
      name: 'Remote Supabase',
      status: 'fail',
      message: `Cannot connect to remote Supabase: ${error.message}`,
      fix: 'Verify SUPABASE_URL is correct and network access is available',
    }
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking E2E test prerequisites...\n')
  
  checks.push(checkNodeVersion())
  checks.push(checkPlaywrightBrowsers())
  checks.push(checkDocker())
  checks.push(checkSupabaseCLI())
  checks.push(checkEnvironmentVariables())
  checks.push(await checkLocalSupabase())
  checks.push(await checkRemoteSupabase())
  
  console.log('\n📋 Results:\n')
  
  let hasFailures = false
  let hasWarnings = false
  
  for (const check of checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌'
    console.log(`${icon} ${check.name}: ${check.message}`)
    
    if (check.fix) {
      console.log(`   💡 Fix: ${check.fix}`)
    }
    
    if (check.status === 'fail') hasFailures = true
    if (check.status === 'warn') hasWarnings = true
  }
  
  console.log('\n' + '='.repeat(60))
  
  if (hasFailures) {
    console.log('❌ Some prerequisites are missing. Please fix the issues above.')
    process.exit(1)
  } else if (hasWarnings) {
    console.log('⚠️  All critical prerequisites met, but some warnings above.')
    console.log('   E2E tests may still work, but review warnings for best results.')
    process.exit(0)
  } else {
    console.log('✅ All prerequisites are met! You can run: pnpm e2e')
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('❌ Error checking prerequisites:', error)
  process.exit(1)
})
