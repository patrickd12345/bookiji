import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseClient()

  const now = new Date()
  const from = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const to = now.toISOString()

  // total events in the last hour
  const totalRes = await supabase
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', from)
    .lte('created_at', to)

  const totalEvents = totalRes.count ?? 0

  // error events in the last hour
  const errRes = await supabase
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_name', 'error_encountered')
    .gte('created_at', from)
    .lte('created_at', to)

  const errorEvents = errRes.count ?? 0

  // fetch events to compute active users and p95 session duration
  const { data: events } = await supabase
    .from('analytics_events')
    .select('properties')
    .gte('created_at', from)
    .lte('created_at', to)

  const userIds = new Set<string>()
  const durations: number[] = []
  events?.forEach((row: any) => {
    const props = row.properties || {}
    if (props.user_id) userIds.add(props.user_id)
    if (props.session_duration) {
      const n = Number(props.session_duration)
      if (!isNaN(n)) durations.push(n)
    }
  })

  durations.sort((a, b) => a - b)
  const p95Index = durations.length ? Math.floor(durations.length * 0.95) - 1 : -1
  const p95 = p95Index >= 0 ? durations[p95Index] : 0

  const requestsPerMinute = Number((totalEvents / 60).toFixed(2))
  const errorRate = totalEvents > 0 ? Number(((errorEvents / totalEvents) * 100).toFixed(2)) : 0
  const activeUsers = userIds.size

  const data = [
    { label: 'Requests/min', value: requestsPerMinute },
    { label: 'p95 Session Duration (s)', value: p95 },
    { label: 'Error Rate (%)', value: errorRate },
    { label: 'Active Users', value: activeUsers }
  ]

  return NextResponse.json({ ok: true, data })
}
