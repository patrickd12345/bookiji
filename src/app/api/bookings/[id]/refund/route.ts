import { NextRequest, NextResponse } from 'next/server'
import { processRefund } from '@/lib/services/refundService'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const resolvedParams = await params
    const body = await request.json().catch(() => ({}))
    const result = await processRefund(resolvedParams.id, body)
    const status = result.status === 'failed' ? 400 : 200
    return NextResponse.json(result, { status })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: msg }, { status: /Forbidden/.test(msg) ? 403 : 401 })
  }
}
