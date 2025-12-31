import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

/**
 * GET /api/auth/session
 * 
 * Returns current authenticated session information for chaos preflight validation.
 * 
 * Returns:
 * - session: { user: { id, email }, expires_at, expires_in }
 * - user: { id, email }
 * - role: user role from profiles table
 * 
 * Requires: Authorization header with Bearer token OR valid session cookie
 */
export async function GET(request: NextRequest) {
  try {
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
                cookieStore.set(name, value, options)
              })
            } catch (_error) {
              // Ignore - setAll called from Route Handler
            }
          }
        }
      }
    )

    // Try Authorization header first (for chaos testing)
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)
      
      if (userError || !user) {
        return NextResponse.json(
          { 
            session: null,
            user: null,
            role: null,
            error: 'Invalid or expired token'
          },
          { status: 401 }
        )
      }

      // Get session to check expiry
      const { data: { session } } = await supabase.auth.getSession()
      
      // Get role from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      return NextResponse.json({
        session: session ? {
          user: {
            id: session.user.id,
            email: session.user.email
          },
          expires_at: session.expires_at,
          expires_in: session.expires_in
        } : null,
        user: {
          id: user.id,
          email: user.email
        },
        role: profile?.role || null
      })
    }

    // Fallback to cookie-based session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { 
          session: null,
          user: null,
          role: null,
          error: 'No active session'
        },
        { status: 401 }
      )
    }

    // Get role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()

    return NextResponse.json({
      session: {
        user: {
          id: session.user.id,
          email: session.user.email
        },
        expires_at: session.expires_at,
        expires_in: session.expires_in
      },
      user: {
        id: session.user.id,
        email: session.user.email
      },
      role: profile?.role || null
    })
  } catch (error) {
    console.error('Session verification error:', error)
    return NextResponse.json(
      { 
        session: null,
        user: null,
        role: null,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}






















