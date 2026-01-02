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

    const rateLimitKey = `admin:${user.email}:payments`
    if (!rateLimit(rateLimitKey, 30, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(10, parseInt(searchParams.get('limit') || '50')), 200)
    const status = searchParams.get('status')
    const ownerType = searchParams.get('owner_type')
    const bookingId = searchParams.get('booking_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const offset = (page - 1) * limit

    let query = supabase
      .from('payment_intents')
      .select(`
        id,
        owner_type,
        owner_id,
        booking_id,
        credit_intent_id,
        amount_cents,
        currency,
        status,
        external_provider,
        external_id,
        idempotency_key,
        metadata,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (ownerType) query = query.eq('owner_type', ownerType)
    if (bookingId) query = query.eq('booking_id', bookingId)
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    const { data, error } = await query
    if (error) {
      console.error('Admin payments fetch error:', error)
      if (error.code === '42501' || String(error.message).toLowerCase().includes('permission denied')) {
        return NextResponse.json({
          error: 'Permission denied',
          hint: 'Check: admin role assigned? Session valid? Contact support if issue persists.',
          code: error.code
        }, { status: 403 })
      }
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const { count, error: countError } = await supabase
      .from('payment_intents')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.warn('Payment intents count error:', countError)
    }

    const total = count || 0
    const totalPages = Math.ceil(total / limit) || 1

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Admin payments API error:', error)
    return NextResponse.json({ error: 'Internal server error', hint: 'Please try again later or contact support' }, { status: 500 })
  }
}

