#!/usr/bin/env tsx
/**
 * Sanity check: can we log in to the hosted Supabase project with the E2E credentials?
 * This does NOT print secrets.
 */
import { getRuntimeMode } from '../../src/env/runtimeMode'
import { loadEnvFile } from '../../src/env/loadEnv'
import { createClient } from '@supabase/supabase-js'
import { E2E_CUSTOMER_USER, E2E_VENDOR_USER } from './credentials'

// Load exactly one env file according to runtime mode
// For E2E scripts, default to e2e mode if not explicitly set
if (!process.env.RUNTIME_MODE && !process.env.DOTENV_CONFIG_PATH) {
  process.env.RUNTIME_MODE = 'e2e'
}
const mode = getRuntimeMode()
loadEnvFile(mode)

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl) {
  console.error('❌ Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY
const keysToTry = [publishableKey, anonKey].filter(Boolean) as string[]
if (!keysToTry.length) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_ANON_KEY')
  process.exit(1)
}

async function check(label: string, email: string, password: string) {
  for (const key of keysToTry) {
    const keyLabel = key.startsWith('eyJ') ? 'anon-jwt' : key.startsWith('sb_publishable_') ? 'publishable' : 'key'
    const supabase = createClient(supabaseUrl, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      console.log(`❌ ${label}: login failed (${keyLabel})`)
      console.log(`   reason=${error?.message ?? 'unknown'}`)
      continue
    }
    console.log(`✅ ${label}: login OK (${keyLabel}, userId=${data.user.id})`)
    await supabase.auth.signOut()
    return true
  }
  return false
}

const okVendor = await check('vendor', E2E_VENDOR_USER.email, E2E_VENDOR_USER.password)
const okCustomer = await check('customer', E2E_CUSTOMER_USER.email, E2E_CUSTOMER_USER.password)

if (!okVendor || !okCustomer) {
  process.exit(1)
}

