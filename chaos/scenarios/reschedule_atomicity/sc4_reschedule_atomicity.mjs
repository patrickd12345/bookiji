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
        '  E2E=true node chaos/scenarios/reschedule_atomicity/sc4_reschedule_atomicity.mjs',
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
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

  if (!supabaseUrlRaw) throw new Error('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) env is required')
  if (!rawKey) throw new Error('SUPABASE_SECRET_KEY env is required')

  const supabaseServiceKey = rawKey.replace(/^Bearer\s+/i, '').trim()
  const supabaseUrl = supabaseUrlRaw.replace(/\/+$/, '')
  const restBase = `${supabaseUrl}/rest/v1`
  const supabaseHeaders = {
    apikey: supabaseServiceKey,
    Authorization: `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json'
  }

  // ========================================
  // SETUP (fixtures / seed)
  // ========================================

  console.log(`[SC-4] Starting reschedule atomicity test (seed: ${seed}, iterations: ${iterations})`)

  // Create auth users first (required for profiles)
  const vendorEmail = `vendor-sc4-${seedStr}@test.bookiji.local`
  const customerEmail = `customer-sc4-${seedStr}@test.bookiji.local`

  // Helper to create or find auth user
  async function ensureAuthUser(email, fullName, role) {
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

    // User might already exist, try to find it
    const listRes = await fetchJson(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
      method: 'GET',
      headers: supabaseHeaders
    })

    if (listRes.ok && Array.isArray(listRes.json?.users)) {
      const existing = listRes.json.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
      if (existing) return existing.id
    }

    throw new Error(`Failed to create or find auth user for ${email}: ${createRes.text}`)
  }

  const vendorId = await ensureAuthUser(vendorEmail, `SC-4 Vendor ${seedStr}`, 'vendor')
  const customerId = await ensureAuthUser(customerEmail, `SC-4 Customer ${seedStr}`, 'customer')

  // Create Vendor profile
  const vendorRes = await fetchJson(`${restBase}/profiles`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: {
      id: vendorId,
      auth_user_id: vendorId,
      email: vendorEmail,
      full_name: `SC-4 Vendor ${seedStr}`,
      role: 'vendor'
    }
  })

  if (!vendorRes.ok && vendorRes.status !== 409) {
    throw new Error(`Failed to create vendor profile: ${vendorRes.text}`)
  }

  // Create Customer profile
  const customerRes = await fetchJson(`${restBase}/profiles`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: {
      id: customerId,
      auth_user_id: customerId,
      email: customerEmail,
      full_name: `SC-4 Customer ${seedStr}`,
      role: 'customer'
    }
  })

  if (!customerRes.ok && customerRes.status !== 409) {
    throw new Error(`Failed to create customer profile: ${customerRes.text}`)
  }

  // Create Service
  const serviceId = stableUuid(`service-${seedStr}`)
  const serviceRes = await fetchJson(`${restBase}/services`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: {
      id: serviceId,
      provider_id: vendorId,
      name: 'SC-4 Test Service',
      category: 'test',
      price: 10.00,
      duration_minutes: 60,
      is_active: true
    }
  })

  if (!serviceRes.ok && serviceRes.status !== 409) {
    throw new Error(`Failed to create service: ${serviceRes.text}`)
  }

  // Create Slot A (state=booked, is_available=false)
  const slotAId = stableUuid(`slot-a-${seedStr}`)
  const slotAStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
  const slotAEnd = new Date(new Date(slotAStart).getTime() + 60 * 60 * 1000).toISOString() // +1 hour

  const slotARes = await fetchJson(`${restBase}/availability_slots`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: {
      id: slotAId,
      provider_id: vendorId,
      start_time: slotAStart,
      end_time: slotAEnd,
      is_available: false, // Booked
      slot_type: 'regular'
    }
  })

  if (!slotARes.ok && slotARes.status !== 409) {
    throw new Error(`Failed to create slot A: ${slotARes.text}`)
  }

  // Create Slot B (state=free, is_available=true)
  const slotBId = stableUuid(`slot-b-${seedStr}`)
  const slotBStart = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // Day after tomorrow
  const slotBEnd = new Date(new Date(slotBStart).getTime() + 60 * 60 * 1000).toISOString() // +1 hour

  const slotBRes = await fetchJson(`${restBase}/availability_slots`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: {
      id: slotBId,
      provider_id: vendorId,
      start_time: slotBStart,
      end_time: slotBEnd,
      is_available: true, // Free
      slot_type: 'regular'
    }
  })

  if (!slotBRes.ok && slotBRes.status !== 409) {
    throw new Error(`Failed to create slot B: ${slotBRes.text}`)
  }

  // Create Booking BKG1: vendor_id = V, slot_id = A (via start_time/end_time match), status = confirmed
  const bookingId = stableUuid(`booking-${seedStr}`)
  const bookingRes = await fetchJson(`${restBase}/bookings`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: {
      id: bookingId,
      customer_id: customerId,
      provider_id: vendorId,
      service_id: serviceId,
      start_time: slotAStart,
      end_time: slotAEnd,
      status: 'confirmed',
      total_amount: 10.00
    }
  })

  if (!bookingRes.ok && bookingRes.status !== 409) {
    throw new Error(`Failed to create booking: ${bookingRes.text}`)
  }

  // Wait a bit for triggers to complete
  await new Promise(resolve => setTimeout(resolve, 100))

  // Assert initial truth
  const initialState = await queryGroundTruth(restBase, supabaseHeaders, bookingId, slotAId, slotBId)
  
  if (initialState.bookings.length !== 1) {
    throw new Error(`Initial assertion failed: expected exactly 1 booking, got ${initialState.bookings.length}`)
  }

  if (initialState.slotA.is_available !== false) {
    throw new Error(`Initial assertion failed: slot A should be booked (is_available=false), got ${initialState.slotA.is_available}`)
  }

  if (initialState.slotB.is_available !== true) {
    throw new Error(`Initial assertion failed: slot B should be free (is_available=true), got ${initialState.slotB.is_available}`)
  }

  console.log(`[SC-4] Fixtures created: vendor=${vendorId}, slotA=${slotAId}, slotB=${slotBId}, booking=${bookingId}`)

  // ========================================
  // DEFINE RESCHEDULE INTENT
  // ========================================

  const intentId = stableUuid(`intent-${seedStr}`)
  const payload = {
    intent_id: intentId,
    booking_id: bookingId,
    from_slot: slotAId,
    to_slot: slotBId,
    new_slot_id: slotBId,
    slot_start: slotBStart,
    slot_end: slotBEnd
  }

  // ========================================
  // CORE TEST LOOP
  // ========================================

  let lastAction = null
  let restartCount = 0

  for (let step = 1; step <= iterations; step++) {
    // Choose one action randomly
    const actionRoll = rng()
    let action = null

    if (actionRoll < 0.4) {
      action = 'send_reschedule'
    } else if (actionRoll < 0.7) {
      action = 'retry_reschedule'
    } else if (actionRoll < 0.9) {
      action = 'restart_simcity'
    } else {
      action = 'no_op'
    }

    lastAction = action

    // Execute action
    if (action === 'send_reschedule' || action === 'retry_reschedule') {
      await sendReschedule(targetUrl, payload)
    } else if (action === 'restart_simcity') {
      restartCount++
      // Simulate restart: small delay to simulate process crash/restart
      await new Promise(resolve => setTimeout(resolve, 10 + Math.floor(rng() * 50)))
    }
    // no_op does nothing

    // Run assertions after EVERY action
    const state = await queryGroundTruth(restBase, supabaseHeaders, bookingId, slotAId, slotBId)
    const assertionResult = runAssertions(state, bookingId, slotAId, slotBId, step, action)

    if (!assertionResult.pass) {
      console.error(`[SC-4] FAIL at step ${step} (action: ${action})`)
      console.error(`[SC-4] ${assertionResult.message}`)
      printForensicSnapshot(state, bookingId, slotAId, slotBId, lastAction, step)
      process.exit(1)
    }

    // Assertion 5 — Idempotency (check periodically and after retry actions)
    if (action === 'retry_reschedule' || step % 10 === 0) {
      // Wait a bit for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const stateBeforeIdempotency = await queryGroundTruth(restBase, supabaseHeaders, bookingId, slotAId, slotBId)
      
      // Send retry_reschedule again
      await sendReschedule(targetUrl, payload)
      
      // Wait for potential state changes
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const stateAfterIdempotency = await queryGroundTruth(restBase, supabaseHeaders, bookingId, slotAId, slotBId)
      
      // State MUST be identical
      const idempotencyCheck = checkIdempotency(stateBeforeIdempotency, stateAfterIdempotency, step)
      if (!idempotencyCheck.pass) {
        console.error(`[SC-4] FAIL at step ${step} (idempotency check after action: ${action})`)
        console.error(`[SC-4] ${idempotencyCheck.message}`)
        printForensicSnapshot(stateAfterIdempotency, bookingId, slotAId, slotBId, lastAction, step)
        process.exit(1)
      }
    }

    // Small delay between actions to allow async processing
    await new Promise(resolve => setTimeout(resolve, 10))
  }

  // ========================================
  // TERMINATION CONDITION
  // ========================================

  const finalState = await queryGroundTruth(restBase, supabaseHeaders, bookingId, slotAId, slotBId)
  console.log(`[SC-4] PASS: Completed ${iterations} iterations`)
  console.log(`[SC-4] Final state:`)
  console.log(`  - Bookings: ${finalState.bookings.length}`)
  console.log(`  - Slot A (${slotAId}): is_available=${finalState.slotA.is_available}`)
  console.log(`  - Slot B (${slotBId}): is_available=${finalState.slotB.is_available}`)
  console.log(`  - Booking slot_id reference: ${finalState.bookingSlotId || 'N/A'}`)
  console.log(`  - Restarts simulated: ${restartCount}`)
  process.exit(0)
}

// ========================================
// HELPER FUNCTIONS
// ========================================

async function queryGroundTruth(restBase, supabaseHeaders, bookingId, slotAId, slotBId) {
  // Query booking
  const bookingRes = await fetchJson(`${restBase}/bookings?id=eq.${bookingId}`, {
    method: 'GET',
    headers: supabaseHeaders
  })

  if (!bookingRes.ok) {
    throw new Error(`Failed to query booking: ${bookingRes.text}`)
  }

  const bookings = Array.isArray(bookingRes.json) ? bookingRes.json : []

  // Query slot A
  const slotARes = await fetchJson(`${restBase}/availability_slots?id=eq.${slotAId}`, {
    method: 'GET',
    headers: supabaseHeaders
  })

  if (!slotARes.ok) {
    throw new Error(`Failed to query slot A: ${slotARes.text}`)
  }

  const slotsA = Array.isArray(slotARes.json) ? slotARes.json : []
  const slotA = slotsA[0] || null

  // Query slot B
  const slotBRes = await fetchJson(`${restBase}/availability_slots?id=eq.${slotBId}`, {
    method: 'GET',
    headers: supabaseHeaders
  })

  if (!slotBRes.ok) {
    throw new Error(`Failed to query slot B: ${slotBRes.text}`)
  }

  const slotsB = Array.isArray(slotBRes.json) ? slotBRes.json : []
  const slotB = slotsB[0] || null

  // Determine which slot the booking references (by matching start_time/end_time)
  let bookingSlotId = null
  if (bookings.length > 0) {
    const booking = bookings[0]
    if (slotA && booking.start_time === slotA.start_time && booking.end_time === slotA.end_time) {
      bookingSlotId = slotAId
    } else if (slotB && booking.start_time === slotB.start_time && booking.end_time === slotB.end_time) {
      bookingSlotId = slotBId
    }
  }

  return {
    bookings,
    slotA: slotA || { id: slotAId, is_available: null },
    slotB: slotB || { id: slotBId, is_available: null },
    bookingSlotId
  }
}

async function sendReschedule(targetUrl, payload) {
  // Fire HTTP/API call: POST /api/(dev)/test/bookings/[id]/reschedule
  // Do NOT wait for response. Do NOT assume ordering.
  // SimCity treats delivery as at-least-once.
  const url = `${targetUrl}/api/test/bookings/${payload.booking_id}/reschedule`
  
  // Fire and forget - don't await
  fetchJson(url, {
    method: 'POST',
    body: {
      new_slot_id: payload.new_slot_id,
      slot_start: payload.slot_start,
      slot_end: payload.slot_end
    }
  }).catch(() => {
    // Ignore errors - fire and forget
  })
}

function runAssertions(state, bookingId, slotAId, slotBId, step, action) {
  // Assertion 1 — Booking existence
  if (state.bookings.length !== 1) {
    return {
      pass: false,
      message: `Assertion 1 FAILED: Expected exactly 1 booking, got ${state.bookings.length}`
    }
  }

  const booking = state.bookings[0]

  // Assertion 2 — Slot exclusivity
  // Exactly ONE of these is true: slotA.state == booked OR slotB.state == booked
  const slotABooked = state.slotA.is_available === false
  const slotBBooked = state.slotB.is_available === false

  if (slotABooked && slotBBooked) {
    return {
      pass: false,
      message: `Assertion 2 FAILED: Both slots are booked (exclusivity violation)`
    }
  }

  if (!slotABooked && !slotBBooked) {
    return {
      pass: false,
      message: `Assertion 2 FAILED: Neither slot is booked (booking orphaned)`
    }
  }

  // Assertion 3 — Booking coherence
  // Let booking.slot_id = S (derived from start_time/end_time match)
  // S == A OR S == B
  // If S == A → slotA.state == booked
  // If S == B → slotB.state == booked
  if (state.bookingSlotId === slotAId) {
    if (!slotABooked) {
      return {
        pass: false,
        message: `Assertion 3 FAILED: Booking references slot A but slot A is not booked`
      }
    }
  } else if (state.bookingSlotId === slotBId) {
    if (!slotBBooked) {
      return {
        pass: false,
        message: `Assertion 3 FAILED: Booking references slot B but slot B is not booked`
      }
    }
  } else {
    return {
      pass: false,
      message: `Assertion 3 FAILED: Booking does not reference slot A or B (orphaned booking)`
    }
  }

  // Assertion 4 — Availability coherence
  // slotA.state == free ⇔ no booking references A
  // slotB.state == free ⇔ no booking references B
  if (state.slotA.is_available === true && state.bookingSlotId === slotAId) {
    return {
      pass: false,
      message: `Assertion 4 FAILED: Slot A is free but booking references it`
    }
  }

  if (state.slotA.is_available === false && state.bookingSlotId !== slotAId) {
    // This is OK if slotB is booked, but if neither is referenced, it's a problem
    if (state.bookingSlotId !== slotBId) {
      return {
        pass: false,
        message: `Assertion 4 FAILED: Slot A is booked but no booking references it`
      }
    }
  }

  if (state.slotB.is_available === true && state.bookingSlotId === slotBId) {
    return {
      pass: false,
      message: `Assertion 4 FAILED: Slot B is free but booking references it`
    }
  }

  if (state.slotB.is_available === false && state.bookingSlotId !== slotBId) {
    // This is OK if slotA is booked, but if neither is referenced, it's a problem
    if (state.bookingSlotId !== slotAId) {
      return {
        pass: false,
        message: `Assertion 4 FAILED: Slot B is booked but no booking references it`
      }
    }
  }

  // Assertion 5 — Idempotency (only check on retry actions)
  // For now, we'll check this separately after the main loop
  // The idempotency check would require sending another retry and verifying state doesn't change

  return { pass: true, message: 'All assertions passed' }
}

function checkIdempotency(stateBefore, stateAfter, step) {
  // Assertion 5 — Idempotency
  // State MUST be identical after retry
  
  // Check booking count
  if (stateBefore.bookings.length !== stateAfter.bookings.length) {
    return {
      pass: false,
      message: `Idempotency FAILED: Booking count changed from ${stateBefore.bookings.length} to ${stateAfter.bookings.length}`
    }
  }

  // Check slot A state
  if (stateBefore.slotA.is_available !== stateAfter.slotA.is_available) {
    return {
      pass: false,
      message: `Idempotency FAILED: Slot A availability changed from ${stateBefore.slotA.is_available} to ${stateAfter.slotA.is_available}`
    }
  }

  // Check slot B state
  if (stateBefore.slotB.is_available !== stateAfter.slotB.is_available) {
    return {
      pass: false,
      message: `Idempotency FAILED: Slot B availability changed from ${stateBefore.slotB.is_available} to ${stateAfter.slotB.is_available}`
    }
  }

  // Check booking slot reference
  if (stateBefore.bookingSlotId !== stateAfter.bookingSlotId) {
    return {
      pass: false,
      message: `Idempotency FAILED: Booking slot reference changed from ${stateBefore.bookingSlotId} to ${stateAfter.bookingSlotId}`
    }
  }

  // Check booking times (if booking exists)
  if (stateBefore.bookings.length > 0 && stateAfter.bookings.length > 0) {
    const beforeBooking = stateBefore.bookings[0]
    const afterBooking = stateAfter.bookings[0]
    
    if (beforeBooking.start_time !== afterBooking.start_time || beforeBooking.end_time !== afterBooking.end_time) {
      return {
        pass: false,
        message: `Idempotency FAILED: Booking times changed`
      }
    }
  }

  return { pass: true, message: 'Idempotency check passed' }
}

function printForensicSnapshot(state, bookingId, slotAId, slotBId, lastAction, step) {
  console.error(`[SC-4] FORENSIC SNAPSHOT (step ${step}, last action: ${lastAction}):`)
  console.error(`  Booking (${bookingId}):`)
  console.error(JSON.stringify(state.bookings[0] || null, null, 2))
  console.error(`  Slot A (${slotAId}):`)
  console.error(JSON.stringify(state.slotA, null, 2))
  console.error(`  Slot B (${slotBId}):`)
  console.error(JSON.stringify(state.slotB, null, 2))
  console.error(`  Derived slot reference: ${state.bookingSlotId || 'NONE'}`)
}

main().catch(err => {
  console.error(`[SC-4] FATAL ERROR:`, err)
  process.exit(1)
})

