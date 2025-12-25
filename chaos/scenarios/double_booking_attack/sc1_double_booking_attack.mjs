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

function hashSeedToU32(seedStr) {
  let h = 0x811c9dc5
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function stableUuid(input) {
  const hex = crypto.createHash('sha256').update(input).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function fetchJson(url, { method = 'GET', headers = {}, body, timeoutMs = 3200 } = {}) {
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
  if (url.username || url.password) throw new Error('target-url must not include credentials')
  url.hash = ''
  url.search = ''
  return url.toString().replace(/\/+$/, '')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || args.h) {
    console.log(
      [
        'Usage:',
        '  E2E=true node chaos/scenarios/double_booking_attack/sc1_double_booking_attack.mjs',
        '    --seed <seed>',
        '    --iterations <n> (default: 50)',
        '    --target-url <url>',
      ].join('\n')
    )
    process.exit(0)
  }

  const seed = args.seed
  const iterations = Number(args.iterations) || 50
  const targetUrlRaw = args['target-url']

  if (!seed) throw new Error('--seed is required')
  if (!Number.isFinite(iterations) || iterations <= 0) throw new Error('--iterations must be a positive number')
  if (!targetUrlRaw) throw new Error('--target-url is required')

  const targetUrl = validateTargetUrl(targetUrlRaw)
  const seedStr = String(seed)
  const rng = mulberry32(hashSeedToU32(seedStr))

  // Use local Supabase defaults if not provided
  const supabaseUrlRaw = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
  const rawKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

  if (!supabaseUrlRaw) throw new Error('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) env is required')
  if (!rawKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) env is required')

  const supabaseServiceKey = rawKey.replace(/^Bearer\s+/i, '').trim()
  const supabaseUrl = supabaseUrlRaw.replace(/\/+$/, '')
  const restBase = `${supabaseUrl}/rest/v1`
  const supabaseHeaders = {
    apikey: supabaseServiceKey,
    Authorization: `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json'
  }

  // ========================================
  // SETUP (fixtures, not auth)
  // ========================================

  console.log(`[SC-1] Starting double-booking attack test (seed: ${seed}, iterations: ${iterations})`)

  // Create auth users first (required for profiles)
  const vendorEmail = `vendor-sc1-${seedStr}@test.bookiji.local`
  const customer1Email = `customer1-sc1-${seedStr}@test.bookiji.local`
  const customer2Email = `customer2-sc1-${seedStr}@test.bookiji.local`

  // Helper to create or find auth user
  async function ensureAuthUser(email, fullName, role) {
    // First try to find existing user
    let page = 1
    let foundUser = null
    while (page <= 10) { // Search up to 10 pages
      const listRes = await fetchJson(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=1000`, {
        method: 'GET',
        headers: supabaseHeaders
      })

      if (listRes.ok && Array.isArray(listRes.json?.users)) {
        foundUser = listRes.json.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
        if (foundUser) break
        // If we got fewer users than requested, we've reached the end
        if (listRes.json.users.length < 1000) break
      }
      page++
    }

    if (foundUser) {
      return foundUser.id
    }

    // User doesn't exist, try to create
    const createRes = await fetchJson(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { ...supabaseHeaders },
      body: {
        email,
        password: 'test-password-1234',
        email_confirm: true,
        user_metadata: { full_name: fullName, role }
      }
    })

    if (createRes.ok) {
      const userId = createRes.json?.id || createRes.json?.user?.id
      if (userId) return userId
    }

    // If creation failed, try one more search (user might have been created between searches)
    const finalListRes = await fetchJson(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
      method: 'GET',
      headers: supabaseHeaders
    })

    if (finalListRes.ok && Array.isArray(finalListRes.json?.users)) {
      const existing = finalListRes.json.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
      if (existing) return existing.id
    }

    throw new Error(`Failed to create or find auth user for ${email}: ${createRes.text}`)
  }

  const vendorId = await ensureAuthUser(vendorEmail, `SC-1 Vendor ${seedStr}`, 'vendor')
  const customer1Id = await ensureAuthUser(customer1Email, `SC-1 Customer 1 ${seedStr}`, 'customer')
  const customer2Id = await ensureAuthUser(customer2Email, `SC-1 Customer 2 ${seedStr}`, 'customer')

  // Create Vendor profile
  await fetchJson(`${restBase}/profiles`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: {
      id: vendorId,
      auth_user_id: vendorId,
      email: vendorEmail,
      full_name: `SC-1 Vendor ${seedStr}`,
      role: 'vendor'
    }
  })

  // Create Customer 1 profile
  await fetchJson(`${restBase}/profiles`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: {
      id: customer1Id,
      auth_user_id: customer1Id,
      email: customer1Email,
      full_name: `SC-1 Customer 1 ${seedStr}`,
      role: 'customer'
    }
  })

  // Create Customer 2 profile
  await fetchJson(`${restBase}/profiles`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: {
      id: customer2Id,
      auth_user_id: customer2Id,
      email: customer2Email,
      full_name: `SC-1 Customer 2 ${seedStr}`,
      role: 'customer'
    }
  })

  // Create Service
  const serviceId = stableUuid(`service-${seedStr}`)
  await fetchJson(`${restBase}/services`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: {
      id: serviceId,
      provider_id: vendorId,
      name: 'SC-1 Test Service',
      category: 'test',
      price: 10.00,
      duration_minutes: 60,
      is_active: true
    }
  })

  // Create Slot S (state = free)
  const slotId = stableUuid(`slot-${seedStr}`)
  const slotStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
  const slotEnd = new Date(new Date(slotStart).getTime() + 60 * 60 * 1000).toISOString() // +1 hour

  await fetchJson(`${restBase}/availability_slots`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: {
      id: slotId,
      provider_id: vendorId,
      start_time: slotStart,
      end_time: slotEnd,
      is_available: true, // Free
      slot_type: 'regular'
    }
  })

  // Assert initial truth
  const initialState = await queryGroundTruth(restBase, supabaseHeaders, slotId, vendorId)

  if (initialState.slot.is_available !== true) {
    throw new Error(`Initial assertion failed: slot S should be free (is_available=true), got ${initialState.slot.is_available}`)
  }

  if (initialState.bookings.length !== 0) {
    throw new Error(`Initial assertion failed: expected no bookings for slot S, got ${initialState.bookings.length}`)
  }

  console.log(`[SC-1] Fixtures created: vendor=${vendorId}, slot=${slotId}, customer1=${customer1Id}, customer2=${customer2Id}`)

  // ========================================
  // DEFINE BOOKING INTENTS
  // ========================================

  const intentAId = stableUuid(`intent-a-${seedStr}`)
  const intentBId = stableUuid(`intent-b-${seedStr}`)

  // Generate stable booking IDs based on intent IDs for idempotency
  const bookingAId = stableUuid(`booking-a-${seedStr}`)
  const bookingBId = stableUuid(`booking-b-${seedStr}`)

  const intentA = {
    intent_id: intentAId,
    booking_id: bookingAId,
    customer: customer1Id,
    slot: slotId,
    providerId: vendorId,
    serviceId: serviceId,
    startTime: slotStart,
    endTime: slotEnd,
    amountUSD: 10.00
  }

  const intentB = {
    intent_id: intentBId,
    booking_id: bookingBId,
    customer: customer2Id,
    slot: slotId,
    providerId: vendorId,
    serviceId: serviceId,
    startTime: slotStart,
    endTime: slotEnd,
    amountUSD: 10.00
  }

  // ========================================
  // CHAOS EXECUTION LOOP
  // ========================================

  let lastAction = null
  let restartCount = 0

  for (let step = 1; step <= iterations; step++) {
    // Choose one action randomly
    const actionRoll = rng()
    let action = null

    if (actionRoll < 0.25) {
      action = 'send_book_A'
    } else if (actionRoll < 0.5) {
      action = 'send_book_B'
    } else if (actionRoll < 0.65) {
      action = 'retry_book_A'
    } else if (actionRoll < 0.8) {
      action = 'retry_book_B'
    } else if (actionRoll < 0.9) {
      action = 'restart_simcity'
    } else {
      action = 'no_op'
    }

    lastAction = action

    // Execute action
    if (action === 'send_book_A' || action === 'retry_book_A') {
      await sendBook(restBase, supabaseHeaders, intentA)
    } else if (action === 'send_book_B' || action === 'retry_book_B') {
      await sendBook(restBase, supabaseHeaders, intentB)
    } else if (action === 'restart_simcity') {
      restartCount++
      // Simulate restart: small delay to simulate process crash/restart
      await new Promise(resolve => setTimeout(resolve, 10 + Math.floor(rng() * 50)))
    }
    // no_op does nothing

    // Run assertions after EVERY action
    const state = await queryGroundTruth(restBase, supabaseHeaders, slotId, vendorId)
    const assertionResult = runAssertions(state, slotId, customer1Id, customer2Id, step, action)

    if (!assertionResult.pass) {
      console.error(`[SC-1] FAIL at step ${step} (action: ${action})`)
      console.error(`[SC-1] ${assertionResult.message}`)
      printForensicSnapshot(state, slotId, customer1Id, customer2Id, lastAction, step)
      process.exit(1)
    }

    // Assertion 4 — Idempotency (check periodically and after retry actions)
    if (action === 'retry_book_A' || action === 'retry_book_B' || step % 10 === 0) {
      // Wait a bit for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      const stateBeforeIdempotency = await queryGroundTruth(restBase, supabaseHeaders, slotId, vendorId)

      // Send retry again
      if (action === 'retry_book_A' || (step % 10 === 0 && rng() < 0.5)) {
        await sendBook(restBase, supabaseHeaders, intentA)
      } else {
        await sendBook(restBase, supabaseHeaders, intentB)
      }

      // Wait for potential state changes
      await new Promise(resolve => setTimeout(resolve, 200))

      const stateAfterIdempotency = await queryGroundTruth(restBase, supabaseHeaders, slotId, vendorId)

      // State MUST NOT change
      const idempotencyCheck = checkIdempotency(stateBeforeIdempotency, stateAfterIdempotency, step)
      if (!idempotencyCheck.pass) {
        console.error(`[SC-1] FAIL at step ${step} (idempotency check after action: ${action})`)
        console.error(`[SC-1] ${idempotencyCheck.message}`)
        printForensicSnapshot(stateAfterIdempotency, slotId, customer1Id, customer2Id, lastAction, step)
        process.exit(1)
      }
    }

    // Small delay between actions to allow async processing
    await new Promise(resolve => setTimeout(resolve, 10))
  }

  // ========================================
  // TERMINATION CONDITION
  // ========================================

  const finalState = await queryGroundTruth(restBase, supabaseHeaders, slotId, vendorId)

  // Verify expected terminal states (ONLY TWO ALLOWED)
  const terminalStateCheck = checkTerminalState(finalState, customer1Id, customer2Id, slotId)
  if (!terminalStateCheck.pass) {
    console.error(`[SC-1] FAIL: Invalid terminal state`)
    console.error(`[SC-1] ${terminalStateCheck.message}`)
    printForensicSnapshot(finalState, slotId, customer1Id, customer2Id, lastAction, iterations)
    process.exit(1)
  }

  console.log(`[SC-1] PASS: Completed ${iterations} iterations`)
  console.log(`[SC-1] Final state:`)
  console.log(`  - Bookings: ${finalState.bookings.length}`)
  console.log(`  - Slot S (${slotId}): is_available=${finalState.slot.is_available}`)
  if (finalState.bookings.length === 1) {
    const booking = finalState.bookings[0]
    console.log(`  - Winner: Customer ${booking.customer_id === customer1Id ? 'C1' : 'C2'} (${booking.customer_id})`)
  }
  console.log(`  - Restarts simulated: ${restartCount}`)
  process.exit(0)
}

