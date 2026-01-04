#!/usr/bin/env tsx
/**
 * Debug helper: prints the FK target for profiles.auth_user_id.
 * Does NOT log secrets.
 */
import { getRuntimeMode } from '../../src/env/runtimeMode'
import { loadEnvFile } from '../../src/env/loadEnv'

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
  const r = await client.query(
    `
    SELECT
      c.conname,
      pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    WHERE c.conname = $1
    `,
    ['profiles_auth_user_id_fkey']
  )

  if (!r.rows.length) {
    console.log('No constraint named profiles_auth_user_id_fkey found.')
    process.exit(0)
  }

  console.log(`conname=${r.rows[0].conname}`)
  console.log(`def=${r.rows[0].def}`)
} finally {
  await client.end()
}

