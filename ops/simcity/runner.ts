import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env from root
dotenv.config({ path: path.join(__dirname, '../../.env') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const POLL_INTERVAL = 5000

function stableUuid(input: string) {
  const hex = crypto.createHash('sha256').update(input).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function poll() {
  try {
    // 1. Check if any run is already RUNNING (global lock)
    const { data: running } = await supabase
      .from('simcity_run_requests')
      .select('id')
      .eq('status', 'RUNNING')
      .limit(1)

    if (running && running.length > 0) {
      // Check if the container is actually still running
      // For now, we assume if it's RUNNING in DB, it's running.
      // A more robust implementation would check docker ps.
      return
    }

    // 2. Look for PENDING requests
    const { data: pending, error } = await supabase
      .from('simcity_run_requests')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(1)

    if (error) {
      console.error('Error polling pending requests:', error)
      return
    }

    if (!pending || pending.length === 0) {
      return
    }

    const request = pending[0]
    await startRun(request)
  } catch (err) {
    console.error('Poll error:', err)
  }
}

async function startRun(request: any) {
  const containerName = `simcity-run-${request.id}`
  const runId = stableUuid(`chaos-run:${request.seed}`)
  
  console.log(`[Runner] Starting run ${request.id} (RunId: ${runId}, Tier: ${request.tier})`)

  await supabase
    .from('simcity_run_requests')
    .update({ 
      status: 'RUNNING', 
      started_at: new Date().toISOString(),
      run_id: runId
    })
    .eq('id', request.id)

  const args = [
    'run',
    '--rm',
    '--name', containerName,
    '--network', 'host',
    '-e', `SUPABASE_URL=${process.env.SUPABASE_URL}`,
    '-e', `SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'chaos-harness',
    '--target-url', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    '--tier', request.tier,
    '--concurrency', String(request.concurrency),
    '--max-events', String(request.max_events),
    '--duration-seconds', String(request.duration_seconds)
  ]

  if (request.seed) {
    args.push('--seed', String(request.seed))
  }

  const docker = spawn('docker', args)

  docker.stdout.on('data', (data) => {
    process.stdout.write(`[Run ${request.id}] ${data}`)
  })

  docker.stderr.on('data', (data) => {
    process.stderr.write(`[Run ${request.id} ERR] ${data}`)
  })

  docker.on('close', async (code) => {
    console.log(`[Runner] Run ${request.id} exited with code ${code}`)

    // Check if it was STOPPED via API
    const { data: current } = await supabase
      .from('simcity_run_requests')
      .select('status')
      .eq('id', request.id)
      .single()

    if (current?.status === 'STOPPED') {
      await Promise.all([
        supabase
          .from('simcity_run_requests')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', request.id),
        supabase
          .from('simcity_run_live')
          .update({ status: 'STOPPED' })
          .eq('run_id', runId)
      ])
      return
    }

    const finalStatus = code === 0 ? 'COMPLETED' : 'FAILED'
    
    await supabase
      .from('simcity_run_requests')
      .update({ 
        status: finalStatus,
        ended_at: new Date().toISOString()
      })
      .eq('id', request.id)
  })
}

console.log('SimCity Runner started. Polling for PENDING requests...')
setInterval(poll, POLL_INTERVAL)
poll()