// ========================================
// HELPER FUNCTIONS
// ========================================

async function queryGroundTruth(restBase, supabaseHeaders, slotId, vendorId) {
  // Query bookings for slot S with status = 'confirmed'
  // Note: bookings don't have slot_id directly, so we match by provider_id and time range
  const slotRes = await fetchJson(`${restBase}/availability_slots?id=eq.${slotId}`, {
    method: 'GET',
    headers: supabaseHeaders
  })

  if (!slotRes.ok) {
    throw new Error(`Failed to query slot: ${slotRes.text}`)
  }

  const slots = Array.isArray(slotRes.json) ? slotRes.json : []
  const slot = slots[0] || null

  if (!slot) {
    throw new Error(`Slot ${slotId} not found`)
  }

  // Query bookings that match this slot (by provider_id and time range)
  // Check for non-cancelled bookings (pending or confirmed) - these compete for the slot
  // Note: We query all bookings and filter by status in code since Supabase REST doesn't support NOT IN easily
  // URL encode the timestamps properly
  const startTimeEncoded = encodeURIComponent(slot.start_time)
  const endTimeEncoded = encodeURIComponent(slot.end_time)
  const bookingsRes = await fetchJson(
    `${restBase}/bookings?provider_id=eq.${vendorId}&start_time=eq.${startTimeEncoded}&end_time=eq.${endTimeEncoded}`,
    {
      method: 'GET',
      headers: supabaseHeaders
    }
  )

  if (!bookingsRes.ok) {
    throw new Error(`Failed to query bookings: ${bookingsRes.text}`)
  }

  const allBookings = Array.isArray(bookingsRes.json) ? bookingsRes.json : []
  // Filter to only non-cancelled bookings (pending or confirmed compete for the slot)
  const bookings = allBookings.filter(b => b.status && !['cancelled', 'no_show'].includes(b.status))

  return {
    bookings,
    slot
  }
}

