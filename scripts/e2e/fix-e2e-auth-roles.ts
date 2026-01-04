#!/usr/bin/env tsx
/**
 * Fixes missing app_users/user_roles rows for the canonical E2E users.
 * This can unblock auth hooks that depend on user_roles during login.
 *
 * Uses DATABASE_URL (no API keys).
 */
import { getRuntimeMode } from '../../src/env/runtimeMode'
import { loadEnvFile } from '../../src/env/loadEnv'
import { E2E_CUSTOMER_USER, E2E_VENDOR_USER } from './credentials'

// Load exactly one env file according to runtime mode
// For E2E scripts, default to e2e mode if not explicitly set
if (!process.env.RUNTIME_MODE && !process.env.DOTENV_CONFIG_PATH) {
  process.env.RUNTIME_MODE = 'e2e'
}
const mode = getRuntimeMode()
loadEnvFile(mode)

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('❌ Missing DATABASE_URL (or SUPABASE_DB_URL)')
  process.exit(1)
}

const { Client } = await import('pg')
const client = new Client({ connectionString: dbUrl })
await client.connect()

async function ensureAppUserAndRole(email: string, displayName: string, role: 'customer' | 'vendor' | 'admin') {
  const u = await client.query<{ id: string }>(`select id from auth.users where email = $1 limit 1`, [email])
  if (!u.rows.length) {
    throw new Error(`Missing auth.users row for ${email}`)
  }
  const authUserId = u.rows[0].id

  const au = await client.query<{ id: string }>(
    `
    INSERT INTO public.app_users (auth_user_id, display_name, created_at)
    VALUES ($1, $2, now())
    ON CONFLICT (auth_user_id)
    DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id;
    `,
    [authUserId, displayName]
  )
  const appUserId = au.rows[0]?.id
  if (!appUserId) throw new Error(`Failed to upsert app_users for ${email}`)

  await client.query(
    `
    INSERT INTO public.user_roles (app_user_id, role, granted_at)
    VALUES ($1, $2, now())
    ON CONFLICT (app_user_id, role)
    DO NOTHING;
    `,
    [appUserId, role]
  )

  console.log(`✅ ensured app_users + user_roles for ${email} (role=${role})`)
}

try {
  await ensureAppUserAndRole(E2E_VENDOR_USER.email, E2E_VENDOR_USER.fullName, 'vendor')
  await ensureAppUserAndRole(E2E_CUSTOMER_USER.email, E2E_CUSTOMER_USER.fullName, 'customer')
} finally {
  await client.end()
}

