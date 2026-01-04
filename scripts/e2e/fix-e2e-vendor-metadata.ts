#!/usr/bin/env tsx
/**
 * Fixes vendor auth.user metadata to match expected shape (role/full_name/email_verified).
 * This can unblock Auth setups that read user_metadata during token issuance.
 */
import { getRuntimeMode } from '../../src/env/runtimeMode'
import { loadEnvFile } from '../../src/env/loadEnv'
import { E2E_VENDOR_USER } from './credentials'

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
try {
  const res = await client.query(
    `
    update auth.users
    set raw_user_meta_data =
      coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'role', 'vendor',
        'full_name', $2,
        'email_verified', true
      )
    where email = $1
    returning id
    `,
    [E2E_VENDOR_USER.email, E2E_VENDOR_USER.fullName]
  )
  if (!res.rows.length) {
    console.error(`❌ No auth.users row for ${E2E_VENDOR_USER.email}`)
    process.exit(1)
  }
  console.log(`✅ Updated raw_user_meta_data for vendor userId=${res.rows[0].id}`)
} finally {
  await client.end()
}

