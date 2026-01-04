#!/usr/bin/env tsx
/**
 * Lists functions that might be involved in Auth hooks / JWT claim generation.
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
    select
      n.nspname as schema,
      p.proname as name,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where
      (p.proname ilike '%hook%' or p.proname ilike '%jwt%' or p.proname ilike '%claims%')
      and n.nspname in ('auth', 'public')
    order by n.nspname, p.proname
    `
  )
  if (!r.rows.length) {
    console.log('No matching functions found.')
  } else {
    for (const row of r.rows) {
      console.log(`${row.schema}.${row.name}(${row.args})`)
    }
  }
} finally {
  await client.end()
}

