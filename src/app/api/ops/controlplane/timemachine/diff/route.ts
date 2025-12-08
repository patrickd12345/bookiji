import { NextRequest, NextResponse } from 'next/server'
import { getTimeMachineDiff } from '../../_lib/time-machine'

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get('from')
  const to = request.nextUrl.searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json(
      { error: 'from and to query params are required' },
      { status: 400 }
    )
  }

  try {
    const diff = await getTimeMachineDiff(from, to)
    return NextResponse.json(diff)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Unable to compute time machine diff',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