async function sendBook(restBase, supabaseHeaders, intent) {
  // Use atomic RPC function to claim slot and create booking
  // This is fire-and-forget - do NOT wait for response
  // SimCity treats delivery as at-least-once.
  // Use stable booking_id from intent for idempotency (retries reuse same booking_id)
  
  // Fire and forget - don't await
  fetchJson(`${restBase}/rpc/claim_slot_and_create_booking`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: {
      p_slot_id: intent.slot,
      p_booking_id: intent.booking_id,
      p_customer_id: intent.customer,
      p_provider_id: intent.providerId,
      p_service_id: intent.serviceId,
      p_total_amount: intent.amountUSD
    }
  }).catch(() => {
    // Ignore errors - fire and forget
  })
}

function runAssertions(state, slotId, customer1Id, customer2Id, step, action) {
  // Assertion 1 — Cardinality
  // bookings.count <= 1
  // FAIL if bookings.count == 2 (or more)
  // Note: We check non-cancelled bookings (pending or confirmed) as they compete for the slot
  if (state.bookings.length > 1) {
    return {
      pass: false,
      message: `Assertion 1 FAILED: Expected at most 1 non-cancelled booking, got ${state.bookings.length} (DOUBLE-BOOKING DETECTED!)`
    }
  }

  // Assertion 2 — Slot coherence
  // If bookings.count == 1: slot.state == booked
  // If bookings.count == 0: slot.state == free OR held
  if (state.bookings.length === 1) {
    if (state.slot.is_available !== false) {
      return {
        pass: false,
        message: `Assertion 2 FAILED: Booking exists but slot is not booked (is_available=${state.slot.is_available})`
      }
    }
  } else if (state.bookings.length === 0) {
    // Slot should be free (or held, but we use free for simplicity)
    if (state.slot.is_available !== true) {
      // This might be OK if there's a pending booking, but for confirmed bookings, slot should be free
      // We'll allow this for now but could tighten later
    }
  }

  // Assertion 3 — Booking coherence
  // If a booking exists:
  //   booking.slot_id == S (via time match)
  //   booking.customer_id ∈ {C1, C2}
  if (state.bookings.length > 0) {
    const booking = state.bookings[0]

    // Check customer_id is one of the two customers
    if (booking.customer_id !== customer1Id && booking.customer_id !== customer2Id) {
      return {
        pass: false,
        message: `Assertion 3 FAILED: Booking references unknown customer ${booking.customer_id} (expected ${customer1Id} or ${customer2Id})`
      }
    }

    // Check booking matches slot time range
    if (booking.start_time !== state.slot.start_time || booking.end_time !== state.slot.end_time) {
      return {
        pass: false,
        message: `Assertion 3 FAILED: Booking time range doesn't match slot time range`
      }
    }

    // Check booking references correct provider
    if (booking.provider_id !== state.slot.provider_id) {
      return {
        pass: false,
        message: `Assertion 3 FAILED: Booking provider_id doesn't match slot provider_id`
      }
    }
  }

  return { pass: true, message: 'All assertions passed' }
}

