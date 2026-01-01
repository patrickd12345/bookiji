#!/usr/bin/env tsx
/**
 * Stress Test Data Seeding
 * 
 * Creates minimal test data required for stress tests:
 * - 1 partner
 * - 1 partner_api_key (active)
 * - 1 vendor (profile with role='vendor')
 * - 1 requester (profile with role='customer')
 * 
 * Usage:
 *   pnpm tsx scripts/seed-stress-test-data.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env.e2e' })

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SECRET_KEY must be set')
  console.error('   Set them in .env.local or .env.e2e')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seedStressTestData() {
  console.log('🌱 Seeding stress test data...')
  console.log('=====================================')
  
  try {
    // 1. Create partner
    console.log('\n1. Creating partner...')
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .insert({
        name: 'Stress Test Partner',
        description: 'Partner for stress testing',
        is_active: true,
      })
      .select()
      .single()
    
    if (partnerError) {
      // Check if partner already exists
      if (partnerError.code === '23505') {
        console.log('   Partner already exists, fetching...')
        const { data: existingPartner } = await supabase
          .from('partners')
          .select()
          .eq('name', 'Stress Test Partner')
          .single()
        
        if (existingPartner) {
          console.log(`   ✅ Using existing partner: ${existingPartner.id}`)
          var partnerId = existingPartner.id
        } else {
          throw partnerError
        }
      } else {
        throw partnerError
      }
    } else {
      console.log(`   ✅ Created partner: ${partner.id}`)
      var partnerId = partner.id
    }
    
    // 2. Create partner API key
    console.log('\n2. Creating partner API key...')
    const testApiKey = `test_stress_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const { data: apiKey, error: apiKeyError } = await supabase
      .from('partner_api_keys')
      .insert({
        partner_id: partnerId,
        api_key: testApiKey,
        name: 'Stress Test API Key',
        is_active: true,
        expires_at: null, // Never expires for testing
      })
      .select()
      .single()
    
    if (apiKeyError) {
      if (apiKeyError.code === '23505') {
        console.log('   API key already exists, fetching...')
        const { data: existingKey } = await supabase
          .from('partner_api_keys')
          .select()
          .eq('partner_id', partnerId)
          .eq('is_active', true)
          .single()
        
        if (existingKey) {
          console.log(`   ✅ Using existing API key: ${existingKey.api_key.substring(0, 20)}...`)
          var finalApiKey = existingKey.api_key
        } else {
          throw apiKeyError
        }
      } else {
        throw apiKeyError
      }
    } else {
      console.log(`   ✅ Created API key: ${testApiKey}`)
      var finalApiKey = testApiKey
    }
    
    // 3. Create vendor (profile with role='vendor')
    console.log('\n3. Creating vendor profile...')
    
    // First create auth user
    const vendorEmail = 'stress-test-vendor@bookiji.test'
    const vendorPassword = 'TestPassword123!'
    
    const { data: vendorAuth, error: vendorAuthError } = await supabase.auth.admin.createUser({
      email: vendorEmail,
      password: vendorPassword,
      email_confirm: true,
      user_metadata: {
        role: 'vendor',
      },
    })
    
    if (vendorAuthError && !vendorAuthError.message.includes('already registered')) {
      throw vendorAuthError
    }
    
    let vendorAuthId: string
    if (vendorAuthError && vendorAuthError.message.includes('already registered')) {
      console.log('   Vendor auth user already exists, fetching...')
      const { data: existingAuth } = await supabase.auth.admin.listUsers()
      const existingVendor = existingAuth?.users.find(u => u.email === vendorEmail)
      if (existingVendor) {
        vendorAuthId = existingVendor.id
      } else {
        throw new Error('Vendor auth user exists but could not be found')
      }
    } else {
      vendorAuthId = vendorAuth.user.id
    }
    
    // Create profile
    const { data: vendorProfile, error: vendorProfileError } = await supabase
      .from('profiles')
      .upsert({
        auth_user_id: vendorAuthId,
        email: vendorEmail,
        full_name: 'Stress Test Vendor',
        role: 'vendor',
        is_active: true,
      }, {
        onConflict: 'auth_user_id',
      })
      .select()
      .single()
    
    if (vendorProfileError) {
      // Try to fetch existing
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select()
        .eq('auth_user_id', vendorAuthId)
        .single()
      
      if (existingProfile) {
        console.log(`   ✅ Using existing vendor profile: ${existingProfile.id}`)
        var vendorId = existingProfile.id
      } else {
        throw vendorProfileError
      }
    } else {
      console.log(`   ✅ Created vendor profile: ${vendorProfile.id}`)
      var vendorId = vendorProfile.id
    }
    
    // 4. Create requester (profile with role='customer')
    console.log('\n4. Creating requester profile...')
    
    const requesterEmail = 'stress-test-requester@bookiji.test'
    const requesterPassword = 'TestPassword123!'
    
    const { data: requesterAuth, error: requesterAuthError } = await supabase.auth.admin.createUser({
      email: requesterEmail,
      password: requesterPassword,
      email_confirm: true,
      user_metadata: {
        role: 'customer',
      },
    })
    
    if (requesterAuthError && !requesterAuthError.message.includes('already registered')) {
      throw requesterAuthError
    }
    
    let requesterAuthId: string
    if (requesterAuthError && requesterAuthError.message.includes('already registered')) {
      console.log('   Requester auth user already exists, fetching...')
      const { data: existingAuth } = await supabase.auth.admin.listUsers()
      const existingRequester = existingAuth?.users.find(u => u.email === requesterEmail)
      if (existingRequester) {
        requesterAuthId = existingRequester.id
      } else {
        throw new Error('Requester auth user exists but could not be found')
      }
    } else {
      requesterAuthId = requesterAuth.user.id
    }
    
    // Create profile
    const { data: requesterProfile, error: requesterProfileError } = await supabase
      .from('profiles')
      .upsert({
        auth_user_id: requesterAuthId,
        email: requesterEmail,
        full_name: 'Stress Test Requester',
        role: 'customer',
        is_active: true,
      }, {
        onConflict: 'auth_user_id',
      })
      .select()
      .single()
    
    if (requesterProfileError) {
      // Try to fetch existing
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select()
        .eq('auth_user_id', requesterAuthId)
        .single()
      
      if (existingProfile) {
        console.log(`   ✅ Using existing requester profile: ${existingProfile.id}`)
        var requesterId = existingProfile.id
      } else {
        throw requesterProfileError
      }
    } else {
      console.log(`   ✅ Created requester profile: ${requesterProfile.id}`)
      var requesterId = requesterProfile.id
    }
    
    console.log('\n=====================================')
    console.log('🎉 Stress test data seeded successfully!')
    console.log('')
    console.log('📋 Test Credentials:')
    console.log('')
    console.log(`   PARTNER_API_KEY=${finalApiKey}`)
    console.log(`   VENDOR_ID=${vendorId}`)
    console.log(`   REQUESTER_ID=${requesterId}`)
    console.log('')
    console.log('💡 Export these environment variables before running stress tests:')
    console.log(`   export PARTNER_API_KEY="${finalApiKey}"`)
    console.log(`   export VENDOR_ID="${vendorId}"`)
    console.log(`   export REQUESTER_ID="${requesterId}"`)
    console.log('')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seedStressTestData()
