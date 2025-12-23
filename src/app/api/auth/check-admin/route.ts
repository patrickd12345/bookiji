import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

// Admin allow-list - must match adminGuard.ts
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [
  'admin@bookiji.com',
  'patri@bookiji.com',
  'patrick_duchesneau_1@hotmail.com'
]

export async function GET(request: NextRequest) {
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
            } catch (error) {
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

    // Check email allow list first (matches adminGuard logic)
    if (ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ isAdmin: true, userId: user.id, email: user.email, reason: 'email_allow_list' })
    }

    // Check profiles table for admin role
    const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', user.id).maybeSingle()
    if (profile?.role === 'admin') {
      return NextResponse.json({ isAdmin: true, userId: user.id, email: user.email, reason: 'profile_role' })
    }

    // Check user_roles table
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('app_user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (userRole?.role === 'admin') {
      return NextResponse.json({ isAdmin: true, userId: user.id, email: user.email, reason: 'user_roles' })
    }

    return NextResponse.json({ isAdmin: false, userId: user.id, email: user.email })
  } catch (error) {
    console.error('Admin check error:', error)
    return NextResponse.json({ isAdmin: false }, { status: 200 })
  }
}