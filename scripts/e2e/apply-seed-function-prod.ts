#!/usr/bin/env tsx
/**
 * Apply seed_e2e_profile function to production Supabase using Supabase CLI or direct psql
 * 
 * This script:
 * 1. Uses DATABASE_URL from .env.local if available (preferred)
 * 2. Or constructs connection from SUPABASE_URL + SUPABASE_DB_PASSWORD
 * 3. Creates the SECURITY DEFINER function seed_e2e_profile
 * 4. Notifies PostgREST to reload schema cache
 * 
 * Usage:
 *   pnpm tsx scripts/e2e/apply-seed-function-prod.ts
 * 
 * Environment Variables (from .env.local):
 *   DATABASE_URL - Full PostgreSQL connection string (preferred)
 *   OR SUPABASE_URL + SUPABASE_DB_PASSWORD
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as dotenv from 'dotenv'

// Load .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: false })
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF

if (!SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

// Use DATABASE_URL if available (preferred), otherwise construct from SUPABASE_URL + password
let dbUrl: string
if (DATABASE_URL) {
  dbUrl = DATABASE_URL
  console.log('📦 Using DATABASE_URL from .env.local')
} else if (SUPABASE_DB_PASSWORD) {
  // Derive project ref from URL if not provided
  let projectRef = SUPABASE_PROJECT_REF
  if (!projectRef) {
    const urlMatch = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)
    if (!urlMatch) {
      console.error('❌ Could not extract project ref from SUPABASE_URL')
      console.error(`   URL: ${SUPABASE_URL}`)
      console.error('   Expected format: https://[PROJECT_REF].supabase.co')
      process.exit(1)
    }
    projectRef = urlMatch[1]
  }
  
  // Construct production PostgreSQL connection string
  dbUrl = `postgresql://postgres.${projectRef}:${SUPABASE_DB_PASSWORD}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`
  console.log(`📦 Constructed database URL from SUPABASE_URL + password`)
} else {
  console.error('❌ Missing DATABASE_URL or (SUPABASE_DB_PASSWORD + SUPABASE_URL)')
  console.error('   Options:')
  console.error('   1. Set DATABASE_URL in .env.local (preferred)')
  console.error('   2. Set SUPABASE_DB_PASSWORD in .env.local')
  console.error('   Get password from: Supabase Dashboard → Your Project → Settings → Database → Connection string')
  process.exit(1)
}

console.log('📦 Applying seed_e2e_profile function to production...')

// Function SQL with SET search_path = public
const functionSQL = `
CREATE OR REPLACE FUNCTION public.seed_e2e_profile(
  p_auth_user_id uuid,
  p_email text,
  p_full_name text,
  p_role text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, auth_user_id, email, full_name, role, created_at, updated_at)
  VALUES (p_auth_user_id, p_auth_user_id, p_email, p_full_name, p_role, now(), now())
  ON CONFLICT (auth_user_id)
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();
END;
$$;

-- Grant execute on the function to service_role (defensive; function is SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.seed_e2e_profile(uuid, text, text, text) TO service_role, supabase_admin;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
`

;(async () => {
  try {
    const { Client } = await import('pg')
    const client = new Client({ connectionString: dbUrl })
    await client.connect()
    
    console.log('   ✅ Connected to database')
    
    // Execute function creation
    console.log('   📝 Creating function...')
    await client.query(functionSQL)
    
    // Verify function was created
    const verifyResult = await client.query(`
      SELECT proname, pronamespace::regnamespace as schema 
      FROM pg_proc 
      WHERE proname = 'seed_e2e_profile'
    `)
    
    if (verifyResult.rows.length === 0) {
      await client.end()
      throw new Error('Function was not created (verification failed)')
    }
    
    console.log(`   ✅ Function created: ${verifyResult.rows[0].schema}.${verifyResult.rows[0].proname}`)
    
    // Notify PostgREST to reload schema cache (multiple times for reliability)
    console.log('   🔄 Notifying PostgREST to reload schema cache...')
    for (let i = 0; i < 3; i++) {
      await client.query(`NOTIFY pgrst, 'reload schema'`)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    await client.end()
    
    console.log('')
    console.log('✅ Migration applied successfully!')
    console.log('   Function seed_e2e_profile is installed and schema cache reload notified.')
    console.log('')
    console.log('⚠️  Note: PostgREST schema cache may take 10-30 seconds to refresh.')
    console.log('   If seeding fails immediately, wait 30 seconds and retry.')
    console.log('')
    console.log('Next steps:')
    console.log('  1. Wait 10-30 seconds for schema cache to refresh')
    console.log('  2. Run: pnpm e2e:seed')
    console.log('  3. Run: pnpm e2e:navigation')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('')
    console.error(`❌ Failed to apply migration: ${errMsg}`)
    console.error('')
    console.error('Troubleshooting:')
    console.error('  - Verify DATABASE_URL or SUPABASE_DB_PASSWORD is correct')
    console.error('  - Check that database is accessible from your network')
    console.error('  - Ensure project is not paused in Supabase dashboard')
    process.exit(1)
  }
})()
