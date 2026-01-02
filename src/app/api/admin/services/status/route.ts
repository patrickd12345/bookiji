import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { rateLimit } from '@/lib/ratelimit'

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

    const rateLimitKey = `admin:${user.email}:services-status`
    if (!rateLimit(rateLimitKey, 30, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const status: Record<string, any> = {}

    // DB
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1)
      status.database = { healthy: !error, detail: error ? error.message : null }
    } catch (err) {
      status.database = { healthy: false, detail: String(err) }
    }

    // Payments (env check)
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_LIVE_KEY || null
      status.payments = { configured: Boolean(stripeKey), masked: stripeKey ? 'configured' : 'missing' }
    } catch (err) {
      status.payments = { configured: false, error: String(err) }
    }

    // Search / indexing
    try {
      const { error } = await supabase.from('services').select('id').limit(1)
      status.search = { healthy: !error, detail: error ? error.message : null }
    } catch (err) {
      status.search = { healthy: false, detail: String(err) }
    }

    // Auth (supabase config presence)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PROD_SUPABASE_URL || null
      status.auth = { supabaseUrl: Boolean(supabaseUrl), note: supabaseUrl ? 'present' : 'missing' }
    } catch (err) {
      status.auth = { healthy: false, error: String(err) }
    }

    return NextResponse.json({ services: status, timestamp: new Date().toISOString() })

  } catch (error) {
    console.error('Admin services status API error:', error)
    return NextResponse.json({ error: 'Internal server error', hint: 'Please try again later or contact support' }, { status: 500 })
  }
}

