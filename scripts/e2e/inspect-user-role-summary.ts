#!/usr/bin/env tsx
/**
 * Inspect whether public.user_role_summary exists and who can SELECT it.
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
  const exists = await client.query(
    `select table_schema, table_name from information_schema.views where table_name = 'user_role_summary'`
  )
  console.log(`exists=${exists.rows.length ? 'yes' : 'no'}`)
  if (exists.rows.length) {
    console.log(`schema=${exists.rows[0].table_schema}`)
  }

  const grants = await client.query(
    `
    select grantee, privilege_type
    from information_schema.role_table_grants
    where table_name = 'user_role_summary'
    order by grantee, privilege_type
    `
  )
  if (!grants.rows.length) {
    console.log('grants=<none>')
  } else {
    for (const g of grants.rows) {
      console.log(`grant:${g.grantee}:${g.privilege_type}`)
    }
  }

  if (exists.rows.length) {
    const def = await client.query(
      `select definition from pg_views where schemaname = 'public' and viewname = 'user_role_summary'`
    )
    const snippet = (def.rows?.[0]?.definition as string | undefined) || ''
    console.log(`definition_snippet=${snippet.slice(0, 240).replace(/\s+/g, ' ').trim()}`)

    const ids = await client.query(`select id, email from auth.users where email in ($1,$2) order by email`, [
      E2E_VENDOR_USER.email,
      E2E_CUSTOMER_USER.email,
    ])
    for (const u of ids.rows) {
      const q = await client.query(`select user_id, role, roles, is_admin from public.user_role_summary where user_id = $1`, [u.id])
      console.log(`row_for_${u.email}=${q.rows.length ? 'yes' : 'no'}`)
      if (q.rows.length) {
        const r = q.rows[0] as any
        console.log(`  role=${r.role} roles=${JSON.stringify(r.roles)} is_admin=${r.is_admin}`)
      }
    }
  }
} finally {
  await client.end()
}

