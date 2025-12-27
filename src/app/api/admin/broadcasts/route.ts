import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'

/**
 * AUTHORITATIVE PATH — Admin role verification required
 * See: docs/invariants/admin-ops.md INV-1
 */
export async function POST(request: NextRequest) {
  try {
    // Admin verification
    const authSupabase = createSupabaseServerClient()
    const { data: { session } } = await authSupabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await requireAdmin(session)
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { service, customerLocation, description } = await request.json()

    if (!service || !customerLocation) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getServerSupabase()
    
    // Create broadcast/service request
    const { data, error } = await supabase
      .from('service_requests')
      .insert({
        service_type: service,
        customer_location: customerLocation,
        description: description || '',
        status: 'open',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Create broadcast error:', error)
      return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Broadcast created successfully',
      broadcast: data
    })
  } catch (error) {
    console.error('Create broadcast error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}











