import { NextRequest, NextResponse } from 'next/server'
import { fetchControlPlaneOverview } from '../_lib/overview'

export async function GET(request: NextRequest) {
  try {
    const overview = await fetchControlPlaneOverview(request)
    return NextResponse.json({ agents: overview.agents })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Unable to load agents',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
