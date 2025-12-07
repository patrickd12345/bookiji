import { NextRequest, NextResponse } from 'next/server'
import { getOpsMode } from '../../_config'
import {
  fetchSimcitySnapshot,
  simcityToSLOs
} from '../../_simcity/ops-from-simcity'

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  if (getOpsMode() === 'simcity') {
    try {
      const { metrics, violations } = await fetchSimcitySnapshot(request.nextUrl.origin)
      const sloName = decodeURIComponent(params.name)
      const slo = simcityToSLOs(metrics, violations).find(
        (s) => s.name.toLowerCase() === sloName.toLowerCase()
      )

      if (!slo) {
        return NextResponse.json({ error: 'SLO not found' }, { status: 404 })
      }

      return NextResponse.json(slo)
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to load SimCity SLO',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      )
    }
  }

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

  const target = `${OPS_API_BASE.replace(/\/$/, '')}/ops/slo/${params.name}`
  try {
    const res = await fetch(target, { cache: 'no-store' })
    const raw = await res.text()
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
