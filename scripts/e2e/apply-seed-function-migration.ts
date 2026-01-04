#!/usr/bin/env tsx
/**
 * Apply the seed_e2e_profile function migration directly via service role
 * This bypasses the need for Supabase CLI access token
 */

import fs from 'node:fs'
import path from 'node:path'
import { getRuntimeMode } from '../../src/env/runtimeMode'
import { loadEnvFile } from '../../src/env/loadEnv'
import { createSupabaseAdminClient } from './createSupabaseAdmin'

// Load exactly one env file according to runtime mode
// For E2E scripts, default to e2e mode if not explicitly set
if (!process.env.RUNTIME_MODE && !process.env.DOTENV_CONFIG_PATH) {
  process.env.RUNTIME_MODE = 'e2e'
}
const mode = getRuntimeMode()
loadEnvFile(mode)

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

const supabase = createSupabaseAdminClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

// Read the migration SQL
const migrationPath = path.resolve(process.cwd(), 'supabase', 'migrations', '20260103120000_create_seed_profile_function.sql')
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

console.log('📦 Applying seed_e2e_profile function migration...')
console.log(`   Supabase URL: ${SUPABASE_URL}`)

// Execute the migration SQL via RPC (using a function that executes raw SQL)
// Since we can't execute raw SQL directly, we'll use the REST API
const sqlStatements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && !s.startsWith('BEGIN') && !s.startsWith('COMMIT'))

// For each SQL statement, we need to execute it
// The service role can execute SQL via the REST API
const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SECRET_KEY,
    'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`
  },
  body: JSON.stringify({ query: migrationSQL })
}).catch(async () => {
  // If exec_sql doesn't exist, try direct SQL execution via pg_net or create the function manually
  console.log('   Using direct SQL execution...')
  
  // Extract just the CREATE FUNCTION statement
  const functionSQL = migrationSQL
    .replace(/^BEGIN;?\s*/i, '')
    .replace(/COMMIT;?\s*$/i, '')
    .trim()
  
  // Use Supabase's REST API to execute via postgREST
  // Actually, we need to use the management API or create a helper function
  // For now, let's create the function using a simpler approach - via the admin client's RPC
  // But actually, we can't execute DDL via RPC easily...
  
  // Best approach: Use the Supabase management API if available, or create a temporary function
  // that can execute SQL, or use psql via a script
  
  // For now, let's try using the REST API with a direct SQL endpoint if it exists
  // Otherwise, we'll need to guide the user to run it manually
  
  throw new Error('Direct SQL execution not available via REST API. Please run the migration manually or use Supabase CLI.')
})

if (response.ok) {
  console.log('✅ Migration applied successfully!')
  process.exit(0)
} else {
  const errorText = await response.text()
  console.error(`❌ Migration failed: ${errorText}`)
  console.error('\n💡 Alternative: Run this SQL manually in Supabase SQL Editor:')
  console.error('\n' + migrationSQL)
  process.exit(1)
}
