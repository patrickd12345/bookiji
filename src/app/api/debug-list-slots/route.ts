import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

export async function GET() {
  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('availability_slots')
      .select('*')
      .gte('start_time', `${tomorrowStr}T00:00:00Z`)
      .lt('start_time', `${tomorrowStr}T23:59:59Z`)

    if (error) {
      return NextResponse.json({ success: false, error })
    }

    return NextResponse.json({ success: true, slots: data })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : error })
  }
} 