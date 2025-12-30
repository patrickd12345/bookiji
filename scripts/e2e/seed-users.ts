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
 * This script always deletes and recreates the canonical E2E users because
 * Supabase Auth can leave stale password hashes that break deterministic login.
 * The delete-and-recreate behavior applies only to the E2E seed run, where
 * determinism is more important than preserving any prior Supabase data.
 *
 * Usage:
 *   pnpm e2e:seed
 * 
 * Environment Variables:
 *   SUPABASE_URL - Supabase project URL (required)
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (required)
 *   E2E_ADMIN_EMAIL - Admin email (optional, default: e2e-admin@bookiji.test)
 *   E2E_ADMIN_PASSWORD - Admin password (default: TestPassword123!)
 *   CREATE_ADMIN - Set to true to seed the admin user (optional)
 *
 * Canonical vendor/customer credentials live in scripts/e2e/credentials.ts and are used
 * by the Playwright suites to avoid drift.
 */

import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'
import { E2E_CUSTOMER_USER, E2E_VENDOR_USER, E2EUserDefinition } from './credentials'

// Allow skipping seed if explicitly requested (useful for cloud environments where users may already exist)
if (process.env.E2E_SKIP_SEED === 'true') {
  console.log('⏭️  Skipping user seeding (E2E_SKIP_SEED=true)')
  process.exit(0)
}

// Load .env.e2e if it exists, otherwise fall back to .env or .env.local
const envE2EPath = path.resolve(process.cwd(), '.env.e2e')
const envPaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
]

if (fs.existsSync(envE2EPath)) {
  dotenv.config({ path: envE2EPath })
} else {
  const envPath = envPaths.find(p => fs.existsSync(p))
  if (envPath) {
    dotenv.config({ path: envPath })
    console.warn(`⚠️  Using ${path.basename(envPath)} instead of .env.e2e for seeding`)
  } else {
    // Fall back to default dotenv behavior
    dotenv.config()
  }
}

if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const error = new Error(
    'E2E seed requires SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL\n' +
    '\n' +
    'For cloud environments without Docker:\n' +
    '  1. Create a test Supabase project at https://app.supabase.com\n' +
    '  2. Get your project URL and service role key from Settings → API\n' +
    '  3. Run: pnpm e2e:setup-remote\n' +
    '  4. Or set E2E_SKIP_SEED=true if users already exist\n' +
    '\n' +
    'See docs/testing/CLOUD_E2E_SETUP.md for details.'
  )
  throw error
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const error = new Error(
    'E2E seed requires SUPABASE_SERVICE_ROLE_KEY\n' +
    '\n' +
    'Get your service role key from:\n' +
    '  Supabase Dashboard → Your Project → Settings → API → Project API keys\n' +
    '\n' +
    'Or set E2E_SKIP_SEED=true if users already exist in your Supabase project.'
  )
  throw error
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e-admin@bookiji.test'
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'TestPassword123!'

type UserSeed = E2EUserDefinition

const usersToSeed: UserSeed[] = [E2E_VENDOR_USER, E2E_CUSTOMER_USER]

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
    let data, error
    try {
      const result = await supabase.auth.admin.listUsers({
        page,
        perPage
      })
      data = result.data
      error = result.error
    } catch (err: any) {
      // Handle connection errors more gracefully
      if (err.message?.includes('ECONNREFUSED') || err.message?.includes('fetch failed')) {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
        const isLocal = supabaseUrl && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(supabaseUrl)
        
        if (isLocal) {
          throw new Error(
            `Cannot connect to local Supabase at ${supabaseUrl}\n` +
            '\n' +
            'Local Supabase requires Docker. Options:\n' +
            '  1. Start Docker and run: pnpm db:start\n' +
            '  2. Use remote Supabase: pnpm e2e:setup-remote\n' +
            '  3. Skip seeding: E2E_SKIP_SEED=true pnpm e2e\n' +
            '\n' +
            'See docs/testing/CLOUD_E2E_SETUP.md for cloud setup.'
          )
        } else {
          throw new Error(
            `Cannot connect to remote Supabase at ${supabaseUrl}\n` +
            '\n' +
            'Check:\n' +
            '  1. SUPABASE_URL is correct\n' +
            '  2. Network can reach Supabase\n' +
            '  3. Project is active in Supabase dashboard\n' +
            '  4. API keys are valid\n' +
            '\n' +
            'Or skip seeding: E2E_SKIP_SEED=true pnpm e2e'
          )
        }
      }
      throw err
    }

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

async function seedUser(
  supabase: ReturnType<typeof createClient>,
  userSeed: UserSeed
): Promise<string> {
  const { email, password, role, fullName } = userSeed
  const existingUser = await findUserByEmail(supabase, email)

  if (existingUser) {
    try {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id)
      if (deleteError) {
        throw deleteError
      }
      console.log(`   ƒo" Deleted prior user: ${email} (${existingUser.id})`)
    } catch (deleteError) {
      if (shouldFallbackToManualDelete(deleteError)) {
        await manuallyDeleteUser(existingUser.id, email)
      } else {
        throw deleteError
      }
    }
  }

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role
    }
  })

  if (createError || !newUser?.user) {
    throw new Error(`Failed to create user ${email}: ${createError?.message ?? 'unknown error'}`)
  }

  const userId = newUser.user.id
  console.log(`   ƒo" Created user: ${email} (${userId})`)

  await ensureProfileExists(supabase, userSeed, userId)

  if (role === 'vendor' || role === 'admin') {
    const appUserId = await ensureAppUserExists(supabase, userSeed, userId)
    await ensureUserRoleExists(supabase, userSeed, appUserId)
  }

  return userId
}

