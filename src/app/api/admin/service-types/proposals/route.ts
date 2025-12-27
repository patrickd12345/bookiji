import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'

/**
 * AUTHORITATIVE PATH — Admin Service Type Proposals
 * See: docs/invariants/admin-ops.md INV-1
 */
import { getServerSupabase } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'

  try {
    let q = supabase
      .from('service_type_proposals')
      .select('id,label,vendor_id,business_name,email,phone,status,created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (status !== 'all') q = q.eq('status', status)

    const { data, error } = await q
    if (error) throw error

    return NextResponse.json({ ok: true, data })
  } catch (err: unknown) {
    console.error('[admin/service-types/proposals] error', err)
    const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
