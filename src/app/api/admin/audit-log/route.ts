import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { rateLimit } from '@/lib/ratelimit'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export async function GET(request: NextRequest) {
  try {
    // Get session from request headers (you may need to adjust this based on your auth setup)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract user info from auth header (simplified - adjust based on your auth flow)
    const token = authHeader.replace('Bearer ', '')
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const adminUser = await requireAdmin({ user })
    
    // Apply rate limiting
    const rateLimitKey = `admin:${adminUser.email}:audit`
    if (!rateLimit(rateLimitKey, 60, 1)) { // 60 requests per minute
      return NextResponse.json(
        { error: 'Too Many Requests', hint: 'Rate limit exceeded. Please wait before retrying.' },
        { status: 429 }
      )
    }

    // Get query parameters with pagination defaults and hard upper bounds
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(
      Math.max(10, parseInt(searchParams.get('limit') || '50')), // Default 50, min 10
      200 // Hard upper bound to prevent "show me everything" mishaps
    )
    const action = searchParams.get('action')
    const adminUserId = searchParams.get('admin_user_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('admin_audit_log')
      .select(`
        id,
        admin_user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        request_id,
        created_at,
        profiles!admin_audit_log_admin_user_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (action) {
      query = query.eq('action', action)
    }
    if (adminUserId) {
      query = query.eq('admin_user_id', adminUserId)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: auditLogs, error } = await query

    if (error) {
      console.error('Audit log fetch error:', error)
      
      // Provide generic RLS error hints - never echo table/column names or policy text
      if (error.code === '42501' || error.message.includes('permission denied')) {
        return NextResponse.json({
          error: 'Permission denied',
          hint: 'Check: admin role assigned? Session valid? Contact support if issue persists.',
          code: error.code
        }, { status: 403 })
      }
      
      return NextResponse.json({
        error: 'Failed to fetch audit logs',
        hint: 'Please try again later or contact support'
      }, { status: 500 })
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.warn('Count error:', countError)
    }

    return NextResponse.json({
      data: auditLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: page < Math.ceil((count || 0) / limit),
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Audit log API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      hint: 'Please try again later or contact support'
    }, { status: 500 })
  }
}
