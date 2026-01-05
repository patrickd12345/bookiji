import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { cookies } from 'next/headers'

/**
 * GET /api/vendor/settings
 * 
 * Returns vendor settings (timezone, availability mode, business hours).
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabaseAdmin, error } = await authenticateUser(request)
    if (error) return error

    // Get vendor profile - verify role is 'vendor'
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, preferences, availability_mode, business_hours, timezone')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (!profile || profile.role !== 'vendor') {
      return NextResponse.json({ error: 'Forbidden - Vendor access required' }, { status: 403 })
    }

    // Extract settings from profile
    return NextResponse.json({
      availability_mode: profile.availability_mode || 'subtractive',
      business_hours: profile.business_hours || {},
      timezone: profile.timezone || 'UTC',
      preferences: profile.preferences || {}
    })

  } catch (error) {
    console.error('Error in GET /api/vendor/settings:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/vendor/settings
 *
 * Updates vendor settings (timezone, availability mode, business hours).
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabaseAdmin, error } = await authenticateUser(request)
    if (error) return error

    const body = await request.json()
    const { providerId, availabilityMode, businessHours, timezone, preferences } = body

    // Validate providerId if provided (should match auth user's profile)
    if (providerId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('auth_user_id')
        .eq('id', providerId)
        .single()

      if (!profile || profile.auth_user_id !== user.id) {
         return NextResponse.json({ error: 'Forbidden - Provider ID mismatch' }, { status: 403 })
      }
    }

    const updates: Record<string, any> = {}
    if (availabilityMode) updates.availability_mode = availabilityMode
    if (businessHours) updates.business_hours = businessHours
    if (timezone) updates.timezone = timezone
    if (preferences) updates.preferences = preferences

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No changes provided' })
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('auth_user_id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Settings updated' })

  } catch (error) {
    console.error('Error in POST /api/vendor/settings:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// Helper for authentication
async function authenticateUser(request: NextRequest) {
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
              // Ignore
            }
          }
        }
      }
    )

    const authHeader = request.headers.get('authorization')
    let user
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const userResult = await supabase.auth.getUser(token)
      if (!userResult || userResult.error || !userResult.data?.user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
      }
      user = userResult.data.user
    } else {
      const sessionResult = await supabase.auth.getSession()
      if (!sessionResult || sessionResult.error || !sessionResult.data?.session?.user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
      }
      user = sessionResult.data.session.user
    }

    const supabaseAdmin = createSupabaseServerClient()
    
    return { user, supabaseAdmin }
}
