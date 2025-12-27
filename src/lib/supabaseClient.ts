// lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/env/supabaseEnv'

// We NEVER evaluate env vars or config at module load.
// We NEVER create a client server-side unless explicitly requested.

function getBrowserEnv() {
  // Use environment-aware Supabase configuration
  // This ensures we always use the correct project for the current environment
  try {
    const url = getSupabaseUrl()
    const key = getSupabaseAnonKey()
    return { url, key }
  } catch (error) {
    // Fallback for browser context where APP_ENV might not be set yet
    // This maintains backward compatibility during migration
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').split(/\s+/)[0].trim()
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const publishableFallback = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const key =
      anonKey ||
      (publishableFallback && publishableFallback.startsWith('eyJ') ? publishableFallback : undefined)
    
    return { url, key }
  }
}

// Global singleton instance to prevent multiple GoTrueClient instances
let browserInstance: SupabaseClient | null = null

// ---------- Browser client (auth, sessions) ----------
// This function now always returns the singleton to prevent multiple instances
export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    // Prevent server-side execution
    return null
  }

  // Return existing instance if available
  if (browserInstance) {
    return browserInstance
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
    // Create client with single options object (not deprecated parameters)
    // Use a unique storage key to prevent conflicts with other instances
    browserInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'bookiji-supabase-auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
    return browserInstance
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

// Lazy singleton for convenience (now just calls getBrowserSupabase which is also a singleton)
export function supabaseBrowserClient() {
  return getBrowserSupabase()
}
