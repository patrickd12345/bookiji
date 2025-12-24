import { NextRequest, NextResponse } from 'next/server'
import { fetchControlPlaneOverview } from '../../_lib/overview'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(request: NextRequest, { params }: any) {
  try {
    const overview = await fetchControlPlaneOverview(request)
    const agent = overview.agents.find((a) => a.id === params.id)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    return NextResponse.json(agent)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Unable to load agent',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
