import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'

export async function GET(_req: NextRequest) {
  // TODO: query PostHog or Supabase aggregated metrics
  // Placeholder values
  const data = [
    { label: 'Requests/min', value: 123 },
    { label: 'p95 Latency (ms)', value: 220 },
    { label: 'Error Rate (%)', value: 0.8 },
    { label: 'Active Users', value: 57 }
  ]
  return NextResponse.json({ ok: true, data })
} 