import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ success: false, bookings: [], count: 0, error: 'User ID is required' }, { status: 400 })
    }

    // Map auth user_id -> profile.id for accurate filtering
    let profileId: string | null = null
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle()
    profileId = profileRow?.id ?? null
    const filterId = profileId || userId

    const { data, error } = await supabase
      .from('bookings')
      .select(`*, services(name), customers:profiles!bookings_customer_id_fkey(full_name), providers:profiles!bookings_provider_id_fkey(full_name)`)
      .or(`customer_id.eq.${filterId},provider_id.eq.${filterId}`)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, bookings: [], count: 0, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, bookings: data ?? [], count: data?.length ?? 0 })
  } catch (err) {
    return NextResponse.json({ success: false, bookings: [], count: 0, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
