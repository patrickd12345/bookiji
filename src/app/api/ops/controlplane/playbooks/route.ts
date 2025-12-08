import { NextResponse } from 'next/server'
import { listPlaybooks } from '../_lib/playbooks'

export async function GET() {
  return NextResponse.json({ playbooks: listPlaybooks() })
}
