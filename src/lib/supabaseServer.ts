import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { buildSyntheticAwareFetch, detectSyntheticContext } from './simcity/syntheticContext'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/env/supabaseEnv'

// We NEVER evaluate env vars or config at module load.
// We NEVER create a client server-side unless explicitly requested.

// ---------- Server-side client (NEVER for auth/session) ----------
export function getServerSupabase(): SupabaseClient {
  // Use environment-aware Supabase configuration
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()

  if (!url || !key) {
    throw new Error('Missing Supabase env vars (server)')
  }

  // Note: We cannot automatically pass headers() here because getServerSupabase is synchronous
  // and next/headers is async in Next.js 15.
  // If synthetic context is needed, it must be passed explicitly or we need to await headers() 
  // in the caller and pass them.
  // For now, we default to no synthetic context to preserve synchronous signature.
  const syntheticContext = detectSyntheticContext()
  const syntheticFetch = buildSyntheticAwareFetch(syntheticContext)

  return createClient(url, key, {
    global: syntheticFetch ? { fetch: syntheticFetch } : undefined,
  })
}
