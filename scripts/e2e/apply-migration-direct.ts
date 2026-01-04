#!/usr/bin/env tsx
/**
 * Apply migration directly using service role key
 * Executes SQL via Supabase REST API or direct PostgreSQL connection
 * 
 * Usage:
 *   For production: RUNTIME_MODE=prod ALLOW_PROD_MUTATIONS=true pnpm tsx scripts/e2e/apply-migration-direct.ts
 *   For local/staging: RUNTIME_MODE=dev pnpm tsx scripts/e2e/apply-migration-direct.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import { getRuntimeMode } from '../../src/env/runtimeMode'
import { loadEnvFile } from '../../src/env/loadEnv'
import { assertProdMutationAllowed } from '../../src/env/productionGuards'

// Load exactly one env file according to runtime mode
const mode = getRuntimeMode()
loadEnvFile(mode)

// If production, require explicit opt-in
if (mode === 'prod') {
  assertProdMutationAllowed('apply-migration-direct')
  console.log('')
  console.log('=== PROD MUTATION MODE ENABLED ===')
  console.log('Applying migration to production database')
  console.log('')
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY')
  process.exit(1)
}

// Read migration SQL
const migrationPath = path.resolve(process.cwd(), 'supabase', 'migrations', '20260103120000_create_seed_profile_function.sql')
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

console.log('📦 Applying seed_e2e_profile function migration...')
console.log(`   Supabase URL: ${SUPABASE_URL}`)

// Extract the function creation SQL (remove BEGIN/COMMIT)
const functionSQL = migrationSQL
  .replace(/^BEGIN;?\s*/i, '')
  .replace(/COMMIT;?\s*$/i, '')
  .trim()

// Try to execute via Supabase Management API
// The management API endpoint for executing SQL is typically at /v1/projects/{ref}/sql
// But we need the project ref from the URL
const urlMatch = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)
if (!urlMatch) {
  console.error('❌ Could not extract project ref from Supabase URL')
  console.error('\n💡 Please run this SQL manually in Supabase SQL Editor:')
  console.error('\n' + functionSQL)
  process.exit(1)
}

const projectRef = urlMatch[1]
const managementAPI = `https://api.supabase.com/v1/projects/${projectRef}/sql`

console.log(`   Using Management API: ${managementAPI}`)

// Execute SQL via Management API
const response = await fetch(managementAPI, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
    'apikey': SUPABASE_SECRET_KEY
  },
  body: JSON.stringify({
    query: functionSQL
  })
})

if (response.ok) {
  const result = await response.json()
  console.log('✅ Migration applied successfully!')
  console.log(`   Result: ${JSON.stringify(result)}`)
  process.exit(0)
} else {
  const errorText = await response.text()
  console.error(`❌ Management API failed (${response.status}): ${errorText}`)
  
  // Try alternative: Use direct PostgreSQL connection if DATABASE_URL is available
  const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
  if (DATABASE_URL) {
    console.log('\n🔄 Trying direct PostgreSQL connection...')
    try {
      // Dynamic import of pg to avoid requiring it as a dependency if not available
      const { Client } = await import('pg')
      const client = new Client({ connectionString: DATABASE_URL })
      await client.connect()
      
      // Execute the entire SQL as one statement (don't split on semicolons - dollar quotes break)
      console.log(`   Executing migration SQL...`)
      await client.query(functionSQL)
      
      // Verify function was created
      const verifyResult = await client.query(`
        SELECT proname, pronamespace::regnamespace as schema 
        FROM pg_proc 
        WHERE proname = 'seed_e2e_profile'
      `)
      
      if (verifyResult.rows.length > 0) {
        console.log('✅ Migration applied via direct PostgreSQL connection!')
        console.log(`   Function verified: ${verifyResult.rows[0].schema}.${verifyResult.rows[0].proname}`)
      } else {
        console.error('❌ Function was not created (verification failed)')
      }
      
      await client.end()
      process.exit(verifyResult.rows.length > 0 ? 0 : 1)
    } catch (pgError) {
      console.error(`❌ PostgreSQL connection failed: ${pgError}`)
    }
  }
  
  console.error('\n💡 Please run this SQL manually in Supabase SQL Editor:')
  console.error('\n' + functionSQL)
  process.exit(1)
}
