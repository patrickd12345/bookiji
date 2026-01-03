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
    
    // Also check explicit admin emails
    const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || ['admin@bookiji.com', 'patri@bookiji.com', 'pilotmontreal@gmail.com', 'patrick_duchesneau_1@hotmail.com']
    const isEmailAdmin = user.email && ADMIN_EMAILS.includes(user.email)

    if (!isAdmin && !isEmailAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { userId, role, username } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {}

    // Handle role update
    if (role) {
      if (!['customer', 'vendor', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      updates.role = role
    }

    // Handle username update
    if (username !== undefined) {
      // Allow empty string to clear username (if nullable), or validate length
      if (username && username.length < 3) {
        return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
      }
      updates.username = username || null // Convert empty string to null if desired
      
      // Check uniqueness
      if (updates.username) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', updates.username)
          .neq('id', userId) // Exclude current user
          .single()
        
        if (existingUser) {
          return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    // Update user
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' })
  } catch (error) {
    console.error('Error in update-user endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}





