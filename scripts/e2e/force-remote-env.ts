#!/usr/bin/env tsx
/**
 * Force Update .env.e2e for Remote Supabase
 * 
 * Updates .env.e2e to use remote Supabase from environment variables.
 * Useful when .env.e2e has localhost but you're in a cloud environment.
 */

import fs from 'node:fs'
import path from 'node:path'

const envE2EPath = path.resolve(process.cwd(), '.env.e2e')
const requiredVars = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

// Check if all required vars are in process.env
const missingVars = requiredVars.filter(v => !process.env[v])
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingVars.forEach(v => console.error(`   - ${v}`))
  console.error('\nSet these environment variables and try again.')
  process.exit(1)
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const isRemote = !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl)

if (!isRemote) {
  console.warn('⚠️  Supabase URL appears to be localhost. Are you sure you want to use this?')
}

const lines = [
  '# E2E Test Environment Configuration',
  '# Force-updated from environment variables',
  '#',
  '# Run: pnpm e2e:sync-env to sync from .env file instead',
  '',
  'E2E=true',
  '',
]

if (isRemote) {
  lines.push('# Remote Supabase detected - enabling remote mode')
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

console.log('✅ Updated .env.e2e from environment variables')
if (isRemote) {
  console.log('⚠️  Remote Supabase detected - E2E_ALLOW_REMOTE_SUPABASE=true set')
  console.log(`   Supabase URL: ${supabaseUrl}`)
} else {
  console.log('ℹ️  Local Supabase detected')
}

