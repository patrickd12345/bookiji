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

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('E2E seed requires SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('E2E seed requires SUPABASE_SERVICE_ROLE_KEY')
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const E2E_VENDOR_EMAIL = process.env.E2E_VENDOR_EMAIL || 'e2e-vendor@bookiji.test'
const E2E_VENDOR_PASSWORD = process.env.E2E_VENDOR_PASSWORD || 'TestPassword123!'
const E2E_CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL || 'e2e-customer@bookiji.test'
const E2E_CUSTOMER_PASSWORD = process.env.E2E_CUSTOMER_PASSWORD || 'TestPassword123!'
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e-admin@bookiji.test'
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'TestPassword123!'

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

async function findUserByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string
): Promise<{ id: string; email?: string } | null> {
  const normalizedEmail = email.toLowerCase()
  const perPage = 100
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    })

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`)
    }

    const users = data?.users ?? []
    const match = users.find(u => u.email?.toLowerCase() === normalizedEmail)
    if (match) {
      return match
    }

    if (users.length < perPage) {
      break
    }

    page += 1
  }

  return null
}

async function ensureUser(
  supabase: ReturnType<typeof createClient>,
  userSeed: UserSeed
): Promise<string> {
  const { email, password, role, fullName } = userSeed

  // Look for an existing user so the script stays idempotent
  let existingUser = await findUserByEmail(supabase, email)
  let createdNewUser = false
  let userId: string

  if (!existingUser) {
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
      const fallback = await findUserByEmail(supabase, email)
      if (!fallback) {
        throw new Error(`Failed to create user ${email}: ${createError.message}`)
      }
      existingUser = fallback
      console.log(`   ✓ Duplicate detected, using existing user: ${email} (${existingUser.id})`)
    } else if (newUser?.user) {
      existingUser = newUser.user
      createdNewUser = true
      console.log(`   ✓ Created user: ${email} (${existingUser.id})`)
    }
  } else {
    console.log(`   ✓ User exists: ${email} (${existingUser.id})`)
  }

  if (!existingUser) {
    throw new Error(`Unable to resolve user ${email}`)
  }

  userId = existingUser.id

  if (!createdNewUser) {
    await supabase.auth.admin.updateUserById(userId, {
      password
    })
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




