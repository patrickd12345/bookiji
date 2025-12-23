// lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// We NEVER evaluate env vars or config at module load.
// We NEVER create a client server-side unless explicitly requested.

function getBrowserEnv() {
  // Get the first valid URL (in case multiple are set)
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').split(/\s+/)[0].trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  
  return { url, key }
}

// ---------- Browser client (auth, sessions) ----------
export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    // Prevent server-side execution
    return null
  }

  const { url, key } = getBrowserEnv()

  if (!url || !key) {
    console.error('Supabase env vars missing (browser)', { 
      hasUrl: !!url, 
      hasKey: !!key,
      urlPreview: url ? `${url.substring(0, 30)}...` : 'missing'
    })
    return null
  }

  try {
    return createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

// Lazy singleton for convenience
let browserInstance: SupabaseClient | null = null

export function supabaseBrowserClient() {
  if (!browserInstance) {
    browserInstance = getBrowserSupabase()
  }
  return browserInstance
}
