#!/usr/bin/env tsx
/**
 * Fixes vendor auth.user metadata to match expected shape (role/full_name/email_verified).
 * This can unblock Auth setups that read user_metadata during token issuance.
 */
import * as dotenv from 'dotenv'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { E2E_VENDOR_USER } from './credentials'

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

