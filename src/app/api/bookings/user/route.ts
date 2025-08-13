import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ success: false, bookings: [], count: 0, error: 'User ID is required' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('bookings')
      .select(`*, services(name), customers:users!bookings_customer_id_fkey(full_name), vendors:users!bookings_vendor_id_fkey(full_name)`)
      .or(`customer_id.eq.${userId},vendor_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, bookings: [], count: 0, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, bookings: data ?? [], count: data?.length ?? 0 })
  } catch (err) {
    return NextResponse.json({ success: false, bookings: [], count: 0, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}