import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { rateLimit } from '@/lib/ratelimit'
import { getFeatureFlags, getDevelopmentFlags } from '@/config/featureFlags'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      await requireAdmin({ user })
    } catch {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const rateLimitKey = `admin:${user.email}:feature-flags`
    if (!rateLimit(rateLimitKey, 30, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('org_id') || undefined

    const flags = getFeatureFlags(orgId)
    const devFlags = getDevelopmentFlags()

    // Merge dev flags over production flags for visibility
    const merged = { ...flags }
    // shallow merge categories
    Object.keys(devFlags).forEach((k) => {
      // @ts-expect-error dynamic
      if (devFlags[k] !== undefined) merged[k] = devFlags[k]
    })

    return NextResponse.json({
      flags,
      developmentOverrides: devFlags,
      merged,
      orgId: orgId || null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin feature-flags API error:', error)
    return NextResponse.json({ error: 'Internal server error', hint: 'Please try again later or contact support' }, { status: 500 })
  }
}

