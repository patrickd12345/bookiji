#!/usr/bin/env tsx
/**
 * Inspect auth.identities for the canonical E2E users (debugging auth 500s).
 */
import * as dotenv from 'dotenv'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { E2E_CUSTOMER_USER, E2E_VENDOR_USER } from './credentials'

const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: false })
}

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

