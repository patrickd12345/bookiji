import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'

// Optional: Admin org IDs via environment variable (for organization-based admin access)
// This should be used sparingly and only for special cases
const ADMIN_ORG_IDS = process.env.ADMIN_ORG_IDS?.split(',').filter(Boolean) || []

export async function adminGuard(request: NextRequest) {
  const url = request.nextUrl
  
  // Only apply to admin routes
  if (!url.pathname.startsWith('/admin') && !url.pathname.startsWith('/api/admin')) {
    return NextResponse.next()
  }

  try {
    const config = getSupabaseConfig()
    
    // Create Supabase client with cookie access for middleware
    // Note: Middleware can't set/remove cookies, but we need to provide the interface
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // Middleware can't set cookies, but we need to provide the interface
            // Cookie setting is handled by the response in Next.js middleware
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

    // Check if user has admin role in profiles table (primary role source)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profile?.role === 'admin') {
      return NextResponse.next()
    }

    // Check if user has admin role in user_roles table (flexible role management)
    // user_roles.app_user_id references app_users.id, so we need to join through app_users
    const { data: appUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (appUser?.id) {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('app_user_id', appUser.id)
        .eq('role', 'admin')
        .maybeSingle()

      if (userRole?.role === 'admin') {
        return NextResponse.next()
      }
    }

    // Optional: Check if user is admin via org_id (only if ADMIN_ORG_IDS is configured)
    if (ADMIN_ORG_IDS.length > 0 && profile?.org_id && ADMIN_ORG_IDS.includes(profile.org_id)) {
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


