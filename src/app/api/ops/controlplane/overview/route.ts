import { NextRequest, NextResponse } from 'next/server'
import { fetchControlPlaneOverview } from '../_lib/overview'

export async function GET(request: NextRequest) {
  try {
    const overview = await fetchControlPlaneOverview(request)
    return NextResponse.json(overview)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to build control plane overview',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
