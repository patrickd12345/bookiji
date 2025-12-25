/**
 * SimCity Runner - Executes test plans using the harness
 * 
 * Takes a PLAN object and executes it by:
 * 1. Running each capability in sequence
 * 2. Applying chaos actions (retry, restart, reorder)
 * 3. Checking invariants after each event
 * 4. Stopping on violation or time limit
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Execute a test plan
 * @param {Object} plan - Plan object from planner
 * @returns {Promise<Object>} Execution result
 */
export async function executePlan(plan) {
  const {
    capabilityIds,
    durationMinutes,
    chaos,
    stopOnInvariantViolation,
    seed,
    concurrency,
    maxEvents
  } = plan

  const durationSeconds = durationMinutes * 60
  // Harness is at chaos/harness/index.mjs relative to workspace root
  // Since we run from workspace root, use relative path
  const harnessPath = join(__dirname, '../harness/index.mjs')
  
  const targetUrl = process.env.TARGET_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  // For now, we'll run the harness directly with escalated chaos parameters
  // In the future, this could orchestrate multiple capability runs
  
  console.log(`   Running capability: ${capabilityIds[0] || 'default'}`)
  console.log(`   Seed: ${seed}`)
  console.log(`   Duration: ${durationSeconds}s`)
  console.log(`   Concurrency: ${concurrency}`)
  console.log(`   Max events: ${maxEvents}`)
  console.log(`   Chaos: retry=${chaos.retryRate}, restart=${chaos.restartRate}`)
  console.log('')

  return new Promise((resolve, reject) => {
    const args = [
      harnessPath,
      '--seed', seed,
      '--duration', String(durationSeconds),
      '--max-events', String(maxEvents),
      '--concurrency', String(concurrency),
      '--target-url', targetUrl,
      '--tier', 'soak'
    ]

    const child = spawn('node', args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        // Pass chaos rates via env (harness can read these if needed)
        SIMCITY_CHAOS_RETRY_RATE: String(chaos.retryRate),
        SIMCITY_CHAOS_RESTART_RATE: String(chaos.restartRate),
        SIMCITY_CHAOS_REORDER_RATE: String(chaos.reorderRate)
      }
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => {
      const text = data.toString()
      stdout += text
      process.stdout.write(text)
    })

    child.stderr?.on('data', (data) => {
      const text = data.toString()
      stderr += text
      process.stderr.write(text)
    })

    child.on('close', (code) => {
      // Parse harness output
      // Format: "PASS\nseed: ...\nevents: ...\nduration: ..."
      // or: "FAIL\ninvariant: ...\nseed: ...\nevent_index: ..."
      
      const lines = stdout.split('\n')
      const firstLine = lines[0]?.trim()

      if (code === 0 && firstLine === 'PASS') {
        const eventsMatch = stdout.match(/events:\s*(\d+)/)
        const durationMatch = stdout.match(/duration:\s*([\d.]+)s/)
        
        resolve({
          success: true,
          eventsExecuted: eventsMatch ? parseInt(eventsMatch[1], 10) : 0,
          durationSeconds: durationMatch ? parseFloat(durationMatch[1]) : durationSeconds
        })
      } else if (code === 1 || firstLine === 'FAIL') {
        const invariantMatch = stdout.match(/invariant:\s*([^\n]+)/)
        const eventIndexMatch = stdout.match(/event_index:\s*(-?\d+)/)
        const errorMatch = stdout.match(/error:\s*([^\n]+)/)
        const forensicMatch = stdout.match(/forensic:\s*({[\s\S]*?})(?:\n|$)/)
        
        let forensic = null
        if (forensicMatch) {
          try {
            forensic = JSON.parse(forensicMatch[1])
          } catch {
            // Ignore parse errors
          }
        }

        const failedInvariant = invariantMatch ? invariantMatch[1].trim() : (errorMatch ? 'harness_error' : 'unknown')
        const failedEventIndex = eventIndexMatch ? parseInt(eventIndexMatch[1], 10) : -1

        resolve({
          success: false,
          failedInvariant,
          failedEventIndex,
          forensic,
          error: errorMatch ? errorMatch[1].trim() : undefined
        })
      } else {
        reject(new Error(`Harness exited with code ${code}\n${stderr}`))
      }
    })

    child.on('error', (error) => {
      reject(new Error(`Failed to spawn harness: ${error.message}`))
    })
  })
}
