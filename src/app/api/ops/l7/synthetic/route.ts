import { NextResponse } from 'next/server'
import { runSyntheticCheck } from '../../../../../../packages/opsai-l7/src/synthetic'

export async function GET() {
  const report = runSyntheticCheck()
  return NextResponse.json({
    success: true,
    report
  })
}
