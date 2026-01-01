import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { cookies } from 'next/headers'

/**
 * GET /api/vendor/service-types
 * 
 * Returns the list of service types (categories) the vendor offers.
 * Uses distinct query to avoid duplicates, stable ordering, minimal payload.
 * Joins only through valid foreign keys (services.provider_id -> profiles.id).
 */
export async function GET(request: NextRequest) {
  try {
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
              // Ignore - setAll called from Route Handler
            }
          }
        }
      }
    )

    // Authenticate user from Authorization header or session cookie
    const authHeader = request.headers.get('authorization')
    let user
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const userResult = await supabase.auth.getUser(token)
      if (!userResult || userResult.error || !userResult.data?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = userResult.data.user
    } else {
      const sessionResult = await supabase.auth.getSession()
      if (!sessionResult || sessionResult.error || !sessionResult.data?.session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = sessionResult.data.session.user
    }

    // Get vendor profile - verify role is 'vendor'
    // Use service role client for queries after authentication to bypass RLS
    // (We've already validated the user, so this is safe)
    const supabaseAdmin = createSupabaseServerClient()
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (!profile || profile.role !== 'vendor') {
      return NextResponse.json({ error: 'Forbidden - Vendor access required' }, { status: 403 })
    }

    const vendorId = profile.id

    // Get distinct service categories for this vendor
    // Use distinct on category, stable ordering, minimal payload (only category)
    // Use service role client for queries (already authenticated user)
    const { data: services, error: servicesError } = await supabaseAdmin
      .from('services')
      .select('category')
      .eq('provider_id', vendorId)
      .eq('is_active', true)
      .order('category', { ascending: true })

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
      return NextResponse.json({ error: 'Failed to fetch service types' }, { status: 500 })
    }

    // Extract distinct categories (database distinct would be better, but Supabase client doesn't support it directly)
    // So we dedupe in memory after stable ordering
    const uniqueCategories = Array.from(
      new Set((services || []).map(s => s.category).filter(Boolean))
    ).sort()

    return NextResponse.json({
      service_types: uniqueCategories
    })

  } catch (error) {
    console.error('Error in GET /api/vendor/service-types:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
