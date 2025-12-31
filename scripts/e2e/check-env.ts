#!/usr/bin/env tsx
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

const envPath = path.resolve('.env.e2e')

if (!fs.existsSync(envPath)) {
  console.error('❌ Missing .env.e2e file. Create it before running E2E checks.')
  process.exit(1)
}

const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'))

const supabaseUrl = parsed.SUPABASE_URL || parsed.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = parsed.SUPABASE_SERVICE_ROLE_KEY
const anonKey = parsed.SUPABASE_ANON_KEY || parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const baseUrl = parsed.E2E_BASE_URL || 'http://localhost:3000'

const missing: string[] = []

function requireVar(name: string, value: string | undefined) {
  if (!value) {
    missing.push(name)
  }
}

requireVar('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)', supabaseUrl)
requireVar('SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey)
requireVar('SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)', anonKey)
requireVar('E2E_BASE_URL', baseUrl)

const isLocalSupabase = supabaseUrl?.includes('localhost') || supabaseUrl?.includes('127.0.0.1')

if (!isLocalSupabase && parsed.E2E_ALLOW_REMOTE_SUPABASE !== 'true') {
  missing.push('E2E_ALLOW_REMOTE_SUPABASE (set to true for remote Supabase)')
}

if (missing.length > 0) {
  console.error('❌ E2E prerequisites are incomplete:')
  for (const item of missing) {
    console.error(` - ${item}`)
  }
  console.error('\nAdd the missing values to .env.e2e or run pnpm e2e:setup-remote to configure a remote Supabase project.')
  process.exit(1)
}

console.log('✅ .env.e2e is present')
console.log(`✅ Supabase URL configured: ${supabaseUrl}`)
console.log(`✅ Service role key set: ${maskValue(serviceRoleKey)}`)
console.log(`✅ Public anon key set: ${maskValue(anonKey)}`)
console.log(`✅ E2E base URL set: ${baseUrl}`)

if (!isLocalSupabase) {
  console.log('ℹ️  Remote Supabase detected; E2E_ALLOW_REMOTE_SUPABASE is enabled.')
} else {
  console.log('ℹ️  Using local Supabase settings from .env.e2e')
}

function maskValue(value: string | undefined): string {
  if (!value) return '(not set)'
  if (value.length <= 8) return '*'.repeat(value.length)
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}
