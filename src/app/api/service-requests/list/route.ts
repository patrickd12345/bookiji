import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import { getAuthenticatedUserId } from '../../_utils/auth'

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = getSupabaseConfig()
    const supabase = createClient(config.url, config.publishableKey || config.anonKey)

    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching service requests:', error)
      return NextResponse.json({ error: 'Failed to fetch service requests' }, { status: 500 })
    }

    return NextResponse.json({ requests: data })
  } catch (err) {
    console.error('Error in service requests list route:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
