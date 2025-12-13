import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { getSupabaseConfig } from '@/config/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type TableResult = {
  table: string
  count: number
  error?: string
}

const TARGET_TABLES = ['bookings', 'profiles', 'sessions', 'analytics_events', 'events'] as const

async function resolveAdmin(request: NextRequest) {
  const config = getSupabaseConfig()
  const cookieStore = await cookies()
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
    },
  })

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
  if (profile?.role === 'admin') {
    return data.user
  }

  return null
}

async function authenticate(request: NextRequest) {
  const internalToken = request.headers.get('x-internal-token')
  if (internalToken && internalToken === process.env.INTERNAL_API_TOKEN) {
    return true
  }

  const admin = await resolveAdmin(request)
  return Boolean(admin)
}

async function countSynthetic(client: any, table: string): Promise<TableResult> {
  try {
    const { count, error } = await client.from(table).select('*', { count: 'exact', head: true }).eq('synthetic_source', 'simcity')
    if (error) return { table, count: 0, error: error.message }
    return { table, count: count ?? 0 }
  } catch (error) {
    return { table, count: 0, error: error instanceof Error ? error.message : 'unknown_error' }
  }
}

async function purgeSynthetic(client: any, table: string): Promise<TableResult> {
  const countResult = await countSynthetic(client, table)
  if (countResult.error) return countResult

  if (countResult.count === 0) return countResult

  try {
    const { error } = await client.from(table).delete().eq('synthetic_source', 'simcity')
    if (error) {
      return { ...countResult, error: error.message }
    }
    return countResult
  } catch (error) {
    return { ...countResult, error: error instanceof Error ? error.message : 'unknown_error' }
  }
}

export async function POST(request: NextRequest) {
  if (process.env.BOOKIJI_ENV === 'prod') {
    return NextResponse.json({ error: 'SimCity purge is blocked in production' }, { status: 403 })
  }

  const authorized = await authenticate(request)
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean }
  const dryRun = body?.dryRun === true

  const supabase = createSupabaseServerClient()
  const results: Record<string, TableResult> = {}

  for (const table of TARGET_TABLES) {
    const outcome = dryRun ? await countSynthetic(supabase, table) : await purgeSynthetic(supabase, table)
    results[table] = outcome
  }

  const summary = Object.values(results).reduce(
    (acc, result) => {
      acc.total += result.count
      if (result.error) acc.errors.push({ table: result.table, error: result.error })
      return acc
    },
    { total: 0, errors: [] as Array<{ table: string; error: string }> },
  )

  return NextResponse.json({
    synthetic: true,
    synthetic_source: 'simcity',
    dryRun,
    env: process.env.BOOKIJI_ENV || process.env.NODE_ENV,
    results,
    total: summary.total,
    errors: summary.errors,
  })
}

// @feature simcity.synthetic_purge
