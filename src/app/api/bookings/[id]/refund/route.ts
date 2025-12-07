import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { processRefund } from '@/lib/services/refundService'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get user session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const adminUser = await requireAdmin(session)

    const body = await request.json().catch(() => ({}))
    const resolvedParams = await params
    const result = await processRefund(resolvedParams.id, body)
    const status = result.status === 'failed' ? 400 : 200
    return NextResponse.json(result, { status })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: msg }, { status: /Forbidden/.test(msg) ? 403 : 401 })
  }
}
