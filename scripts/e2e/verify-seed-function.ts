#!/usr/bin/env tsx
/**
 * Verify the seed_e2e_profile function exists and refresh PostgREST cache
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

console.log('🔍 Verifying seed_e2e_profile function...')

// Check if function exists by querying pg_proc
const { data: funcCheck, error: funcError } = await supabase.rpc('exec_sql', {
  query: `
    SELECT proname, pronamespace::regnamespace as schema_name
    FROM pg_proc
    WHERE proname = 'seed_e2e_profile'
    AND pronamespace::regnamespace::text = 'public';
  `
}).catch(async () => {
  // exec_sql might not exist, try direct query via REST API
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SECRET_KEY,
      'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`
    },
    body: JSON.stringify({
      query: `SELECT proname FROM pg_proc WHERE proname = 'seed_e2e_profile'`
    })
  })
  
  if (response.ok) {
    return { data: await response.json(), error: null }
  }
  return { data: null, error: 'Could not check function' }
})

if (funcError) {
  console.log('⚠️  Could not verify function via RPC, trying direct call...')
  
  // Try calling the function directly to see if it exists
  const testCall = await supabase.rpc('seed_e2e_profile', {
    p_auth_user_id: '00000000-0000-0000-0000-000000000000' as any,
    p_email: 'test@test.com',
    p_full_name: 'Test',
    p_role: 'customer'
  }).catch((err: any) => {
    return { error: err }
  })
  
  if (testCall.error) {
    const errorMsg = testCall.error.message || String(testCall.error)
    if (errorMsg.includes('Could not find the function')) {
      console.error('❌ Function does not exist in PostgREST schema cache')
      console.error('   This might be a schema cache issue. Try:')
      console.error('   1. Wait a few seconds and try again')
      console.error('   2. Restart PostgREST (if you have access)')
      console.error('   3. Verify the function was created: SELECT * FROM pg_proc WHERE proname = \'seed_e2e_profile\';')
    } else {
      console.log('✅ Function exists! (Got expected error for test call)')
      console.log(`   Error: ${errorMsg}`)
    }
  } else {
    console.log('✅ Function exists and is callable!')
  }
} else {
  console.log('✅ Function verified in database')
}

// Try to refresh PostgREST schema cache by calling a simple RPC
console.log('\n🔄 Attempting to refresh PostgREST schema cache...')
await supabase.rpc('seed_e2e_profile', {
  p_auth_user_id: '00000000-0000-0000-0000-000000000000' as any,
  p_email: 'cache-refresh@test.com',
  p_full_name: 'Cache Refresh',
  p_role: 'customer'
}).catch(() => {
  // Expected to fail, but this might refresh the cache
})

console.log('✅ Verification complete')
