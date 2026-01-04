#!/usr/bin/env tsx
// @env-allow-legacy-dotenv
/**
 * Seed minimal test data for stress tests
 * Creates: 1 partner, 1 partner API key, 1 vendor, 1 requester
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:55321'
// Local Supabase default service role key (JWT format)
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seedStressTestData() {
  console.log('🌱 Seeding stress test data...')
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`)

  try {
    // 1. Create partner
    console.log('\n1. Creating partner...')
    let { data: partner, error: partnerError } = await supabase
      .from('partners')
      .insert({
        name: 'Test Partner',
        email: 'partner@test.bookiji.com',
        is_active: true
      })
      .select()
      .single()

    if (partnerError) {
      if (partnerError.code === '23505') {
        // Partner already exists, fetch it
        const { data: existing } = await supabase
          .from('partners')
          .select()
          .eq('email', 'partner@test.bookiji.com')
          .single()
        if (existing) {
          console.log('✅ Partner already exists:', existing.id)
          partner = existing
        } else {
          throw partnerError
        }
      } else {
        throw partnerError
      }
    } else {
      console.log('✅ Created partner:', partner.id)
    }

    // 2. Create partner API key
    console.log('\n2. Creating partner API key...')
    const testApiKey = 'test-partner-api-key-' + Date.now()
    let { data: apiKey, error: apiKeyError } = await supabase
      .from('partner_api_keys')
      .insert({
        partner_id: partner.id,
        api_key: testApiKey,
        name: 'Test API Key',
        is_active: true
      })
      .select()
      .single()

    if (apiKeyError) {
      if (apiKeyError.code === '23505') {
        // API key already exists, fetch it
        const { data: existing } = await supabase
          .from('partner_api_keys')
          .select()
          .eq('partner_id', partner.id)
          .eq('is_active', true)
          .single()
        if (existing) {
          console.log('✅ Partner API key already exists:', existing.api_key)
          apiKey = existing
        } else {
          throw apiKeyError
        }
      } else {
        throw apiKeyError
      }
    } else {
      console.log('✅ Created partner API key:', apiKey.api_key)
    }

    // 3. Create vendor (auth user + profile)
    console.log('\n3. Creating vendor...')
    const vendorEmail = 'vendor@test.bookiji.com'
    const vendorPassword = 'test-vendor-password-123'

    // Create auth user
    const { data: vendorAuth, error: vendorAuthError } = await supabase.auth.admin.createUser({
      email: vendorEmail,
      password: vendorPassword,
      email_confirm: true,
      user_metadata: { role: 'vendor' }
    })

    if (vendorAuthError && !vendorAuthError.message.includes('already registered')) {
      throw vendorAuthError
    }

    let vendorAuthId = vendorAuth?.user?.id
    if (!vendorAuthId) {
      // User exists, fetch it
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const existing = users?.find((u: { email?: string }) => u.email === vendorEmail)
      if (existing) {
        vendorAuthId = existing.id
      } else {
        throw new Error('Failed to create or find vendor auth user')
      }
    }

    // Create profile
    const { data: vendorProfile, error: vendorProfileError } = await supabase
      .from('profiles')
      .upsert({
        auth_user_id: vendorAuthId,
        email: vendorEmail,
        full_name: 'Test Vendor',
        role: 'vendor'
      }, {
        onConflict: 'auth_user_id'
      })
      .select()
      .single()

    if (vendorProfileError) {
      throw vendorProfileError
    }
    console.log('✅ Created vendor:', vendorProfile.id)

    // 4. Create requester/customer (auth user + profile)
    console.log('\n4. Creating requester...')
    const requesterEmail = 'requester@test.bookiji.com'
    const requesterPassword = 'test-requester-password-123'

    // Create auth user
    const { data: requesterAuth, error: requesterAuthError } = await supabase.auth.admin.createUser({
      email: requesterEmail,
      password: requesterPassword,
      email_confirm: true,
      user_metadata: { role: 'customer' }
    })

    if (requesterAuthError && !requesterAuthError.message.includes('already registered')) {
      throw requesterAuthError
    }

    let requesterAuthId = requesterAuth?.user?.id
    if (!requesterAuthId) {
      // User exists, fetch it
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const existing = users?.find((u: { email?: string }) => u.email === requesterEmail)
      if (existing) {
        requesterAuthId = existing.id
      } else {
        throw new Error('Failed to create or find requester auth user')
      }
    }

    // Create profile
    const { data: requesterProfile, error: requesterProfileError } = await supabase
      .from('profiles')
      .upsert({
        auth_user_id: requesterAuthId,
        email: requesterEmail,
        full_name: 'Test Requester',
        role: 'customer'
      }, {
        onConflict: 'auth_user_id'
      })
      .select()
      .single()

    if (requesterProfileError) {
      throw requesterProfileError
    }
    console.log('✅ Created requester:', requesterProfile.id)

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('✅ Stress test data seeded successfully!')
    console.log('='.repeat(50))
    console.log('\nTest Credentials:')
    console.log(`  Partner API Key: ${apiKey.api_key}`)
    console.log(`  Vendor ID: ${vendorProfile.id}`)
    console.log(`  Vendor Email: ${vendorEmail}`)
    console.log(`  Requester ID: ${requesterProfile.id}`)
    console.log(`  Requester Email: ${requesterEmail}`)
    console.log('\nEnvironment Variables:')
    console.log(`  SUPABASE_URL=${SUPABASE_URL}`)
    console.log(`  SUPABASE_SECRET_KEY=${SUPABASE_SECRET_KEY.substring(0, 20)}...`)

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seedStressTestData()
