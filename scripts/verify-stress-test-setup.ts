#!/usr/bin/env tsx
/**
 * Verify stress test setup
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:55321'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verify() {
  console.log('🔍 Verifying stress test setup...\n')

  // Check partner_api_keys table
  const { data: apiKeys, error: apiKeysError } = await supabase
    .from('partner_api_keys')
    .select('*, partners(*)')
    .eq('is_active', true)
    .limit(1)

  if (apiKeysError) {
    console.error('❌ partner_api_keys table error:', apiKeysError)
    return false
  }

  if (!apiKeys || apiKeys.length === 0) {
    console.error('❌ No active partner API keys found')
    return false
  }

  console.log('✅ partner_api_keys table accessible')
  console.log(`   Found ${apiKeys.length} active API key(s)`)

  // Check partners table
  const { data: partners, error: partnersError } = await supabase
    .from('partners')
    .select('*')
    .eq('is_active', true)
    .limit(1)

  if (partnersError) {
    console.error('❌ partners table error:', partnersError)
    return false
  }

  console.log('✅ partners table accessible')
  console.log(`   Found ${partners?.length || 0} active partner(s)`)

  // Check profiles (vendors/requesters)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .in('role', ['vendor', 'customer'])
    .limit(2)

  if (profilesError) {
    console.error('❌ profiles table error:', profilesError)
    return false
  }

  console.log('✅ profiles table accessible')
  console.log(`   Found ${profiles?.length || 0} test user(s)`)

  const vendors = profiles?.filter(p => p.role === 'vendor') || []
  const requesters = profiles?.filter(p => p.role === 'customer') || []

  console.log(`   - Vendors: ${vendors.length}`)
  console.log(`   - Requesters: ${requesters.length}`)

  console.log('\n✅ All checks passed!')
  console.log('\nTest Credentials:')
  if (apiKeys[0]) {
    console.log(`  Partner API Key: ${apiKeys[0].api_key}`)
  }
  if (vendors[0]) {
    console.log(`  Vendor ID: ${vendors[0].id}`)
  }
  if (requesters[0]) {
    console.log(`  Requester ID: ${requesters[0].id}`)
  }

  return true
}

verify().then(success => {
  process.exit(success ? 0 : 1)
})
