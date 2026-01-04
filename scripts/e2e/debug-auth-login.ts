#!/usr/bin/env tsx
/**
 * Raw auth password-grant debug (status + error message only).
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

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if (!supabaseUrl || !publishableKey) {
  console.error('❌ Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  process.exit(1)
}

async function attempt(label: string, email: string, password: string) {
  const url = `${supabaseUrl}/auth/v1/token?grant_type=password`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
    body: JSON.stringify({ email, password }),
  })
  let body: any = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  const msg =
    body && typeof body === 'object'
      ? body.msg || body.message || body.error_description || body.error || JSON.stringify(body)
      : body

  console.log(`${label}: status=${res.status} ok=${res.ok}`)
  if (!res.ok) console.log(`  error=${String(msg ?? 'unknown')}`)
}

await attempt('vendor', E2E_VENDOR_USER.email, E2E_VENDOR_USER.password)
await attempt('customer', E2E_CUSTOMER_USER.email, E2E_CUSTOMER_USER.password)

