#!/usr/bin/env tsx
/**
 * Checks whether the canonical E2E auth users exist in auth.users (via DATABASE_URL).
 * Does NOT print secrets.
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
try {
  const check = async (label: string, email: string) => {
    const r = await client.query(`select id from auth.users where email = $1`, [email])
    if (!r.rows.length) {
      console.log(`${label}: missing`)
      return
    }

    const userIds = r.rows.map((x: any) => x.id)
    const userId = userIds[0]
    const i = await client.query(`select count(*)::int as c from auth.identities where user_id = $1`, [userId])
    console.log(`${label}: exists (count=${userIds.length}, sampleUserId=${userId}, identities(sample)=${i.rows[0]?.c ?? 0})`)
  }

  await check('vendor', E2E_VENDOR_USER.email)
  await check('customer', E2E_CUSTOMER_USER.email)
} finally {
  await client.end()
}

