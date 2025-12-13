import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Cache instances to avoid creating new clients on every property access
let _adminClient: SupabaseClient | null = null
let _anonClient: SupabaseClient | null = null

export const supabaseAdmin = new Proxy({} as any, {
  get: (target, prop) => {
    if (!_adminClient) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!url || !key) {
        // Only throw if we are actually trying to use it (runtime)
        // If this happens during build, it might still throw if code tries to access properties
        // But simply importing this file won't throw.
        if (typeof window === 'undefined') {
           // We are on server
           throw new Error('Supabase admin configuration missing')
        }
        return undefined
      }
      _adminClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })
    }
    return (_adminClient as any)[prop]
  }
}) as SupabaseClient

export const supabaseAnon = new Proxy({} as any, {
  get: (target, prop) => {
    if (!_anonClient) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!url || !key) {
        throw new Error('Supabase anon configuration missing')
      }
      _anonClient = createClient(url, key)
    }
    return (_anonClient as any)[prop]
  }
}) as SupabaseClient
