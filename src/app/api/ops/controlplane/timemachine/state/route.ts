import { NextRequest, NextResponse } from 'next/server'
import { getTimeMachineState } from '../../_lib/time-machine'

export async function GET(request: NextRequest) {
  const at = request.nextUrl.searchParams.get('at') || new Date().toISOString()

  try {
    const state = await getTimeMachineState(at)
    return NextResponse.json(state)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Unable to fetch time machine state',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
