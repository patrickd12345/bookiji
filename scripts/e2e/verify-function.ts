#!/usr/bin/env tsx
/**
 * Verify the seed_e2e_profile function exists
 */

import dotenv from 'dotenv'
import path from 'node:path'
import fs from 'node:fs'
import { createSupabaseAdminClient } from './createSupabaseAdmin'

// Load .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: false })
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY')
  process.exit(1)
}

const supabase = createSupabaseAdminClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

console.log('🔍 Checking if seed_e2e_profile function exists...')

// Try to call the function with test parameters to see if it exists
try {
  const { data, error } = await supabase.rpc('seed_e2e_profile', {
    p_auth_user_id: '00000000-0000-0000-0000-000000000000' as any,
    p_email: 'test@test.com',
    p_full_name: 'Test',
    p_role: 'customer'
  })
  
  if (error) {
    if (error.message?.includes('Could not find the function')) {
      console.error('❌ Function does not exist in schema cache')
      console.error('   This means the migration may not have been applied correctly')
    } else {
      console.log('✅ Function exists! (Error is expected for test UUID)')
      console.log(`   Error: ${error.message}`)
    }
  } else {
    console.log('✅ Function exists and is callable!')
  }
} catch (err) {
  console.error(`❌ Error checking function: ${err}`)
}

// Also try to query pg_proc directly via SQL
console.log('\n🔍 Querying database for function...')
const { data: funcData, error: funcError } = await supabase
  .from('_realtime')
  .select('*')
  .limit(0)
  .then(() => {
    // If we can query, try a raw SQL query via RPC if available
    return supabase.rpc('exec_sql', { 
      query: "SELECT proname, pronamespace::regnamespace as schema FROM pg_proc WHERE proname = 'seed_e2e_profile'" 
    } as any).catch(() => ({ data: null, error: { message: 'Cannot query pg_proc directly' } }))
  })
  .catch(() => ({ data: null, error: { message: 'Cannot execute SQL query' } }))

if (funcData) {
  console.log('   Function found:', funcData)
} else {
  console.log('   Could not query function directly')
}

console.log('\n💡 If function does not exist, the migration may need to be applied again.')
console.log('   Run: pnpm tsx scripts/e2e/apply-migration-direct.ts')
