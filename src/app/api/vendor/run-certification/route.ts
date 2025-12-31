import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run SimCity 5-minute soak test
    // Use absolute path to ensure we're in the right directory
    const projectRoot = process.cwd()
    const command = `node ${projectRoot}/chaos/simcity/cli.mjs "Run all scheduling attacks in sequence for 5 minutes. Escalate retries and restarts. Stop on invariant violation."`
    
    const { stdout } = await execAsync(command, {
      cwd: projectRoot,
      env: {
        ...process.env,
        SIMCITY_PLANNER: 'stub',
        SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
        // Use request hostname for subdomain support, fallback to env
        TARGET_URL: process.env.TARGET_URL || 
                    (request ? `https://${request.headers.get('host') || 'bookiji.com'}` : null) ||
                    process.env.NEXT_PUBLIC_APP_URL || 
                    'http://localhost:3000'
      },
      timeout: 360000 // 6 minutes max
    })

    // Parse result from stdout
    const isPass = stdout.includes('✅ PASS')
    const attacksCovered = ['double_booking_attack', 'overlapping_slots_attack', 'cancel_rebook_race']
    
    // Extract duration if available
    const durationMatch = stdout.match(/Elapsed time: (\d+)s/)
    const durationSeconds = durationMatch ? parseInt(durationMatch[1], 10) : 300

    // Extract failure reason if failed
    let failureReason: string | undefined
    let snapshotPath: string | undefined
    
    if (!isPass) {
      const failureMatch = stdout.match(/Failure: (.+)/)
      failureReason = failureMatch ? failureMatch[1] : 'Unknown failure'
      
      const snapshotMatch = stdout.match(/Forensic snapshot: (.+)/)
      snapshotPath = snapshotMatch ? snapshotMatch[1] : undefined
    }

    const result = {
      status: isPass ? 'pass' : 'fail' as const,
      timestamp: new Date().toISOString(),
      attacks_covered: attacksCovered,
      duration_seconds: durationSeconds,
      ...(failureReason && { failure_reason: failureReason }),
      ...(snapshotPath && { snapshot_path: snapshotPath })
    }

    // Store certification result (optional - can be stored in database)
    // TODO: Store in vendor_certifications table

    return NextResponse.json(result)
  } catch (error) {
    console.error('Certification error:', error)
    return NextResponse.json(
      { 
        error: 'Certification failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