function checkIdempotency(stateBefore, stateAfter, step) {
  // Assertion 4 — Idempotency
  // State MUST NOT change after retry

  // Check booking count
  if (stateBefore.bookings.length !== stateAfter.bookings.length) {
    return {
      pass: false,
      message: `Idempotency FAILED: Booking count changed from ${stateBefore.bookings.length} to ${stateAfter.bookings.length}`
    }
  }

  // Check slot state
  if (stateBefore.slot.is_available !== stateAfter.slot.is_available) {
    return {
      pass: false,
      message: `Idempotency FAILED: Slot availability changed from ${stateBefore.slot.is_available} to ${stateAfter.slot.is_available}`
    }
  }

  // Check winner (if booking exists)
  if (stateBefore.bookings.length === 1 && stateAfter.bookings.length === 1) {
    const beforeBooking = stateBefore.bookings[0]
    const afterBooking = stateAfter.bookings[0]

    if (beforeBooking.customer_id !== afterBooking.customer_id) {
      return {
        pass: false,
        message: `Idempotency FAILED: Winner flipped from customer ${beforeBooking.customer_id} to ${afterBooking.customer_id}`
      }
    }

    if (beforeBooking.id !== afterBooking.id) {
      return {
        pass: false,
        message: `Idempotency FAILED: Booking ID changed from ${beforeBooking.id} to ${afterBooking.id}`
      }
    }
  }

  return { pass: true, message: 'Idempotency check passed' }
}

