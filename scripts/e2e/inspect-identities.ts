#!/usr/bin/env tsx
/**
 * Inspect auth.identities for the canonical E2E users (debugging auth 500s).
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

async function show(email: string) {
  const u = await client.query<{ id: string }>(`select id from auth.users where email = $1 limit 1`, [email])
  if (!u.rows.length) {
    console.log(`${email}: missing`)
    return
  }
  const userId = u.rows[0].id
  const i = await client.query(`select provider, provider_id, identity_data from auth.identities where user_id = $1`, [userId])
  console.log(`${email}: identities=${i.rows.length} userId=${userId}`)
  for (const row of i.rows) {
    const identityEmail = (row.identity_data as any)?.email ?? null
    console.log(`  provider=${row.provider} provider_id=${row.provider_id} identity_email=${identityEmail}`)
  }
}

try {
  await show(E2E_VENDOR_USER.email)
  await show(E2E_CUSTOMER_USER.email)
} finally {
  await client.end()
}

