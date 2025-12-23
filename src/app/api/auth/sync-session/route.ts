import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

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
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.delete(name)
          }
        }
      }
    )

    // Set the session using the provided tokens
    const { data: { session }, error } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || ''
    })

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

