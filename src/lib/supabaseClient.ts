// lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { buildSyntheticAwareFetch, detectSyntheticContext } from './simcity/syntheticContext'

// We NEVER evaluate env vars or config at module load.
// We NEVER create a client server-side unless explicitly requested.

function getBrowserEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

// ---------- Browser client (auth, sessions) ----------
export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    // Prevent server-side execution
    return null
  }

  const { url, key } = getBrowserEnv()

  if (!url || !key) {
    console.warn('Supabase env vars missing (browser)')
    return null
  }

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

// Lazy singleton for convenience
let browserInstance: SupabaseClient | null = null

export function supabaseBrowserClient() {
  if (!browserInstance) {
    browserInstance = getBrowserSupabase()
  }
  return browserInstance
}

// ---------- Server-side client (NEVER for auth/session) ----------
export function getServerSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase env vars (server)')
  }

  const syntheticContext = detectSyntheticContext()
  const syntheticFetch = buildSyntheticAwareFetch(syntheticContext)

  return createClient(url, key, {
    global: syntheticFetch ? { fetch: syntheticFetch } : undefined,
  })
}
