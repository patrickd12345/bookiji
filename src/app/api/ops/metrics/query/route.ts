import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Resolve base URL: prefer env vars, fall back to request origin for local dev
  const OPS_API_BASE =
    process.env.OPS_API_BASE ||
    process.env.NEXT_PUBLIC_OPS_BASE ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    request.nextUrl.origin ||
    null

  if (!OPS_API_BASE) {
    return NextResponse.json(
      { error: 'OPS_API_BASE not configured and cannot determine base URL' },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const target = `${OPS_API_BASE.replace(/\/$/, '')}/ops/metrics/query`

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    })
    const raw = await res.text()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any
    try {
      data = JSON.parse(raw)
    } catch {
      data = raw
    }
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch from Ops Fabric',
        message: error instanceof Error ? error.message : 'Unknown error',
        target
      },
      { status: 503 }
    )
  }
}