function shouldFallbackToManualDelete(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as { code?: string; message?: string }
  if (candidate.code === 'unexpected_failure') {
    return true
  }

  if (typeof candidate.message === 'string' && candidate.message.includes('enqueue_cache_invalidation')) {
    return true
  }

  return false
}

async function manuallyDeleteUser(userId: string, email: string): Promise<void> {
  const dbUrl =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:55322/postgres'

  const client = new Client({ connectionString: dbUrl })
  await client.connect()

  const deleteStatements = [
    'DELETE FROM auth.sessions WHERE user_id = $1',
    'DELETE FROM auth.identities WHERE user_id = $1',
    'DELETE FROM auth.mfa_factors WHERE user_id = $1',
    'DELETE FROM auth.one_time_tokens WHERE user_id = $1',
    'DELETE FROM storage.objects WHERE owner = $1',
    'DELETE FROM storage.buckets WHERE owner = $1',
    'DELETE FROM public.system_flags WHERE updated_by = $1',
    'DELETE FROM public.notification_preferences WHERE user_id = $1',
    'DELETE FROM public.notification_logs WHERE user_id = $1',
    'DELETE FROM public.notification_intents WHERE user_id = $1',
    'DELETE FROM public.disputes WHERE user_id = $1',
    'DELETE FROM public.disputes WHERE admin_id = $1',
    'DELETE FROM public.no_show_events WHERE customer_id = $1',
    'DELETE FROM public.no_show_events WHERE provider_id = $1',
    'DELETE FROM public.provider_compensations WHERE provider_id = $1',
    'DELETE FROM public.quotes WHERE user_id = $1'
  ]

  try {
    await client.query('BEGIN')
    for (const statement of deleteStatements) {
      await client.query(statement, [userId])
    }

    const { rows } = await client.query('SELECT id FROM public.app_users WHERE auth_user_id = $1', [userId])
    if (rows.length > 0) {
      const [appUserRow] = rows
      await client.query('DELETE FROM public.user_roles WHERE app_user_id = $1', [appUserRow.id])
      await client.query('DELETE FROM public.app_users WHERE id = $1', [appUserRow.id])
    }

    await client.query('DELETE FROM public.profiles WHERE auth_user_id = $1', [userId])
    await client.query('DELETE FROM auth.users WHERE id = $1', [userId])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {
      /* ignore rollback errors */
    })
    throw new Error(
      `Failed to manually delete ${email}: ${error instanceof Error ? error.message : String(error)}`
    )
  } finally {
    await client.end()
  }

  console.log(`   ƒo" Deleted prior user via manual cleanup: ${email} (${userId})`)
}

async function ensureProfileExists(
  supabase: ReturnType<typeof createClient>,
  userSeed: UserSeed,
  userId: string
): Promise<void> {
  const { email, fullName, role } = userSeed
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        auth_user_id: userId,
        email,
        full_name: fullName,
        role
      },
      { onConflict: 'auth_user_id' }
    )

  if (error) {
    throw new Error(`Failed to upsert profile for ${email}: ${error.message}`)
  }

  console.log(`   ƒo" Ensured profile for ${email}`)
}

async function ensureAppUserExists(
  supabase: ReturnType<typeof createClient>,
  userSeed: UserSeed,
  userId: string
): Promise<string> {
  const { email, fullName } = userSeed
  const { data, error } = await supabase
    .from('app_users')
    .upsert(
      {
        auth_user_id: userId,
        display_name: fullName
      },
      { onConflict: 'auth_user_id' }
    )
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to upsert app_user for ${email}: ${error.message}`)
  }

  if (!data?.id) {
    throw new Error(`Failed to retrieve app_user id for ${email}`)
  }

  console.log(`   ƒo" Ensured app_user for ${email}`)
  return data.id
}

async function ensureUserRoleExists(
  supabase: ReturnType<typeof createClient>,
  userSeed: UserSeed,
  appUserId: string
): Promise<void> {
  const { email, role } = userSeed
  const { error } = await supabase
    .from('user_roles')
    .upsert(
      {
        app_user_id: appUserId,
        role
      },
      { onConflict: ['app_user_id', 'role'] }
    )

  if (error) {
    throw new Error(`Failed to upsert user_role ${role} for ${email}: ${error.message}`)
  }

  console.log(`   ƒo" Ensured user_role ${role} for ${email}`)
}

async function main() {
  console.log('dYOñ E2E User Seeding Script')
  console.log('')
  console.log('Users to seed:')
  usersToSeed.forEach(u => {
    console.log(`   - ${u.email} (${u.role})`)
  })
  console.log('')

  const userIds: Record<string, string> = {}

  for (const userSeed of usersToSeed) {
    console.log(`dY"? Processing ${userSeed.email}...`)
    try {
      const userId = await seedUser(supabaseAdmin, userSeed)
      userIds[userSeed.email] = userId
    } catch (error) {
      console.error(`ƒ?O Failed to seed ${userSeed.email}:`, error)
      process.exit(1)
    }
    console.log('')
  }

  console.log('ƒo. Seeding complete!')
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
  console.error('ƒ?O Fatal error:', error)
  process.exit(1)
})
