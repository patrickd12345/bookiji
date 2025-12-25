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
  const tier = args.tier || 'idempotency_attack'
  const out = args.out

  console.error(`[${tier}] Starting idempotency attack scenario`)
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

  // Helper to create a test quote
  async function createTestQuote(userId, providerId) {
    const quote = {
      user_id: userId,
      intent_hash: crypto.randomBytes(16).toString('hex'),
      candidates: [{ id: providerId, name: 'Test Provider' }],
      price_cents: 1000,
      estimated_duration_minutes: 30,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    }

    const res = await fetchJson(`${restBase}/quotes`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: quote
    })

    if (!res.ok) {
      throw new Error(`Failed to create quote: ${res.text}`)
    }

    return Array.isArray(res.json) ? res.json[0] : res.json
  }

  // Helper to create a test user and provider
  async function createTestUser() {
    const userId = stableUuid(`user-${seed}-${Date.now()}`)
    // For testing, we'll use a simple UUID
    return userId
  }

  const failures = []
  const startTime = Date.now()
  const endTime = startTime + duration * 1000

  // Test 1: Concurrent identical requests (same idempotency key)
  console.error('[Test 1] Concurrent identical confirm requests')
  const test1UserId = await createTestUser()
  const test1ProviderId = stableUuid(`provider-${seed}`)
  const test1Quote = await createTestQuote(test1UserId, test1ProviderId)
  const test1IdempotencyKey = `test1-${seed}-${Date.now()}`
  const test1PaymentIntent = `pi_test_${crypto.randomBytes(16).toString('hex')}`

  const test1Payload = {
    quote_id: test1Quote.id,
    provider_id: test1ProviderId,
    stripe_payment_intent_id: test1PaymentIntent,
    idempotency_key: test1IdempotencyKey
  }

  // Fire N concurrent requests with same idempotency key
  const test1Promises = Array(concurrency).fill(null).map(() =>
    fetchJson(`${targetUrl}/api/bookings/confirm`, {
      method: 'POST',
      body: test1Payload,
      timeoutMs: 5000
    })
  )

  const test1Results = await Promise.all(test1Promises)
  const test1Successes = test1Results.filter(r => r.ok && r.status === 200)
  const test1Bookings = test1Successes
    .map(r => r.json?.data?.booking_id)
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i) // unique

  if (test1Bookings.length !== 1) {
    failures.push({
      test: 'concurrent_identical_requests',
      error: `Expected exactly 1 booking, got ${test1Bookings.length}`,
      results: test1Results.map(r => ({ status: r.status, ok: r.ok, idempotent_replay: r.json?.idempotent_replay }))
    })
  } else {
    console.error(`  ✓ Created exactly 1 booking: ${test1Bookings[0]}`)
    console.error(`  ✓ ${test1Successes.length}/${concurrency} requests succeeded (others were idempotent replays)`)
  }

  // Test 2: Different keys, same underlying action (should create multiple bookings)
  console.error('[Test 2] Different idempotency keys, same action')
  const test2UserId = await createTestUser()
  const test2ProviderId = stableUuid(`provider-${seed}-2`)
  const test2Quote = await createTestQuote(test2UserId, test2ProviderId)
  const test2PaymentIntent = `pi_test_${crypto.randomBytes(16).toString('hex')}`

  const test2Promises = Array(concurrency).fill(null).map((_, i) => {
    const key = `test2-${seed}-${i}-${Date.now()}`
    return fetchJson(`${targetUrl}/api/bookings/confirm`, {
      method: 'POST',
      body: {
        quote_id: test2Quote.id,
        provider_id: test2ProviderId,
        stripe_payment_intent_id: test2PaymentIntent,
        idempotency_key: key
      },
      timeoutMs: 5000
    })
  })

  const test2Results = await Promise.all(test2Promises)
  const test2Bookings = test2Results
    .filter(r => r.ok && r.status === 200)
    .map(r => r.json?.data?.booking_id)
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)

  // Note: This test may fail if quote expires or other constraints, but we check for idempotency violations
  const test2Errors = test2Results.filter(r => !r.ok && r.status !== 400 && r.status !== 403)
  if (test2Errors.length > 0) {
    failures.push({
      test: 'different_keys_same_action',
      error: `Unexpected errors: ${test2Errors.map(e => e.status).join(', ')}`,
      results: test2Errors
    })
  } else {
    console.error(`  ✓ Created ${test2Bookings.length} bookings with different keys`)
  }

  // Test 3: Timeout then retry (simulate network timeout)
  console.error('[Test 3] Timeout then retry simulation')
  const test3UserId = await createTestUser()
  const test3ProviderId = stableUuid(`provider-${seed}-3`)
  const test3Quote = await createTestQuote(test3UserId, test3ProviderId)
  const test3IdempotencyKey = `test3-${seed}-${Date.now()}`
  const test3PaymentIntent = `pi_test_${crypto.randomBytes(16).toString('hex')}`

  const test3Payload = {
    quote_id: test3Quote.id,
    provider_id: test3ProviderId,
    stripe_payment_intent_id: test3PaymentIntent,
    idempotency_key: test3IdempotencyKey
  }

  // First request (may timeout or succeed)
  const test3First = await fetchJson(`${targetUrl}/api/bookings/confirm`, {
    method: 'POST',
    body: test3Payload,
    timeoutMs: 1000 // Short timeout to simulate network issue
  })

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 500))

  // Retry with same idempotency key
  const test3Retry = await fetchJson(`${targetUrl}/api/bookings/confirm`, {
    method: 'POST',
    body: test3Payload,
    timeoutMs: 5000
  })

  if (test3Retry.ok && test3Retry.status === 200) {
    const bookingId = test3Retry.json?.data?.booking_id
    if (test3Retry.json?.idempotent_replay) {
      console.error(`  ✓ Retry correctly identified as idempotent replay`)
    } else if (test3First.ok && test3First.json?.data?.booking_id === bookingId) {
      console.error(`  ✓ Retry returned same booking (idempotent)`)
    } else {
      // Check if we got the same booking ID
      const firstBookingId = test3First.ok ? test3First.json?.data?.booking_id : null
      if (firstBookingId && bookingId && firstBookingId !== bookingId) {
        failures.push({
          test: 'timeout_retry',
          error: `Retry created different booking: ${firstBookingId} vs ${bookingId}`,
          first: test3First,
          retry: test3Retry
        })
      } else {
        console.error(`  ✓ Retry handled correctly`)
      }
    }
  } else {
    failures.push({
      test: 'timeout_retry',
      error: `Retry failed: ${test3Retry.status} ${test3Retry.text}`,
      retry: test3Retry
    })
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
    console.error('\n✓ All idempotency tests passed')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

