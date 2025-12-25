import { NextRequest, NextResponse } from 'next/server'
import { getVendorMetrics } from '@/lib/metrics/vendor-metrics'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const vendorId = searchParams.get('vendor_id')

    if (!vendorId) {
      return NextResponse.json({ error: 'vendor_id required' }, { status: 400 })
    }

    const metrics = await getVendorMetrics(vendorId)
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

