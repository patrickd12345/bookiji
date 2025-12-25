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

async function fetchJson(url, { method = 'GET', headers = {}, body, timeoutMs = 5000 } = {}) {
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
  const duration = parseInt(args.duration || '60', 10)
  const concurrency = parseInt(args.concurrency || '10', 10)
  const targetUrl = validateTargetUrl(args['target-url'] || 'http://localhost:3000')
  const tier = args.tier || 'availability_integrity'
  const out = args.out

  console.error(`[${tier}] Starting availability integrity race attack scenario`)
  console.error(`  Seed: ${seed}`)
  console.error(`  Duration: ${duration}s`)
  console.error(`  Concurrency: ${concurrency}`)
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

  // Helper to create a test provider
  async function createTestProvider() {
    const providerId = stableUuid(`provider-${seed}-${Date.now()}`)
    return providerId
  }

  const failures = []
  const startTime = Date.now()
  const endTime = startTime + duration * 1000

  // Test 1: Overlap insert race - try to insert overlapping slots concurrently
  console.error('[Test 1] Concurrent overlapping slot inserts')
  const test1ProviderId = await createTestProvider()
  const test1BaseTime = new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
  test1BaseTime.setHours(10, 0, 0, 0)

  // Create N overlapping slots (same provider, overlapping time ranges)
  const test1Slots = Array(concurrency).fill(null).map((_, i) => ({
    provider_id: test1ProviderId,
    start_time: new Date(test1BaseTime.getTime() + i * 30 * 60 * 1000).toISOString(), // Overlap by 30 min
    end_time: new Date(test1BaseTime.getTime() + (i + 2) * 30 * 60 * 1000).toISOString(), // 1 hour slots
    is_available: true,
    slot_type: 'regular'
  }))

  // Fire concurrent insert requests
  const test1Promises = test1Slots.map(slot =>
    fetchJson(`${restBase}/availability_slots`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: slot,
      timeoutMs: 5000
    })
  )

  const test1Results = await Promise.all(test1Promises)
  const test1Successes = test1Results.filter(r => r.ok && r.status === 200 || r.status === 201)
  const test1Conflicts = test1Results.filter(r => r.status === 409)
  const test1Errors = test1Results.filter(r => !r.ok && r.status !== 409)

  // Should have exactly 1 success (first one) and rest should be 409
  if (test1Successes.length !== 1) {
    failures.push({
      test: 'overlap_insert_race',
      error: `Expected exactly 1 successful insert, got ${test1Successes.length}. Conflicts: ${test1Conflicts.length}`,
      results: test1Results.map(r => ({ status: r.status, ok: r.ok }))
    })
  } else if (test1Conflicts.length < concurrency - 1) {
    failures.push({
      test: 'overlap_insert_race',
      error: `Expected ${concurrency - 1} conflicts, got ${test1Conflicts.length}`,
      results: test1Results.map(r => ({ status: r.status, ok: r.ok }))
    })
  } else {
    console.error(`  ✓ Exactly 1 slot created, ${test1Conflicts.length} conflicts detected (correct)`)
  }

  if (test1Errors.length > 0) {
    failures.push({
      test: 'overlap_insert_race',
      error: `Unexpected errors: ${test1Errors.map(e => e.status).join(', ')}`,
      results: test1Errors
    })
  }

  // Test 2: Double-claim race - try to claim the same slot concurrently
  console.error('[Test 2] Concurrent slot claim race')
  const test2ProviderId = await createTestProvider()
  const test2SlotTime = new Date(Date.now() + 48 * 60 * 60 * 1000) // Day after tomorrow
  test2SlotTime.setHours(14, 0, 0, 0)

  // Create a single available slot
  const { json: test2Slot } = await fetchJson(`${restBase}/availability_slots`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: {
      provider_id: test2ProviderId,
      start_time: test2SlotTime.toISOString(),
      end_time: new Date(test2SlotTime.getTime() + 60 * 60 * 1000).toISOString(),
      is_available: true,
      slot_type: 'regular'
    },
    timeoutMs: 5000
  })

  if (!test2Slot || !test2Slot.id) {
    failures.push({
      test: 'double_claim_race_setup',
      error: 'Failed to create test slot for claim race',
      result: test2Slot
    })
  } else {
    const test2SlotId = Array.isArray(test2Slot) ? test2Slot[0].id : test2Slot.id

    // Fire N concurrent claim requests for the same slot
    const test2Promises = Array(concurrency).fill(null).map(() =>
      fetchJson(`${restBase}/rpc/claim_availability_slot_atomically`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: { p_slot_id: test2SlotId },
        timeoutMs: 5000
      })
    )

    const test2Results = await Promise.all(test2Promises)
    const test2Successes = test2Results.filter(r => {
      const result = Array.isArray(r.json) ? r.json[0] : r.json
      return r.ok && result?.success === true
    })
    const test2Failures = test2Results.filter(r => {
      const result = Array.isArray(r.json) ? r.json[0] : r.json
      return !r.ok || result?.success === false
    })

    // Should have exactly 1 successful claim
    if (test2Successes.length !== 1) {
      failures.push({
        test: 'double_claim_race',
        error: `Expected exactly 1 successful claim, got ${test2Successes.length}`,
        results: test2Results.map(r => {
          const result = Array.isArray(r.json) ? r.json[0] : r.json
          return { status: r.status, success: result?.success, error: result?.error_message }
        })
      })
    } else {
      console.error(`  ✓ Exactly 1 claim succeeded, ${test2Failures.length} failed (correct)`)
    }
  }

  // Test 3: Time travel check - try to insert slot with end_time < start_time
  console.error('[Test 3] Time travel validation')
  const test3ProviderId = await createTestProvider()
  const test3SlotTime = new Date(Date.now() + 72 * 60 * 60 * 1000) // 3 days from now

  const test3Result = await fetchJson(`${restBase}/availability_slots`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: {
      provider_id: test3ProviderId,
      start_time: test3SlotTime.toISOString(),
      end_time: new Date(test3SlotTime.getTime() - 60 * 60 * 1000).toISOString(), // End before start!
      is_available: true,
      slot_type: 'regular'
    },
    timeoutMs: 5000
  })

  // Should be rejected (409 or 400)
  if (test3Result.ok && (test3Result.status === 200 || test3Result.status === 201)) {
    failures.push({
      test: 'time_travel_validation',
      error: 'Time travel slot was accepted (should be rejected)',
      result: test3Result
    })
  } else {
    console.error(`  ✓ Time travel slot correctly rejected (status: ${test3Result.status})`)
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
  console.error(`\n[${tier}] Completed in ${elapsed}s`)
  console.error(`  Tests run: 3`)
  console.error(`  Failures: ${failures.length}`)

  if (failures.length > 0) {
    console.error('\nFailures:')
    for (const f of failures) {
      console.error(`  [${f.test}] ${f.error}`)
    }

    if (out) {
      const fs = await import('node:fs/promises')
      await fs.writeFile(out, JSON.stringify({ failures, seed, duration, concurrency }, null, 2))
      console.error(`\nFailure details written to: ${out}`)
    }

    process.exit(1)
  } else {
    console.error('\n✓ All availability integrity tests passed')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

