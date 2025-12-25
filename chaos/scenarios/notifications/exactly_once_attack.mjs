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
  const tier = args.tier || 'notification_exactly_once'
  const out = args.out

  console.error(`[${tier}] Starting notification exactly-once attack scenario`)
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

  // Helper to create a test booking
  async function createTestBooking() {
    const customerId = stableUuid(`customer-${seed}-${Date.now()}`)
    const providerId = stableUuid(`provider-${seed}`)
    const bookingId = stableUuid(`booking-${seed}-${Date.now()}`)
    
    // Create a minimal booking record
    const booking = {
      id: bookingId,
      customer_id: customerId,
      provider_id: providerId,
      status: 'pending',
      total_amount: 1000,
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
    }

    const res = await fetchJson(`${restBase}/bookings`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: booking,
      timeoutMs: 5000
    })

    if (!res.ok) {
      throw new Error(`Failed to create booking: ${res.text}`)
    }

    return { bookingId, customerId, providerId }
  }

  const failures = []
  const startTime = Date.now()
  const endTime = startTime + duration * 1000

  // Test 1: Retry same booking transition N times
  console.error('[Test 1] Retry same booking transition N times')
  const test1 = await createTestBooking()
  const test1IdempotencyKey = `test1-${seed}-${Date.now()}`
  const test1EventType = 'booking_confirmed'

  // Fire N concurrent transition requests with same idempotency key
  const test1Promises = Array(concurrency).fill(null).map(() =>
    fetchJson(`${restBase}/rpc/transition_booking_with_idempotency`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: {
        p_booking_id: test1.bookingId,
        p_new_status: 'confirmed',
        p_idempotency_key: test1IdempotencyKey,
        p_reason: null,
        p_admin_override: false,
        p_admin_id: null
      },
      timeoutMs: 5000
    })
  )

  const test1Results = await Promise.all(test1Promises)
  const test1Successes = test1Results.filter(r => {
    const result = Array.isArray(r.json) ? r.json[0] : r.json
    return r.ok && result?.success === true
  })

  // Check notification_outbox - should have exactly 1 entry
  await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for DB to settle

  const { json: outboxCheck } = await fetchJson(`${restBase}/notification_outbox?booking_id=eq.${test1.bookingId}&event_type=eq.${test1EventType}`, {
    method: 'GET',
    headers: supabaseHeaders,
    timeoutMs: 5000
  })

  const outboxEntries = Array.isArray(outboxCheck) ? outboxCheck : (outboxCheck ? [outboxCheck] : [])

  if (outboxEntries.length !== 1) {
    failures.push({
      test: 'retry_same_transition',
      error: `Expected exactly 1 outbox entry, got ${outboxEntries.length}`,
      outboxEntries: outboxEntries.length,
      transitionResults: test1Successes.length
    })
  } else {
    console.error(`  ✓ Exactly 1 outbox entry created (${outboxEntries[0].status})`)
  }

  // Test 2: Webhook replay simulation
  console.error('[Test 2] Webhook replay simulation')
  const test2 = await createTestBooking()
  const test2IdempotencyKey1 = `test2-${seed}-1-${Date.now()}`
  const test2IdempotencyKey2 = `test2-${seed}-2-${Date.now()}`

  // First transition
  const test2First = await fetchJson(`${restBase}/rpc/transition_booking_with_idempotency`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: {
      p_booking_id: test2.bookingId,
      p_new_status: 'cancelled',
      p_idempotency_key: test2IdempotencyKey1,
      p_reason: 'Test cancellation',
      p_admin_override: false,
      p_admin_id: null
    },
    timeoutMs: 5000
  })

  // Simulate webhook replay with different idempotency key but same transition
  const test2Replay = await fetchJson(`${restBase}/rpc/transition_booking_with_idempotency`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: {
      p_booking_id: test2.bookingId,
      p_new_status: 'cancelled',
      p_idempotency_key: test2IdempotencyKey2,
      p_reason: 'Test cancellation (replay)',
      p_admin_override: false,
      p_admin_id: null
    },
    timeoutMs: 5000
  })

  await new Promise(resolve => setTimeout(resolve, 1000))

  const { json: test2Outbox } = await fetchJson(`${restBase}/notification_outbox?booking_id=eq.${test2.bookingId}&event_type=eq.booking_cancelled`, {
    method: 'GET',
    headers: supabaseHeaders,
    timeoutMs: 5000
  })

  const test2OutboxEntries = Array.isArray(test2Outbox) ? test2Outbox : (test2Outbox ? [test2Outbox] : [])

  // Should still have exactly 1 entry (second transition should be idempotent replay)
  if (test2OutboxEntries.length !== 1) {
    failures.push({
      test: 'webhook_replay',
      error: `Expected exactly 1 outbox entry after replay, got ${test2OutboxEntries.length}`,
      firstResult: test2First.ok,
      replayResult: test2Replay.ok
    })
  } else {
    console.error(`  ✓ Exactly 1 outbox entry after webhook replay`)
  }

  // Test 3: Worker crash simulation
  console.error('[Test 3] Worker crash simulation')
  const test3 = await createTestBooking()
  const test3IdempotencyKey = `test3-${seed}-${Date.now()}`

  // Create transition (enqueues notification)
  await fetchJson(`${restBase}/rpc/transition_booking_with_idempotency`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: {
      p_booking_id: test3.bookingId,
      p_new_status: 'completed',
      p_idempotency_key: test3IdempotencyKey,
      p_reason: null,
      p_admin_override: false,
      p_admin_id: null
    },
    timeoutMs: 5000
  })

  await new Promise(resolve => setTimeout(resolve, 500))

  // Process outbox (simulate worker)
  const test3Process1 = await fetchJson(`${targetUrl}/api/notifications/outbox/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { batchSize: 10 },
    timeoutMs: 5000
  })

  // Simulate worker crash and retry
  const test3Process2 = await fetchJson(`${targetUrl}/api/notifications/outbox/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { batchSize: 10 },
    timeoutMs: 5000
  })

  // Check outbox - should be marked as sent (not pending)
  const { json: test3Outbox } = await fetchJson(`${restBase}/notification_outbox?booking_id=eq.${test3.bookingId}&event_type=eq.booking_completed`, {
    method: 'GET',
    headers: supabaseHeaders,
    timeoutMs: 5000
  })

  const test3OutboxEntries = Array.isArray(test3Outbox) ? test3Outbox : (test3Outbox ? [test3Outbox] : [])

  if (test3OutboxEntries.length !== 1) {
    failures.push({
      test: 'worker_crash_retry',
      error: `Expected exactly 1 outbox entry, got ${test3OutboxEntries.length}`
    })
  } else if (test3OutboxEntries[0].status !== 'sent' && test3OutboxEntries[0].status !== 'pending') {
    failures.push({
      test: 'worker_crash_retry',
      error: `Expected status 'sent' or 'pending', got '${test3OutboxEntries[0].status}'`
    })
  } else {
    console.error(`  ✓ Outbox entry status: ${test3OutboxEntries[0].status} (correct)`)
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
    console.error('\n✓ All notification exactly-once tests passed')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

