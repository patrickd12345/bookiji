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

import dotenv from 'dotenv'
import path from 'node:path'
import fs from 'node:fs'
import { createSupabaseAdminClient } from './createSupabaseAdmin'

// Load environment variables
const envPaths = [
  path.resolve(process.cwd(), '.env.e2e'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
]

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL')
  process.exit(1)
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log('🔍 Testing Supabase admin connection...')
console.log(`   URL: ${SUPABASE_URL}`)
console.log(`   Key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`)
console.log('')

const supabase = createSupabaseAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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

