import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { getAuthenticatedUserId } from '@/app/api/_utils/auth'

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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











