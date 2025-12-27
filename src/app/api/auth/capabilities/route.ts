import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

const INVARIANT_ENDPOINT = '/api/auth/capabilities'

function createSupabase({ cookieStore }: { cookieStore: Awaited<ReturnType<typeof cookies>> }) {
  const config = getSupabaseConfig()

  return createServerClient(config.url, config.publishableKey, {
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
          // Some Route Handler flows may call setAll before cookies are available; ignore.
        }
      }
    }
  })
}

function buildCapabilities(profile: {
  can_book_services?: boolean | null
  can_offer_services?: boolean | null
  is_admin?: boolean | null
}) {
  const flags: string[] = []
  if (profile.can_book_services) {
    flags.push('can_book_services')
  }
  if (profile.can_offer_services) {
    flags.push('can_offer_services')
  }
  if (profile.is_admin) {
    flags.push('is_admin')
  }
  return flags
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const cookieStore = await cookies()
    const supabase = createSupabase({ cookieStore })

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { data: roleSummary, error: roleError } = await supabase
      .from('user_role_summary')
      .select('user_id, role, roles, can_book_services, can_offer_services, is_admin')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (roleError) {
      console.error('Failed to fetch user role summary:', roleError)
      return NextResponse.json(
        { error: 'Failed to load capabilities' },
        { status: 500 }
      )
    }

    const responseBody = {
      user_id: user.id,
      role: roleSummary?.role || null,
      capabilities: buildCapabilities({
        can_book_services: roleSummary?.can_book_services,
        can_offer_services: roleSummary?.can_offer_services,
        is_admin: roleSummary?.is_admin
      }),
      roles: roleSummary?.roles || []
    }

    return NextResponse.json(responseBody)
  } catch (error) {
    console.error('Error in GET /api/auth/capabilities:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