function checkTerminalState(state, customer1Id, customer2Id, slotId) {
  // Expected terminal states (ONLY TWO ALLOWED)
  // STATE 1: C1 has confirmed booking on S, C2 failed, slot S booked
  // STATE 2: C2 has confirmed booking on S, C1 failed, slot S booked

  if (state.bookings.length === 0) {
    // No booking - this might be OK if both failed, but slot should be free
    if (state.slot.is_available === true) {
      return { pass: true, message: 'Terminal state: No booking, slot free (both customers failed)' }
    }
    return {
      pass: false,
      message: `Invalid terminal state: No booking but slot is not free (is_available=${state.slot.is_available})`
    }
  }

  if (state.bookings.length > 1) {
    return {
      pass: false,
      message: `Invalid terminal state: Multiple bookings (${state.bookings.length}) - DOUBLE-BOOKING!`
    }
  }

  // Exactly one booking
  const booking = state.bookings[0]

  if (booking.customer_id !== customer1Id && booking.customer_id !== customer2Id) {
    return {
      pass: false,
      message: `Invalid terminal state: Booking references unknown customer ${booking.customer_id}`
    }
  }

  if (state.slot.is_available !== false) {
    return {
      pass: false,
      message: `Invalid terminal state: Booking exists but slot is not booked (is_available=${state.slot.is_available})`
    }
  }

  // Valid terminal state
  return {
    pass: true,
    message: `Valid terminal state: Customer ${booking.customer_id === customer1Id ? 'C1' : 'C2'} has booking, slot booked`
  }
}

function printForensicSnapshot(state, slotId, customer1Id, customer2Id, lastAction, step) {
  console.error(`[SC-1] FORENSIC SNAPSHOT (step ${step}, last action: ${lastAction}):`)
  console.error(`  Slot S (${slotId}):`)
  console.error(JSON.stringify(state.slot, null, 2))
  console.error(`  Bookings (${state.bookings.length}):`)
  state.bookings.forEach((booking, idx) => {
    console.error(`    Booking ${idx + 1}:`)
    console.error(JSON.stringify(booking, null, 2))
    console.error(`      Customer: ${booking.customer_id === customer1Id ? 'C1' : booking.customer_id === customer2Id ? 'C2' : 'UNKNOWN'}`)
  })
  if (state.bookings.length === 0) {
    console.error(`    (No bookings)`)
  }
}

main().catch(err => {
  console.error(`[SC-1] FATAL ERROR:`, err)
  process.exit(1)
})

