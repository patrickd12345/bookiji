import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieConfig'

/**
 * Creates a Supabase server client with proper cookie handling using getAll/setAll
 * This is the recommended approach for Next.js route handlers and server actions
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const config = getSupabaseConfig()
  
  return createServerClient(
    config.url,
    config.publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Merge with subdomain-aware cookie options
              const mergedOptions = { ...getSupabaseCookieOptions(), ...options }
              cookieStore.set(name, value, mergedOptions)
            })
          } catch (_error) {
            // The `setAll` method was called from a Server Component or Route Handler.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        }
      }
    }
  )
}

