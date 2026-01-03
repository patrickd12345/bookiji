import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'

export async function GET(request: NextRequest) {
  try {
    const config = getSupabaseConfig()
    
    // Create Supabase client with cookie access
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(_cookiesToSet) {
            // API routes typically don't set cookies
          }
        }
      }
    )
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || ['admin@bookiji.com', 'patri@bookiji.com', 'pilotmontreal@gmail.com', 'patrick_duchesneau_1@hotmail.com']
    const isEmailAdmin = user.email && ADMIN_EMAILS.includes(user.email)

    if (!isAdmin && !isEmailAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get all users
    // Added username to select
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at, phone, username')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading users:', error)
      return NextResponse.json(
        { error: 'Failed to load users: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error('Error in list users endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
