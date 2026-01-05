import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { cookies } from 'next/headers'

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

export async function GET(request: NextRequest) {
  try {
    const { user, supabaseAdmin, error } = await authenticateUser(request)
    if (error) return error

    const searchParams = request.nextUrl.searchParams
    const providerId = searchParams.get('providerId')
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')

    if (!providerId || !startTime || !endTime) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Security check
    if (user.id !== providerId) {
        const { data: profile } = await supabaseAdmin.from('profiles').select('auth_user_id').eq('id', providerId).single()
        if (!profile || profile.auth_user_id !== user.id) {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
    }

    // Check for overlaps
    // Logic: (StartA <= EndB) and (EndA >= StartB)
    const { data: conflicts, error: conflictError } = await supabaseAdmin
        .from('availability_slots')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_available', true)
        .lte('start_time', endTime)
        .gte('end_time', startTime)

    if (conflictError) {
        console.error('Error checking conflicts:', conflictError)
        return NextResponse.json({ error: 'Failed to check conflicts' }, { status: 500 })
    }

    return NextResponse.json({
        hasConflicts: conflicts && conflicts.length > 0,
        conflicts: conflicts || []
    })

  } catch (error) {
    console.error('Error in GET /api/vendor/availability/conflicts:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
