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

export async function POST(request: NextRequest) {
  try {
    const { user, supabaseAdmin, error } = await authenticateUser(request)
    if (error) return error

    const body = await request.json()
    const { providerId, startTime, endTime, slotType } = body

    if (!providerId || !startTime || !endTime) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

     // Security check
    if (user.id !== providerId) {
        const { data: profile } = await supabaseAdmin.from('profiles').select('auth_user_id').eq('id', providerId).single()
        if (!profile || profile.auth_user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
    }

    // Use the atomic creation function if available, or direct insert
    // Direct insert is safer for now as the function was just added and might need verification
    // But we should use the function if we want conflict detection?
    // Let's use direct insert but with proper error handling for exclusions

    const { data, error: insertError } = await supabaseAdmin
        .from('availability_slots')
        .insert({
            provider_id: providerId,
            start_time: startTime,
            end_time: endTime,
            slot_type: slotType || 'available',
            is_available: true
        })
        .select()
        .single()

    if (insertError) {
        if (insertError.code === '23P01') { // Exclusion violation
            return NextResponse.json({ error: 'Slot conflicts with an existing slot', code: 'CONFLICT' }, { status: 409 })
        }
        console.error('Error creating slot:', insertError)
        return NextResponse.json({ error: 'Failed to create slot' }, { status: 500 })
    }

    return NextResponse.json({ success: true, slot: data })

  } catch (error) {
    console.error('Error in POST /api/vendor/availability/slots:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
