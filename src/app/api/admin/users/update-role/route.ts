import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'

export async function POST(request: NextRequest) {
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
            // API routes typically don't set cookies, but if they did, we'd handle it here
            // or let the response handling do it.
          }
        }
      }
    )
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status via database role (consistent with middleware)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    
    // Also check explicit admin emails as a fallback/bootstrap
    const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || []
    const isEmailAdmin = user.email && ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(user.email)

    if (!isAdmin && !isEmailAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 })
    }

    if (!['customer', 'vendor', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Update user role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update role: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Role updated successfully' })
  } catch (error) {
    console.error('Error in update-role endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
