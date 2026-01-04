#!/usr/bin/env tsx
import { execSync } from 'node:child_process'
import { getRuntimeMode } from '../../src/env/runtimeMode'
import { loadEnvFile } from '../../src/env/loadEnv'

const mode = getRuntimeMode()
if (mode !== 'e2e' && mode !== 'dev') {
  throw new Error('reset-local-supabase must only be run in e2e or dev mode')
}

// Load env for the chosen mode
loadEnvFile(mode)

console.log('Stopping local supabase (if running)...')
try {
  execSync('supabase stop', { stdio: 'inherit' })
} catch {
  // ignore
}

console.log('Resetting local supabase database (destructive, local only)...')
execSync('supabase db reset --confirm', { stdio: 'inherit' })

console.log('Applying migrations to local supabase...')
execSync('supabase db push', { stdio: 'inherit' })

console.log('Restarting local supabase...')
execSync('supabase start', { stdio: 'inherit' })

console.log('Local supabase reset complete.')

