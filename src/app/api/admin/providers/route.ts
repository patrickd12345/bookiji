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

    const rateLimitKey = `admin:${user.email}:providers`
    if (!rateLimit(rateLimitKey, 30, 1)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(10, parseInt(searchParams.get('limit') || '50')), 200)
    const status = searchParams.get('status') // vendor_status
    const city = searchParams.get('city')
    const serviceType = searchParams.get('service_type')

    const offset = (page - 1) * limit

    // Select vendor profiles with aggregated service and booking counts
    let query = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        business_name,
        vendor_status,
        service_type,
        location,
        created_at,
        updated_at,
        services:services!profiles_id(count),
        bookings:bookings!profiles_id(count)
      `, { count: 'exact' })
      .eq('role', 'vendor')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('vendor_status', status)
    if (city) query = query.ilike('location', `%${city}%`)
    if (serviceType) query = query.eq('service_type', serviceType)

    const { data, error, count } = await query
    if (error) {
      console.error('Admin providers fetch error:', error)
      if (error.code === '42501' || String(error.message).toLowerCase().includes('permission denied')) {
        return NextResponse.json({
          error: 'Permission denied',
          hint: 'Check: admin role assigned? Session valid? Contact support if issue persists.',
          code: error.code
        }, { status: 403 })
      }
      return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
    }

    const total = typeof count === 'number' ? count : (Array.isArray(data) ? data.length : 0)
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
    console.error('Admin providers API error:', error)
    return NextResponse.json({ error: 'Internal server error', hint: 'Please try again later or contact support' }, { status: 500 })
  }
}

