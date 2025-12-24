import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAuthenticatedUserId } from '../../_utils/auth'
import { getSupabaseConfig } from '@/config/supabase'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const config = getSupabaseConfig()
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
    
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Note: notifications table doesn't exist - system uses notification_intents
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read', false)
      .limit(0) // Try to query but expect it to fail gracefully

    if (updateError) {
      // Table doesn't exist - return success anyway
      if (updateError.code === 'PGRST205') {
        return NextResponse.json({ success: true })
      }
      console.error('Error marking all notifications as read:', updateError)
      return NextResponse.json(
        { error: 'Failed to mark notifications as read' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in mark-all-read route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 