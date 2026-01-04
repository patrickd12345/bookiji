#!/usr/bin/env tsx
/**
 * Minimal test script to verify Supabase admin connection with timeout handling.
 * 
 * Usage:
 *   pnpm tsx scripts/e2e/test-admin-connection.ts
 * 
 * This script tests:
 * 1. IPv4 normalization (localhost -> 127.0.0.1)
 * 2. Timeout configuration (60s)
 * 3. Error diagnostics for connection failures
 */

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
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL')
  process.exit(1)
}

if (!SUPABASE_SECRET_KEY) {
  console.error('❌ Missing SUPABASE_SECRET_KEY')
  process.exit(1)
}

console.log('🔍 Testing Supabase admin connection...')
console.log(`   URL: ${SUPABASE_URL}`)
console.log(`   Key: ${SUPABASE_SECRET_KEY.substring(0, 20)}...`)
console.log('')

const supabase = createSupabaseAdminClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  timeoutMs: 60000,
  forceIPv4: true
})

async function testConnection() {
  try {
    console.log('📡 Testing listUsers (admin API)...')
    const startTime = Date.now()
    
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    })
    
    const duration = Date.now() - startTime
    
    if (error) {
      console.error(`❌ Error: ${error.message}`)
      process.exit(1)
    }
    
    console.log(`✅ Connection successful! (${duration}ms)`)
    console.log(`   Found ${data?.users?.length || 0} user(s)`)
    console.log('')
    
    // Test createUser as well
    console.log('📡 Testing createUser (admin API)...')
    const testEmail = `test-${Date.now()}@bookiji.test`
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })
    
    if (createError) {
      console.error(`❌ Create user error: ${createError.message}`)
      process.exit(1)
    }
    
    console.log(`✅ Create user successful!`)
    console.log(`   Created: ${newUser?.user?.email} (${newUser?.user?.id})`)
    
    // Clean up test user
    if (newUser?.user?.id) {
      await supabase.auth.admin.deleteUser(newUser.user.id)
      console.log(`   ✅ Cleaned up test user`)
    }
    
    console.log('')
    console.log('✅ All tests passed!')
    
  } catch (error: any) {
    console.error('')
    console.error('❌ Connection test failed:')
    console.error('')
    console.error(error.message || String(error))
    console.error('')
    
    if (error.code === 'UND_ERR_HEADERS_TIMEOUT') {
      console.error('💡 This is a headers timeout error. The diagnostics above should help.')
    }
    
    process.exit(1)
  }
}

testConnection()

