// lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/env/supabaseEnv'

// We NEVER evaluate env vars or config at module load.
// We NEVER create a client server-side unless explicitly requested.

function getBrowserEnv() {
  // DIAGNOSTIC: Log environment configuration at module load
  console.warn('[SUPABASE CLIENT CONFIG]', {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10),
    appEnv: process.env.NEXT_PUBLIC_APP_ENV,
    e2e: process.env.E2E,
    nextPublicE2e: process.env.NEXT_PUBLIC_E2E,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  // Use environment-aware Supabase configuration
  // This ensures we always use the correct project for the current environment
  try {
    const url = getSupabaseUrl()
    const key = getSupabaseAnonKey()
    console.warn('[SUPABASE CLIENT] Using getSupabaseEnv()', { url, keyPreview: key?.slice(0, 10) })
    return { url, key }
  } catch (error) {
    console.warn('[SUPABASE CLIENT] getSupabaseEnv() failed, using fallback', error)
    // Fallback for browser context where APP_ENV might not be set yet
    // This maintains backward compatibility during migration
    let url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').split(/\s+/)[0].trim()
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const publishableFallback = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    let key =
      anonKey ||
      (publishableFallback && publishableFallback.startsWith('eyJ') ? publishableFallback : undefined)
    
    // Local dev/E2E fallback: some dev servers may start without NEXT_PUBLIC_* env vars.
    // Only apply when running in a browser on localhost.
    if (typeof window !== 'undefined') {
      const host = window.location.hostname
      const isLocalHost = host === 'localhost' || host === '127.0.0.1'
      if (isLocalHost) {
        if (!url) url = 'http://localhost:55321'
        if (!key) {
          key =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
        }
      }
    }

    console.warn('[SUPABASE CLIENT] Using fallback env vars', { url, keyPreview: key?.slice(0, 10) })
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

  // DIAGNOSTIC: Log final client creation
  console.warn('[SUPABASE CLIENT] Creating browser client', {
    url,
    hasKey: !!key,
    keyPreview: key?.slice(0, 10)
  })

  if (!url || !key) {
    console.error('Supabase env vars missing (browser)', { 
      hasUrl: !!url, 
      hasKey: !!key,
      urlPreview: url ? `${url.substring(0, 30)}...` : 'missing',
      allEnvVars: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
        E2E: process.env.E2E,
        NEXT_PUBLIC_E2E: process.env.NEXT_PUBLIC_E2E
      }
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
    console.warn('[SUPABASE CLIENT] Browser client created successfully', { url })
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
