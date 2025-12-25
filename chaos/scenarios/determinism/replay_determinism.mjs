import crypto from 'node:crypto'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const name = key.slice(2)
    const value = argv[i + 1]
    if (value && !value.startsWith('--')) {
      args[name] = value
      i++
    } else {
      args[name] = true
    }
  }
  return args
}

function stableUuid(input) {
  const hex = crypto.createHash('sha256').update(input).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function fetchJson(url, { method = 'GET', headers = {}, body, timeoutMs = 10000 } = {}) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  const start = performance.now()
  try {
    const fetchOptions = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    }
    const res = await fetch(url, fetchOptions)
    const latencyMs = Math.round(performance.now() - start)
    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    return { ok: res.ok, status: res.status, json, text, latencyMs }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start)
    if (err.name === 'AbortError') {
      return { ok: false, status: 504, json: null, text: 'Request timeout', latencyMs, timeout: true }
    }
    throw err
  } finally {
    clearTimeout(t)
  }
}

function validateTargetUrl(raw) {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('target-url must be a valid URL')
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error('target-url must be http(s)')
  return url
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const seed = args.seed || '42'
  const targetUrl = validateTargetUrl(args['target-url'] || 'http://localhost:3000')
  const tier = args.tier || 'replay_determinism'
  const out = args.out

  console.error(`[${tier}] Starting replay determinism test`)
  console.error(`  Seed: ${seed}`)
  console.error(`  Target: ${targetUrl}`)

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }

  const supabaseHeaders = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  }

  const restBase = `${supabaseUrl}/rest/v1`

  // Step 1: Create initial SimCity run and record events
  console.error('[Step 1] Creating initial run and recording events...')
  
  const run1Id = stableUuid(`run1-${seed}-${Date.now()}`)
  const run1Seed = parseInt(seed) || 42

  // Create SimCity run request
  const run1Request = await fetchJson(`${targetUrl}/api/ops/simcity/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      seed: run1Seed,
      duration: 10, // Short run for testing
      scenario: 'marketplace_bootstrap'
    },
    timeoutMs: 30000
  })

  if (!run1Request.ok) {
    throw new Error(`Failed to create initial run: ${run1Request.text}`)
  }

  const run1Data = run1Request.json
  const actualRun1Id = run1Data?.run_id || run1Id

  // Wait for run to complete (or timeout)
  console.error('  Waiting for run to complete...')
  let run1Complete = false
  let attempts = 0
  const maxAttempts = 60 // 60 seconds max

  while (!run1Complete && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const statusRes = await fetchJson(`${restBase}/simcity_runs?id=eq.${actualRun1Id}`, {
      method: 'GET',
      headers: supabaseHeaders,
      timeoutMs: 5000
    })

    if (statusRes.ok && statusRes.json && Array.isArray(statusRes.json) && statusRes.json.length > 0) {
      const run = statusRes.json[0]
      if (run.status === 'completed' || run.status === 'failed') {
        run1Complete = true
        console.error(`  Run completed with status: ${run.status}`)
      }
    }

    attempts++
  }

  if (!run1Complete) {
    throw new Error('Initial run did not complete within timeout')
  }

  // Step 2: Fetch events from run 1
  console.error('[Step 2] Fetching events from initial run...')
  const events1Res = await fetchJson(`${restBase}/simcity_run_events?run_id=eq.${actualRun1Id}&order=event_index.asc`, {
    method: 'GET',
    headers: supabaseHeaders,
    timeoutMs: 10000
  })

  if (!events1Res.ok || !events1Res.json) {
    throw new Error(`Failed to fetch events from run 1: ${events1Res.text}`)
  }

  const events1 = Array.isArray(events1Res.json) ? events1Res.json : []
  console.error(`  Fetched ${events1.length} events`)

  if (events1.length === 0) {
    throw new Error('No events recorded in initial run')
  }

  // Step 3: Compute hash of run 1 outcome
  console.error('[Step 3] Computing hash of run 1 outcome...')
  const hash1Res = await fetchJson(`${restBase}/rpc/hash_replay_outcome`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: { p_run_id: actualRun1Id },
    timeoutMs: 10000
  })

  if (!hash1Res.ok || !hash1Res.json) {
    throw new Error(`Failed to compute hash for run 1: ${hash1Res.text}`)
  }

  const hash1 = hash1Res.json
  console.error(`  Run 1 hash computed`)

  // Step 4: Replay with same seed and events (if supported)
  // For now, we'll create a second run with the same seed and compare outcomes
  console.error('[Step 4] Creating replay run with same seed...')
  
  const run2Id = stableUuid(`run2-${seed}-${Date.now()}`)
  const run2Seed = run1Seed // Same seed

  const run2Request = await fetchJson(`${targetUrl}/api/ops/simcity/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      seed: run2Seed,
      duration: 10,
      scenario: 'marketplace_bootstrap'
    },
    timeoutMs: 30000
  })

  if (!run2Request.ok) {
    throw new Error(`Failed to create replay run: ${run2Request.text}`)
  }

  const run2Data = run2Request.json
  const actualRun2Id = run2Data?.run_id || run2Id

  // Wait for run 2 to complete
  console.error('  Waiting for replay run to complete...')
  let run2Complete = false
  attempts = 0

  while (!run2Complete && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const statusRes = await fetchJson(`${restBase}/simcity_runs?id=eq.${actualRun2Id}`, {
      method: 'GET',
      headers: supabaseHeaders,
      timeoutMs: 5000
    })

    if (statusRes.ok && statusRes.json && Array.isArray(statusRes.json) && statusRes.json.length > 0) {
      const run = statusRes.json[0]
      if (run.status === 'completed' || run.status === 'failed') {
        run2Complete = true
        console.error(`  Replay run completed with status: ${run.status}`)
      }
    }

    attempts++
  }

  if (!run2Complete) {
    throw new Error('Replay run did not complete within timeout')
  }

  // Step 5: Compute hash of run 2 outcome
  console.error('[Step 5] Computing hash of replay run outcome...')
  const hash2Res = await fetchJson(`${restBase}/rpc/hash_replay_outcome`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: { p_run_id: actualRun2Id },
    timeoutMs: 10000
  })

  if (!hash2Res.ok || !hash2Res.json) {
    throw new Error(`Failed to compute hash for run 2: ${hash2Res.text}`)
  }

  const hash2 = hash2Res.json

  // Step 6: Compare hashes
  console.error('[Step 6] Comparing outcomes...')
  
  const failures = []
  const hash1Str = JSON.stringify(hash1, Object.keys(hash1).sort())
  const hash2Str = JSON.stringify(hash2, Object.keys(hash2).sort())

  // Compare each table hash
  const tables = ['bookings', 'availability_slots', 'notification_outbox', 'ops_events', 'simcity_run_events']
  
  for (const table of tables) {
    const h1 = hash1[table]
    const h2 = hash2[table]
    
    if (h1 !== h2) {
      failures.push({
        table,
        run1_hash: h1,
        run2_hash: h2,
        error: `Hash mismatch for ${table}`
      })
    } else {
      console.error(`  ✓ ${table}: hashes match (${h1})`)
    }
  }

  // Summary
  console.error(`\n[${tier}] Determinism test completed`)
  console.error(`  Run 1 ID: ${actualRun1Id}`)
  console.error(`  Run 2 ID: ${actualRun2Id}`)
  console.error(`  Seed: ${run1Seed}`)
  console.error(`  Failures: ${failures.length}`)

  if (failures.length > 0) {
    console.error('\nFailures:')
    for (const f of failures) {
      console.error(`  [${f.table}] ${f.error}`)
      console.error(`    Run 1: ${f.run1_hash}`)
      console.error(`    Run 2: ${f.run2_hash}`)
    }

    if (out) {
      const fs = await import('node:fs/promises')
      await fs.writeFile(out, JSON.stringify({ 
        failures, 
        seed: run1Seed, 
        run1_id: actualRun1Id,
        run2_id: actualRun2Id,
        hash1,
        hash2
      }, null, 2))
      console.error(`\nFailure details written to: ${out}`)
    }

    process.exit(1)
  } else {
    console.error('\n✓ All replay determinism tests passed - same seed produced identical outcomes')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

