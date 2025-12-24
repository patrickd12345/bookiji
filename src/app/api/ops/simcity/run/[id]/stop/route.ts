import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseProxies'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  try {
    // 1. Mark as STOPPED in DB
    const { data, error } = await supabase
      .from('simcity_run_requests')
      .update({ status: 'STOPPED', ended_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 2. Send SIGTERM via docker stop
    // Container name follows the convention in runner.ts: simcity-run-${id}
    const containerName = `simcity-run-${id}`
    try {
      await execAsync(`docker stop ${containerName}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (dockerErr: any) {
      // It's okay if it fails (e.g. container already stopped or not found)
      console.warn(`Could not stop container ${containerName}:`, dockerErr.message)
    }

    return NextResponse.json({ 
      message: 'Run stopped successfully',
      request: {
        ...data,
        seed: data.seed ? data.seed.toString() : null
      }
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

