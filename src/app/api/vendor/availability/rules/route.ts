import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { cookies } from 'next/headers'

// Helper for authentication (duplicated for now, should be shared lib)
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
    const { providerId, startTime, endTime, recurrenceRule, slotType } = body

    // Validation
    if (!providerId || !startTime || !endTime || !recurrenceRule) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Security check
    if (user.id !== providerId) {
        // Double check via profile if providerId is not authId (it is usually profile id)
        const { data: profile } = await supabaseAdmin.from('profiles').select('auth_user_id').eq('id', providerId).single()
        if (!profile || profile.auth_user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
    }

    // Create Rule
    const { data: rule, error: createError } = await supabaseAdmin
        .from('recurring_availability_rules')
        .insert({
            provider_id: providerId,
            start_time: startTime,
            end_time: endTime,
            recurrence_rule: recurrenceRule,
            slot_type: slotType || 'available'
        })
        .select()
        .single()

    if (createError) {
        console.error('Error creating rule:', createError)
        return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 })
    }

    // Materialize Slots
    const { error: matError } = await supabaseAdmin.rpc('materialize_recurring_slots', {
        p_rule_id: rule.id,
        p_horizon_days: 90
    })

    if (matError) {
        console.error('Error materializing slots:', matError)
        // Rule created but slots failed - partial success?
        return NextResponse.json({
            success: true,
            rule,
            warning: 'Rule created but slot generation failed. It will retry later.'
        })
    }

    return NextResponse.json({ success: true, rule })

  } catch (error) {
    console.error('Error in POST /api/vendor/availability/rules:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
