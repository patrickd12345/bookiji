#!/usr/bin/env tsx
/**
 * E2E Test User Seeding Script
 * 
 * Creates deterministic test users for Playwright E2E tests.
 * 
 * Users created:
 *   - e2e-admin@bookiji.test (optional)
 *   - e2e-vendor@bookiji.test
 *   - e2e-customer@bookiji.test
 * 
 * This script is idempotent - safe to run multiple times.
 * 
 * Usage:
 *   pnpm e2e:seed
 * 
 * Environment Variables:
 *   SUPABASE_URL - Supabase project URL (required)
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (required)
 *   E2E_VENDOR_EMAIL - Vendor email (default: e2e-vendor@bookiji.test)
 *   E2E_VENDOR_PASSWORD - Vendor password (default: TestPassword123!)
 *   E2E_CUSTOMER_EMAIL - Customer email (default: e2e-customer@bookiji.test)
 *   E2E_CUSTOMER_PASSWORD - Customer password (default: TestPassword123!)
 *   E2E_ADMIN_EMAIL - Admin email (optional, default: e2e-admin@bookiji.test)
 *   E2E_ADMIN_PASSWORD - Admin password (default: TestPassword123!)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const E2E_VENDOR_EMAIL = process.env.E2E_VENDOR_EMAIL || 'e2e-vendor@bookiji.test'
const E2E_VENDOR_PASSWORD = process.env.E2E_VENDOR_PASSWORD || 'TestPassword123!'
const E2E_CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL || 'e2e-customer@bookiji.test'
const E2E_CUSTOMER_PASSWORD = process.env.E2E_CUSTOMER_PASSWORD || 'TestPassword123!'
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e-admin@bookiji.test'
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'TestPassword123!'

if (!SUPABASE_URL) {
  console.error('❌ ERROR: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required')
  process.exit(1)
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

interface UserSeed {
  email: string
  password: string
  role: 'admin' | 'vendor' | 'customer'
  fullName: string
}

const usersToSeed: UserSeed[] = [
  {
    email: E2E_VENDOR_EMAIL,
    password: E2E_VENDOR_PASSWORD,
    role: 'vendor',
    fullName: 'E2E Test Vendor'
  },
  {
    email: E2E_CUSTOMER_EMAIL,
    password: E2E_CUSTOMER_PASSWORD,
    role: 'customer',
    fullName: 'E2E Test Customer'
  }
]

// Add admin if explicitly requested
if (process.env.E2E_ADMIN_EMAIL || process.env.CREATE_ADMIN === 'true') {
  usersToSeed.push({
    email: E2E_ADMIN_EMAIL,
    password: E2E_ADMIN_PASSWORD,
    role: 'admin',
    fullName: 'E2E Test Admin'
  })
}

async function ensureUser(
  supabase: ReturnType<typeof createClient>,
  userSeed: UserSeed
): Promise<string> {
  const { email, password, role, fullName } = userSeed

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users.find(
    u => u.email?.toLowerCase() === email.toLowerCase()
  )

  let userId: string

  if (existing) {
    userId = existing.id
    console.log(`   ✓ User exists: ${email} (${userId})`)

    // Update password if needed (for consistency)
    await supabase.auth.admin.updateUserById(userId, {
      password
    })
  } else {
    // Create new user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role
      }
    })

    if (createError) {
      throw new Error(`Failed to create user ${email}: ${createError.message}`)
    }

    userId = newUser.user.id
    console.log(`   ✓ Created user: ${email} (${userId})`)
  }

  // Ensure profile exists with correct role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', userId)
    .single()

  if (profileError && profileError.code !== 'PGRST116') {
    // PGRST116 = not found, which is fine
    throw new Error(`Failed to check profile: ${profileError.message}`)
  }

  if (!profile) {
    // Create profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        auth_user_id: userId,
        email,
        full_name: fullName,
        role
      })

    if (insertError) {
      throw new Error(`Failed to create profile: ${insertError.message}`)
    }
    console.log(`   ✓ Created profile for ${email}`)
  } else if (profile.role !== role) {
    // Update role if different
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('auth_user_id', userId)

    if (updateError) {
      throw new Error(`Failed to update profile role: ${updateError.message}`)
    }
    console.log(`   ✓ Updated profile role to ${role} for ${email}`)
  } else {
    console.log(`   ✓ Profile exists with correct role for ${email}`)
  }

  // For vendors, ensure app_users and user_roles are set up
  if (role === 'vendor' || role === 'admin') {
    // Check app_users
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    if (appUserError && appUserError.code !== 'PGRST116') {
      throw new Error(`Failed to check app_user: ${appUserError.message}`)
    }

    let appUserId: string
    if (!appUser) {
      const { data: newAppUser, error: insertError } = await supabase
        .from('app_users')
        .insert({
          auth_user_id: userId,
          display_name: fullName
        })
        .select('id')
        .single()

      if (insertError) {
        throw new Error(`Failed to create app_user: ${insertError.message}`)
      }
      appUserId = newAppUser.id
      console.log(`   ✓ Created app_user for ${email}`)
    } else {
      appUserId = appUser.id
    }

    // Ensure user_roles entry exists
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('app_user_id', appUserId)
      .eq('role', role)
      .single()

    if (roleError && roleError.code !== 'PGRST116') {
      throw new Error(`Failed to check user_role: ${roleError.message}`)
    }

    if (!userRole) {
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          app_user_id: appUserId,
          role
        })

      if (insertError) {
        throw new Error(`Failed to create user_role: ${insertError.message}`)
      }
      console.log(`   ✓ Created user_role ${role} for ${email}`)
    }
  }

  return userId
}

async function main() {
  console.log('🌱 E2E User Seeding Script')
  console.log('')
  console.log('Users to seed:')
  usersToSeed.forEach(u => {
    console.log(`   - ${u.email} (${u.role})`)
  })
  console.log('')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const userIds: Record<string, string> = {}

  for (const userSeed of usersToSeed) {
    console.log(`📝 Processing ${userSeed.email}...`)
    try {
      const userId = await ensureUser(supabase, userSeed)
      userIds[userSeed.email] = userId
    } catch (error) {
      console.error(`❌ Failed to seed ${userSeed.email}:`, error)
      process.exit(1)
    }
    console.log('')
  }

  console.log('✅ Seeding complete!')
  console.log('')
  console.log('Created/Updated Users:')
  Object.entries(userIds).forEach(([email, id]) => {
    console.log(`   ${email}: ${id}`)
  })
  console.log('')
  console.log('Credentials:')
  usersToSeed.forEach(u => {
    console.log(`   ${u.email} / ${u.password}`)
  })
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})


