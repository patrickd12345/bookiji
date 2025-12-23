import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'

// Admin allow-list - production should use environment variables
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [
  'admin@bookiji.com',
  'patri@bookiji.com',
  'patrick_duchesneau_1@hotmail.com'
]

const ADMIN_ORG_IDS = process.env.ADMIN_ORG_IDS?.split(',') || [
  '00000000-0000-0000-0000-000000000000' // Default admin org
]

export async function adminGuard(request: NextRequest) {
  const url = request.nextUrl
  
  // Only apply to admin routes
  if (!url.pathname.startsWith('/admin') && !url.pathname.startsWith('/api/admin')) {
    return NextResponse.next()
  }

  try {
    const config = getSupabaseConfig()
    
    // Create Supabase client with cookie access for middleware
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // Middleware can't set cookies, but we need to provide the interface
          },
          remove() {
            // Middleware can't remove cookies, but we need to provide the interface
          }
        }
      }
    )
    
    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      if (url.pathname.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ 
          error: 'Unauthorized',
          hint: 'Authentication required for admin access'
        }), {
          status: 401,
          headers: { 'content-type': 'application/json' }
        })
      }
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      // Preserve the original destination so user can be redirected back after login
      redirectUrl.searchParams.set('next', url.pathname + url.search)
      return NextResponse.redirect(redirectUrl)
    }

    // Check if user is admin via email allow-list
    if (ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.next()
    }

    // Check if user is admin via org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profile?.org_id && ADMIN_ORG_IDS.includes(profile.org_id)) {
      return NextResponse.next()
    }

    // Check if user has admin role in user_roles table
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('app_user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (userRole?.role === 'admin') {
      return NextResponse.next()
    }

    // Access denied - provide generic error hint
    if (url.pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ 
        error: 'Forbidden',
        hint: 'Insufficient permissions for this operation'
      }), {
        status: 403,
        headers: { 'content-type': 'application/json' }
      })
    }

    // Redirect non-admin users away from admin UI
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Admin guard error:', error)
    
    // Generic error response - never leak internal details
    if (url.pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ 
        error: 'Internal server error',
        hint: 'Please try again later'
      }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      })
    }

    // Redirect on error
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    return NextResponse.redirect(redirectUrl)
  }
}


