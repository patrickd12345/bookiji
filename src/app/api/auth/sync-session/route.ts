import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieConfig'

/**
 * Sync Supabase session from Authorization header to cookies
 * Called after client-side login to ensure server can read the session
 */
export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token } = await request.json()
    
    if (!access_token) {
      return NextResponse.json({ error: 'access_token required' }, { status: 400 })
    }

    const config = getSupabaseConfig()
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
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

    // Set the session using the provided tokens
    // Only include refresh_token if it's provided and not empty
    const sessionParams: { access_token: string; refresh_token?: string } = {
      access_token
    }
    
    if (refresh_token && refresh_token.trim() !== '') {
      sessionParams.refresh_token = refresh_token
    }

    const { data: { session }, error } = await supabase.auth.setSession(sessionParams)

    // Handle refresh_token_not_found errors gracefully
    // This can happen if the refresh token is invalid, expired, or already used
    // In such cases, we'll try to use just the access token
    if (error && error.code === 'refresh_token_not_found') {
      // Try setting session with just access token
      const { data: { session: fallbackSession }, error: fallbackError } = 
        await supabase.auth.setSession({ access_token })
      
      if (!fallbackError && fallbackSession) {
        // Successfully set session with just access token
        // This is acceptable for short-lived sessions
        return NextResponse.json({ 
          success: true, 
          user: fallbackSession.user 
        })
      }
      
      // If that also fails, return the original error
      return NextResponse.json({ 
        error: 'Session expired. Please log in again.' 
      }, { status: 401 })
    }

    if (error || !session) {
      return NextResponse.json({ error: error?.message || 'Failed to set session' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      user: session.user 
    })
  } catch (error) {
    console.error('Session sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

