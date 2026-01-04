#!/usr/bin/env tsx
/**
 * Inspects auth.users fields for debugging auth 500s.
 * Does NOT print secrets; prints only safe metadata and hash prefix.
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

type Row = {
  id: string
  email: string
  instance_id: string | null
  aud: string | null
  role: string | null
  email_confirmed_at: string | null
  confirmed_at: string | null
  last_sign_in_at: string | null
  banned_until: string | null
  deleted_at: string | null
  is_sso_user: boolean | null
  is_anonymous: boolean | null
  phone: string | null
  phone_confirmed_at: string | null
  confirmation_token: string | null
  recovery_token: string | null
  email_change: string | null
  email_change_token_new: string | null
  email_change_sent_at: string | null
  created_at: string | null
  updated_at: string | null
  encrypted_password: string | null
  raw_app_meta_data: any
  raw_user_meta_data: any
}

async function show(label: string, email: string) {
  const r = await client.query<Row>(
    `
    select
      id,
      email,
      instance_id::text,
      aud,
      role,
      email_confirmed_at::text,
      confirmed_at::text,
      last_sign_in_at::text,
      banned_until::text,
      deleted_at::text,
      is_sso_user,
      is_anonymous,
      phone,
      phone_confirmed_at::text,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      email_change_sent_at::text,
      created_at::text,
      updated_at::text,
      encrypted_password,
      raw_app_meta_data
      , raw_user_meta_data
    from auth.users
    where email = $1
    limit 1
    `,
    [email]
  )
  if (!r.rows.length) {
    console.log(`${label}: missing`)
    return
  }
  const u = r.rows[0]
  const hashPrefix = u.encrypted_password ? u.encrypted_password.slice(0, 4) : null
  const hashLen = u.encrypted_password ? u.encrypted_password.length : 0

  const pwCheck = await client.query<{ ok: boolean }>(
    `select (crypt($1, encrypted_password) = encrypted_password) as ok from auth.users where id = $2`,
    [label === 'vendor' ? E2E_VENDOR_USER.password : E2E_CUSTOMER_USER.password, u.id]
  )
  const ok = Boolean(pwCheck.rows[0]?.ok)
  console.log(`${label}: id=${u.id}`)
  console.log(`  instance_id=${u.instance_id}`)
  console.log(`  aud=${u.aud} role=${u.role}`)
  console.log(`  email_confirmed_at=${u.email_confirmed_at}`)
  console.log(`  confirmed_at=${u.confirmed_at}`)
  console.log(`  last_sign_in_at=${u.last_sign_in_at}`)
  console.log(`  banned_until=${u.banned_until} deleted_at=${u.deleted_at}`)
  console.log(`  is_sso_user=${u.is_sso_user} is_anonymous=${u.is_anonymous}`)
  console.log(`  phone=${u.phone} phone_confirmed_at=${u.phone_confirmed_at}`)
  console.log(`  confirmation_token_len=${u.confirmation_token?.length ?? 0} recovery_token_len=${u.recovery_token?.length ?? 0}`)
  console.log(`  email_change=${u.email_change ?? null} email_change_token_new_len=${u.email_change_token_new?.length ?? 0}`)
  console.log(`  email_change_sent_at=${u.email_change_sent_at}`)
  console.log(`  encrypted_password_prefix=${hashPrefix} len=${hashLen}`)
  console.log(`  password_matches_expected=${ok}`)
  console.log(`  raw_app_meta_data_provider=${u.raw_app_meta_data?.provider ?? null}`)
  console.log(`  raw_user_meta_data=${JSON.stringify(u.raw_user_meta_data ?? null)}`)
}

try {
  await show('vendor', E2E_VENDOR_USER.email)
  await show('customer', E2E_CUSTOMER_USER.email)
} finally {
  await client.end()
}

