#!/usr/bin/env tsx
/**
 * Safe User Reset Script
 * 
 * Resets all users except one admin user.
 * 
 * DANGEROUS OPERATION - Only use in staging or before go-live.
 * Requires backup first.
 * 
 * Usage:
 *   ADMIN_EMAIL=admin@bookiji.com pnpm db:reset-users
 * 
 * Environment Variables:
 *   ADMIN_EMAIL - Email or UUID of admin user to keep (required)
 *   SUPABASE_URL - Supabase project URL (required)
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin operations (required)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// ========================================
// 🚨 HARD ENVIRONMENT GATES - SAFETY FIRST
// ========================================
// DEFENSE IN DEPTH: Multiple layers of protection
const ALLOW_DESTRUCTIVE_USER_RESET = process.env.ALLOW_DESTRUCTIVE_USER_RESET === 'true'
const APP_ENV = process.env.APP_ENV
const NODE_ENV = process.env.NODE_ENV

// Layer 1: Require explicit permission flag
if (!ALLOW_DESTRUCTIVE_USER_RESET) {
  console.error('')
  console.error('🚨🚨🚨 DESTRUCTIVE OPERATION BLOCKED 🚨🚨🚨')
  console.error('')
  console.error('This script will DELETE ALL USERS except one admin.')
  console.error('')
  console.error('User reset is only allowed via: pnpm certify:staging')
  console.error('')
  console.error('DO NOT run this script directly.')
  console.error('Use the safe certification macro instead.')
  console.error('')
  process.exit(1)
}

// Layer 2: APP_ENV MUST be explicitly set and equal 'staging'
if (!APP_ENV) {
  console.error('')
  console.error('🚨🚨🚨 MISSING APP_ENV 🚨🚨🚨')
  console.error('')
  console.error('APP_ENV is MANDATORY and must be explicitly set.')
  console.error('')
  console.error('User reset is only allowed via: pnpm certify:staging')
  console.error('')
  console.error('The certify:staging macro loads .env.staging which sets APP_ENV=staging')
  console.error('')
  process.exit(1)
}

if (APP_ENV !== 'staging') {
  console.error('')
  console.error('🚨🚨🚨 INVALID APP_ENV 🚨🚨🚨')
  console.error('')
  console.error('APP_ENV must be exactly "staging" for user reset.')
  console.error('')
  console.error('Current APP_ENV:', APP_ENV)
  console.error('')
  console.error('User reset is only allowed via: pnpm certify:staging')
  console.error('')
  console.error('This ensures you are operating in the staging environment.')
  console.error('')
  process.exit(1)
}

// Layer 3: NODE_ENV must NOT be 'production' unless APP_ENV=staging
// (We already verified APP_ENV=staging above, but double-check)
if (NODE_ENV === 'production' && APP_ENV !== 'staging') {
  console.error('')
  console.error('🚨🚨🚨 PRODUCTION NODE_ENV DETECTED 🚨🚨🚨')
  console.error('')
  console.error('NODE_ENV=production is only allowed when APP_ENV=staging')
  console.error('')
  console.error('Current NODE_ENV:', NODE_ENV)
  console.error('Current APP_ENV:', APP_ENV)
  console.error('')
  console.error('User reset is only allowed via: pnpm certify:staging')
  console.error('')
  process.exit(1)
}

// Layer 4: Block production environment (APP_ENV=production)
if (APP_ENV === 'production') {
  console.error('')
  console.error('🚨🚨🚨 PRODUCTION ENVIRONMENT DETECTED 🚨🚨🚨')
  console.error('')
  console.error('This script CANNOT run in production (APP_ENV=production).')
  console.error('')
  console.error('User reset is only allowed via: pnpm certify:staging')
  console.error('')
  console.error('If you can delete users, you are not in production.')
  console.error('')
  process.exit(1)
}

if (!ADMIN_EMAIL) {
  console.error('❌ ERROR: ADMIN_EMAIL environment variable is required')
  console.error('')
  console.error('User reset is only allowed via: pnpm certify:staging')
  console.error('')
  console.error('The certify:staging macro sets ADMIN_EMAIL automatically.')
  console.error('If you need to override it, set ADMIN_EMAIL in .env.staging')
  console.error('')
  process.exit(1)
}

if (!SUPABASE_URL) {
  console.error('❌ ERROR: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required')
  process.exit(1)
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

// Delay function for safety warning
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  // Print giant warning
  console.error('')
  console.error('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨')
  console.error('')
  console.error('                    ⚠️  DESTRUCTIVE OPERATION ⚠️')
  console.error('')
  console.error('  This script will DELETE ALL USERS except the specified admin.')
  console.error('')
  console.error('  Environment:', APP_ENV)
  console.error('  Supabase URL:', SUPABASE_URL)
  console.error('  Admin to keep:', ADMIN_EMAIL)
  console.error('')
  console.error('  ⚠️  This action CANNOT be undone. ⚠️')
  console.error('')
  console.error('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨')
  console.error('')
  console.error('Waiting 3 seconds before proceeding...')
  console.error('Press Ctrl+C to cancel.')
  console.error('')
  
  // Safety delay
  await delay(3000)
  console.log('🚨 USER RESET SCRIPT')
  console.log('📋 Admin email:', ADMIN_EMAIL)
  console.log('📋 Environment:', APP_ENV)
  console.log('')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Verify admin exists
  console.log('🔍 Verifying admin user...')
  const { data: adminUsers, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('❌ Failed to list users:', listError.message)
    process.exit(1)
  }

  // Try to find admin by email or UUID
  let adminUser = adminUsers.users.find(
    u => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  )

  if (!adminUser) {
    // Try as UUID
    try {
      const adminUuid = ADMIN_EMAIL
      adminUser = adminUsers.users.find(u => u.id === adminUuid)
    } catch {
      // Not a UUID
    }
  }

  if (!adminUser) {
    console.error(`❌ Admin user not found: ${ADMIN_EMAIL}`)
    console.error('   Available users:', adminUsers.users.map(u => u.email).join(', '))
    process.exit(1)
  }

  // Verify admin role in profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, email')
    .eq('auth_user_id', adminUser.id)
    .single()

  if (profileError || !profile) {
    console.error('❌ Admin user profile not found or error:', profileError?.message)
    process.exit(1)
  }

  if (profile.role !== 'admin') {
    console.error(`❌ User ${ADMIN_EMAIL} exists but does not have admin role`)
    console.error(`   Current role: ${profile.role}`)
    process.exit(1)
  }

  console.log('✅ Admin user verified:', {
    id: adminUser.id,
    email: adminUser.email,
    role: profile.role
  })
  console.log('')

  // Count users to delete
  const userCount = adminUsers.users.length - 1
  console.log(`📊 Users to delete: ${userCount}`)
  console.log('')

  // Use Supabase Admin API to delete users safely
  // This is safer than raw SQL and handles cascades properly
  console.log('🔄 Executing user reset via Supabase Admin API...')

  let deletedCount = 0
  const usersToDelete = adminUsers.users.filter(u => u.id !== adminUser.id)
  
  console.log(`🔄 Deleting ${usersToDelete.length} users...`)
  
  for (const user of usersToDelete) {
    try {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError) {
        console.error(`⚠️  Failed to delete user ${user.email}:`, deleteError.message)
      } else {
        deletedCount++
        if (deletedCount % 10 === 0) {
          console.log(`   ... ${deletedCount}/${usersToDelete.length} deleted`)
        }
      }
    } catch (error) {
      console.error(`⚠️  Error deleting ${user.email}:`, error)
    }
  }

  console.log('')
  console.log(`✅ Reset complete. Deleted ${deletedCount} users.`)
  console.log(`✅ Admin user preserved: ${adminUser.email} (${adminUser.id})`)

  // Verify final state
  const { data: finalUsers } = await supabase.auth.admin.listUsers()
  const finalCount = finalUsers?.users.length || 0
  
  if (finalCount !== 1) {
    console.error(`❌ ERROR: Expected 1 user after reset, found ${finalCount}`)
    process.exit(1)
  }

  console.log('✅ Verification passed: Exactly 1 user remains')
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

