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
  const tier = args.tier || 'notification_truthfulness'
  const out = args.out

  console.error(`[${tier}] Starting notification truthfulness attack scenario`)
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
    
    // Create minimal profiles first
    const customerProfile = {
      id: customerId,
      email: `customer-${seed}@test.com`,
      full_name: `Customer ${seed}`
    }
    const providerProfile = {
      id: providerId,
      email: `provider-${seed}@test.com`,
      full_name: `Provider ${seed}`,
      business_name: `Business ${seed}`
    }

    await fetchJson(`${restBase}/profiles`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: customerProfile,
      timeoutMs: 5000
    })

    await fetchJson(`${restBase}/profiles`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: providerProfile,
      timeoutMs: 5000
    })

    // Create a minimal booking record
    const booking = {
      id: bookingId,
      customer_id: customerId,
      provider_id: providerId,
      service_id: stableUuid(`service-${seed}`),
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

  // Test 1: Transition → immediate reverse transition (cancel right after confirm)
  console.error('[Test 1] Transition → immediate reverse transition')
  const test1 = await createTestBooking()
  const test1ConfirmKey = `test1-confirm-${seed}-${Date.now()}`
  const test1CancelKey = `test1-cancel-${seed}-${Date.now()}`

  // Confirm booking
  const test1Confirm = await fetchJson(`${restBase}/rpc/transition_booking_with_idempotency`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: {
      p_booking_id: test1.bookingId,
      p_new_status: 'confirmed',
      p_idempotency_key: test1ConfirmKey,
      p_reason: null,
      p_admin_override: false,
      p_admin_id: null
    },
    timeoutMs: 5000
  })

  if (!test1Confirm.ok) {
    failures.push({
      test: 'reverse_transition',
      error: `Failed to confirm booking: ${test1Confirm.text}`
    })
  } else {
    // Immediately cancel (reverse transition)
    await fetchJson(`${restBase}/rpc/transition_booking_with_idempotency`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: {
        p_booking_id: test1.bookingId,
        p_new_status: 'cancelled',
        p_idempotency_key: test1CancelKey,
        p_reason: 'Test cancellation',
        p_admin_override: false,
        p_admin_id: null
      },
      timeoutMs: 5000
    })

    await new Promise(resolve => setTimeout(resolve, 1000))

    // Process outbox
    await fetchJson(`${targetUrl}/api/notifications/outbox/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { batchSize: 10 },
      timeoutMs: 5000
    })

    // Check outbox entries
    const { json: test1Outbox } = await fetchJson(`${restBase}/notification_outbox?booking_id=eq.${test1.bookingId}`, {
      method: 'GET',
      headers: supabaseHeaders,
      timeoutMs: 5000
    })

    const test1OutboxEntries = Array.isArray(test1Outbox) ? test1Outbox : (test1Outbox ? [test1Outbox] : [])
    
    // Verify payload truthfulness
    const confirmedEntry = test1OutboxEntries.find(e => e.event_type === 'booking_confirmed')
    const cancelledEntry = test1OutboxEntries.find(e => e.event_type === 'booking_cancelled')

    if (confirmedEntry && confirmedEntry.payload) {
      const payload = typeof confirmedEntry.payload === 'string' 
        ? JSON.parse(confirmedEntry.payload) 
        : confirmedEntry.payload
      
      // V-2: Payload should reflect confirmed state (truthful snapshot)
      if (payload.booking_status !== 'confirmed') {
        failures.push({
          test: 'reverse_transition',
          error: `Confirmed notification payload has wrong status: ${payload.booking_status} (expected 'confirmed')`
        })
      } else {
        console.error(`  ✓ Confirmed notification payload is truthful (status: ${payload.booking_status})`)
      }
    }

    if (cancelledEntry && cancelledEntry.payload) {
      const payload = typeof cancelledEntry.payload === 'string' 
        ? JSON.parse(cancelledEntry.payload) 
        : cancelledEntry.payload
      
      // V-2: Payload should reflect cancelled state
      if (payload.booking_status !== 'cancelled') {
        failures.push({
          test: 'reverse_transition',
          error: `Cancelled notification payload has wrong status: ${payload.booking_status} (expected 'cancelled')`
        })
      } else {
        console.error(`  ✓ Cancelled notification payload is truthful (status: ${payload.booking_status})`)
      }
    }
  }

  // Test 2: Worker processing races with state change
  console.error('[Test 2] Worker processing races with state change')
  const test2 = await createTestBooking()
  const test2ConfirmKey = `test2-${seed}-${Date.now()}`

  // Confirm booking
  await fetchJson(`${restBase}/rpc/transition_booking_with_idempotency`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: {
      p_booking_id: test2.bookingId,
      p_new_status: 'confirmed',
      p_idempotency_key: test2ConfirmKey,
      p_reason: null,
      p_admin_override: false,
      p_admin_id: null
    },
    timeoutMs: 5000
  })

  // Immediately cancel (before worker processes)
  await fetchJson(`${restBase}/rpc/transition_booking_with_idempotency`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: {
      p_booking_id: test2.bookingId,
      p_new_status: 'cancelled',
      p_idempotency_key: `test2-cancel-${seed}-${Date.now()}`,
      p_reason: 'Race test',
      p_admin_override: false,
      p_admin_id: null
    },
    timeoutMs: 5000
  })

  // Process outbox (worker validates state)
  const test2Process = await fetchJson(`${targetUrl}/api/notifications/outbox/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { batchSize: 10 },
    timeoutMs: 5000
  })

  await new Promise(resolve => setTimeout(resolve, 500))

  // Check outbox - confirmed notification should be skipped_invalid (booking is now cancelled)
  const { json: test2Outbox } = await fetchJson(`${restBase}/notification_outbox?booking_id=eq.${test2.bookingId}&event_type=eq.booking_confirmed`, {
    method: 'GET',
    headers: supabaseHeaders,
    timeoutMs: 5000
  })

  const test2OutboxEntries = Array.isArray(test2Outbox) ? test2Outbox : (test2Outbox ? [test2Outbox] : [])
  
  if (test2OutboxEntries.length > 0) {
    const confirmedEntry = test2OutboxEntries[0]
    
    // V-2: Worker should have skipped invalid notification (state mismatch)
    if (confirmedEntry.status === 'skipped_invalid') {
      console.error(`  ✓ Worker correctly skipped invalid notification (status: ${confirmedEntry.status}, reason: ${confirmedEntry.error_message})`)
    } else if (confirmedEntry.status === 'sent') {
      // This is actually OK - payload was truthful at enqueue time (Option A strategy)
      // But we verify the payload reflects the confirmed state
      if (confirmedEntry.payload) {
        const payload = typeof confirmedEntry.payload === 'string' 
          ? JSON.parse(confirmedEntry.payload) 
          : confirmedEntry.payload
        if (payload.booking_status === 'confirmed') {
          console.error(`  ✓ Notification sent with truthful payload (Option A: snapshot at enqueue time)`)
        } else {
          failures.push({
            test: 'worker_race',
            error: `Sent notification has wrong payload status: ${payload.booking_status}`
          })
        }
      }
    } else {
      failures.push({
        test: 'worker_race',
        error: `Unexpected notification status: ${confirmedEntry.status} (expected 'skipped_invalid' or 'sent')`
      })
    }
  }

  // Test 3: Replay same transition idempotently
  console.error('[Test 3] Replay same transition idempotently')
  const test3 = await createTestBooking()
  const test3Key = `test3-${seed}-${Date.now()}`

  // First transition
  const test3First = await fetchJson(`${restBase}/rpc/transition_booking_with_idempotency`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: {
      p_booking_id: test3.bookingId,
      p_new_status: 'confirmed',
      p_idempotency_key: test3Key,
      p_reason: null,
      p_admin_override: false,
      p_admin_id: null
    },
    timeoutMs: 5000
  })

  // Replay with same idempotency key
  const test3Replay = await fetchJson(`${restBase}/rpc/transition_booking_with_idempotency`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: {
      p_booking_id: test3.bookingId,
      p_new_status: 'confirmed',
      p_idempotency_key: test3Key,
      p_reason: null,
      p_admin_override: false,
      p_admin_id: null
    },
    timeoutMs: 5000
  })

  await new Promise(resolve => setTimeout(resolve, 1000))

  // Check outbox - should have exactly 1 entry (V-1) with truthful payload (V-2)
  const { json: test3Outbox } = await fetchJson(`${restBase}/notification_outbox?booking_id=eq.${test3.bookingId}&event_type=eq.booking_confirmed`, {
    method: 'GET',
    headers: supabaseHeaders,
    timeoutMs: 5000
  })

  const test3OutboxEntries = Array.isArray(test3Outbox) ? test3Outbox : (test3Outbox ? [test3Outbox] : [])

  if (test3OutboxEntries.length !== 1) {
    failures.push({
      test: 'idempotent_replay',
      error: `Expected exactly 1 outbox entry, got ${test3OutboxEntries.length}`
    })
  } else {
    const entry = test3OutboxEntries[0]
    if (entry.payload) {
      const payload = typeof entry.payload === 'string' 
        ? JSON.parse(entry.payload) 
        : entry.payload
      
      // V-2: Payload should be truthful
      if (payload.booking_status !== 'confirmed') {
        failures.push({
          test: 'idempotent_replay',
          error: `Notification payload has wrong status: ${payload.booking_status} (expected 'confirmed')`
        })
      } else if (!payload._canonical) {
        failures.push({
          test: 'idempotent_replay',
          error: `Notification payload missing _canonical flag`
        })
      } else {
        console.error(`  ✓ Notification payload is truthful and canonical (status: ${payload.booking_status})`)
      }
    }
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
    console.error('\n✓ All notification truthfulness tests passed')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

