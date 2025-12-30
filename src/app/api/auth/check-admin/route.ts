import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

// Optional: Admin org IDs via environment variable (for organization-based admin access)
const ADMIN_ORG_IDS = process.env.ADMIN_ORG_IDS?.split(',').filter(Boolean) || []

export async function GET(_request: NextRequest) {
  try {
    const config = getSupabaseConfig()
    const cookieStore = await cookies()
    
    // Use createServerClient to properly read Supabase session cookies
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
              // The `setAll` method was called from a Server Component or Route Handler.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          }
        }
      }
    )

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ isAdmin: false, error: authError?.message }, { status: 200 })
    }

    // Check profiles table for admin role (primary role source)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, org_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    
    if (profile?.role === 'admin') {
      return NextResponse.json({ isAdmin: true, userId: user.id, email: user.email, reason: 'profile_role' })
    }

    // Check user_roles table (flexible role management)
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
        return NextResponse.json({ isAdmin: true, userId: user.id, email: user.email, reason: 'user_roles' })
      }
    }

    // Optional: Check if user is admin via org_id (only if ADMIN_ORG_IDS is configured)
    if (ADMIN_ORG_IDS.length > 0 && profile?.org_id && ADMIN_ORG_IDS.includes(profile.org_id)) {
      return NextResponse.json({ isAdmin: true, userId: user.id, email: user.email, reason: 'org_id' })
    }

    return NextResponse.json({ isAdmin: false, userId: user.id, email: user.email })
  } catch (error) {
    console.error('Admin check error:', error)
    return NextResponse.json({ isAdmin: false }, { status: 200 })
  }
}
