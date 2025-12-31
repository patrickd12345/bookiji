import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import dns from 'node:dns'
import { Timebase } from '../kernel/timebase.mjs'

// Force IPv4 for stability on Windows Docker Desktop
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first')
}

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

function isAllowedTargetHost(hostname) {
  const host = String(hostname || '').toLowerCase()
  if (!host) return false
  if (host === 'localhost') return true
  if (host === '127.0.0.1') return true
  if (host === '::1') return true
  if (host === 'host.docker.internal') return true
  if (host === 'bookiji.local') return true
  if (host.startsWith('172.')) return true // Docker bridge network
  if (host.startsWith('192.')) return true // LAN
  return false
}

function validateTargetUrl(raw) {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('target-url must be a valid URL')
  }
  const host = url.hostname.toLowerCase()
  if (host.endsWith('bookiji.com')) throw new Error('Refusing non-local target-url')
  if (!/^https?:$/.test(url.protocol)) throw new Error('target-url must be http(s)')
  if (url.username || url.password) throw new Error('target-url must not include credentials')
  if (!isAllowedTargetHost(url.hostname)) throw new Error('Refusing non-local target-url')
  url.hash = ''
  url.search = ''
  return url.toString().replace(/\/+$/, '')
}

function validateSupabaseUrl(raw) {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL')
  }
  const host = url.hostname.toLowerCase()
  if (host.endsWith('supabase.co')) throw new Error('Refusing non-local SUPABASE_URL')
  if (host.endsWith('bookiji.com')) throw new Error('Refusing non-local SUPABASE_URL')
  if (!/^https?:$/.test(url.protocol)) throw new Error('SUPABASE_URL must be http(s)')
  if (url.username || url.password) throw new Error('SUPABASE_URL must not include credentials')
  if (!isAllowedTargetHost(url.hostname)) {
    if (host.startsWith('supabase_')) return `${url.protocol}//${url.host}`
    throw new Error('Refusing non-local SUPABASE_URL')
  }
  // Return only origin (protocol + host + port), strip any pathname
  return `${url.protocol}//${url.host}`
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

function pick(rng, arr) {
  if (!arr.length) throw new Error('empty pick set')
  const idx = Math.floor(rng() * arr.length)
  return arr[Math.min(arr.length - 1, Math.max(0, idx))]
}

async function fetchJson(url, { method = 'GET', headers = {}, body, timeoutMs = 15_000 } = {}) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const fetchOptions = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    }
    const res = await fetch(url, fetchOptions)
    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    return { ok: res.ok, status: res.status, json, text }
  } catch (err) {
    console.error(`Fetch error for ${url}: ${err.message}`)
    throw err
  } finally {
    clearTimeout(t)
  }
}

async function fetchWithHeaders(url, { method = 'GET', headers = {}, body, timeoutMs = 15_000 } = {}) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    })
    const text = await res.text().catch(() => '')
    return { ok: res.ok, status: res.status, headers: res.headers, text }
  } finally {
    clearTimeout(t)
  }
}

function invariantFail({ invariant, seed, eventIndex, event, stateBefore, stateAfter, error, forensic }) {
  const payload = {
    invariant,
    seed,
    event_index: eventIndex,
    event,
    state_before: stateBefore,
    state_after: stateAfter,
    ...(error ? { error: String(error) } : {}),
    ...(forensic ? { forensic } : {})
  }
  return payload
}

function snapshotSlot(slot) {
  if (!slot) return { exists: false }
  return {
    exists: true,
    id: slot.id,
    provider_id: slot.provider_id,
    is_available: !!slot.is_available,
    start_time: slot.start_time,
    end_time: slot.end_time
  }
}

function arraysEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function chooseEventType(rng) {
  const roll = rng()
  if (roll < 0.28) return 'create_booking'
  if (roll < 0.42) return 'cancel_booking'
  if (roll < 0.56) return 'reschedule_booking'
  if (roll < 0.68) return 'vendor_availability_change'
  if (roll < 0.80) return 'duplicate_webhook_delivery'
  if (roll < 0.92) return 'delayed_notification'
  return 'concurrent_booking_attempt'
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || args.h) {
    console.log(
      [
        'Usage:',
        '  node index.mjs --seed <seed> --duration <seconds> --max-events <n> --concurrency <n> --target-url <url> [--out <path>]',
      ].join('\n')
    )
    process.exit(0)
  }

  const seed = args.seed
  const durationSec = Number(args.duration)
  const maxEvents = Number(args['max-events'])
  const concurrency = Number(args.concurrency)
  const targetUrlRaw = args['target-url']
  const outPath = typeof args.out === 'string' ? args.out : null
  const tier = args.tier || 'unknown'

  if (!seed) throw new Error('--seed is required')
  if (!Number.isFinite(durationSec) || durationSec <= 0) throw new Error('--duration must be a positive number (seconds)')
  if (!Number.isFinite(maxEvents) || maxEvents <= 0) throw new Error('--max-events must be a positive number')
  if (!Number.isFinite(concurrency) || concurrency <= 0) throw new Error('--concurrency must be a positive number')
  if (!targetUrlRaw) throw new Error('--target-url is required')

  const targetUrl = validateTargetUrl(targetUrlRaw)
  const seedStr = String(seed)
  const rng = mulberry32(hashSeedToU32(seedStr))

  const supabaseUrlRaw = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ''

  if (!supabaseUrlRaw) throw new Error('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) env is required')
  if (!rawKey) throw new Error('SUPABASE_SECRET_KEY env is required')

  // Normalize JWT: strip "Bearer " prefix (case-insensitive) and trim whitespace
  const supabaseServiceKey = rawKey.replace(/^Bearer\s+/i, '').trim()

  const supabaseUrl = validateSupabaseUrl(supabaseUrlRaw)
  const restBase = `${supabaseUrl}/rest/v1`
  const supabaseHeaders = {
    apikey: supabaseServiceKey,
    Authorization: `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json'
  }

  function qs(params) {
    const parts = []
    for (const [k, v] of Object.entries(params || {})) {
      if (v === undefined || v === null || v === '') continue
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    }
    return parts.length ? `?${parts.join('&')}` : ''
  }

  function restUrl(table, params) {
    return `${restBase}/${table}${qs(params)}`
  }

  function chunk(values, size) {
    const out = []
    for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size))
    return out
  }

  async function restSelectInChunks({ table, select, column, values, chunkSize = 2 }) {
    if (!values.length) return []
    const out = []
    for (const group of chunk(values, chunkSize)) {
      const res = await fetchJson(restUrl(table, { select, [column]: `in.(${group.join(',')})` }), {
        method: 'GET',
        headers: { ...supabaseHeaders }
      })
      if (!res.ok) throw new Error(`supabase_select_failed:${table}:${res.status}:${res.text}`)
      out.push(...(Array.isArray(res.json) ? res.json : []))
    }
    return out
  }

  async function restCountTable(table) {
    const res = await fetchWithHeaders(restUrl(table, { select: 'id', limit: 1 }), {
      method: 'HEAD',
      headers: { ...supabaseHeaders, Prefer: 'count=exact' }
    })
    if (!res.ok) return null
    const range = res.headers.get('content-range') || ''
    const m = range.match(/\/(\d+)$/)
    if (!m) return null
    return Number(m[1])
  }

  async function restUpsert({ table, onConflict, records }) {
    const res = await fetchJson(restUrl(table, { on_conflict: onConflict }), {
      method: 'POST',
      headers: {
        ...supabaseHeaders,
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: records
    })
    if (!res.ok) throw new Error(`supabase_upsert_failed:${table}:${res.status}:${res.text}`)
    return res.json
  }

  async function restInsert({ table, record }) {
    const res = await fetchJson(restUrl(table, {}), {
      method: 'POST',
      headers: { ...supabaseHeaders, Prefer: 'return=representation' },
      body: record
    })
    return res
  }

  async function restPatch({ table, filters, patch }) {
    const res = await fetchJson(restUrl(table, filters), {
      method: 'PATCH',
      headers: { ...supabaseHeaders, Prefer: 'return=representation' },
      body: patch
    })
    return res
  }

  async function restDelete({ table, filters }) {
    const res = await fetchJson(restUrl(table, filters), {
      method: 'DELETE',
      headers: { ...supabaseHeaders, Prefer: 'return=representation' }
    })
    return res
  }

  async function emitOpsEvent({ type, payload, providerId }) {
    if (!runId) return;
    try {
      await restInsert({
        table: 'ops_events',
        record: {
          source: 'simcity',
          run_id: runId,
          provider_id: providerId || null,
          type: type,
          payload: payload || {}
        }
      });
    } catch (err) {
      // Best-effort only
    }
  }

  // Verify app is reachable (no chaos-specific APIs required).
  await fetchJson(`${targetUrl}/api/health`).catch(() => null)

  // Fail fast if local schema isn't present.
  {
    const checks = await Promise.all([
      fetchJson(restUrl('profiles', { select: 'id', limit: 1 }), { method: 'GET', headers: { ...supabaseHeaders } }),
      fetchJson(restUrl('services', { select: 'id,provider_id', limit: 1 }), { method: 'GET', headers: { ...supabaseHeaders } }),
      fetchJson(restUrl('availability_slots', { select: 'id,provider_id,start_time,end_time,is_available', limit: 1 }), { method: 'GET', headers: { ...supabaseHeaders } }),
      fetchJson(restUrl('bookings', { select: 'id,provider_id,start_time,end_time,total_amount', limit: 1 }), { method: 'GET', headers: { ...supabaseHeaders } })
    ])
    for (const res of checks) {
      if (!res.ok) throw new Error(`schema_not_ready:${res.status}:${res.text}`)
    }
  }

  const timebase = new Timebase({ targetUrl })
  await timebase.initialize()
  const timeDiag = timebase.getDiagnostics()
  console.log(
    `[SimCity] Timebase initialized (server_time_offset=${timeDiag.server_time_offset}ms, server_now=${new Date(
      timeDiag.last_timestamp
    ).toISOString()})`
  )

  const runId = stableUuid(`chaos-run:${seedStr}`)
  // Fixed IDs for bootstrap stability (matches migration)
  const vendors = [
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002'
  ]
  const customers = [
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004'
  ]
  const [vendorA, vendorB] = vendors

  const servicesByVendor = {
    [vendorA]: stableUuid(`${runId}:service:A`),
    [vendorB]: stableUuid(`${runId}:service:B`)
  }

  const slotDurationMinutes = 60
  const slotCount = 16

  const epochMs = Date.UTC(2025, 0, 1, 0, 0, 0)
  const offsetHours = parseInt(stableUuid(`chaos-time:${seedStr}`).slice(0, 8), 16) % (24 * 30)
  const base = new Date(epochMs + offsetHours * 60 * 60 * 1000 + 30 * 60 * 1000)
  const baseTimeIso = base.toISOString()

  function slotTimes(i) {
    const start = new Date(base.getTime() + i * 60 * 60 * 1000)
    const end = new Date(start.getTime() + slotDurationMinutes * 60 * 1000)
    return { start: start.toISOString(), end: end.toISOString() }
  }

  const slotIdsByVendor = { [vendorA]: [], [vendorB]: [] }
  const allSlots = []
  for (const [vendorId, serviceId, key] of [
    [vendorA, servicesByVendor[vendorA], 'A'],
    [vendorB, servicesByVendor[vendorB], 'B']
  ]) {
    for (let i = 0; i < slotCount; i++) {
      const id = stableUuid(`${runId}:slot:${key}:${i}`)
      const { start, end } = slotTimes(i)
      slotIdsByVendor[vendorId].push(id)
      allSlots.push({
        id,
        provider_id: vendorId,
        start_time: start,
        end_time: end,
        is_available: true
      })
    }
  }

  // Pre-seeded auth users and profiles exist via migration 20251222170000_chaos_seed_auth.sql.
  // We only need to upsert services and slots.

  // Best-effort: persist chaos run start
  let runDbId = null
  const runStartMs = timebase.nowMs()
  try {
    const insertRes = await restInsert({
      table: 'simcity_runs',
      record: {
        id: runId,
        tier,
        seed: hashSeedToU32(seedStr),
        concurrency,
        max_events: maxEvents,
        duration_seconds: durationSec,
        started_at: new Date(runStartMs).toISOString()
      }
    })
    if (insertRes.ok) {
      const rows = Array.isArray(insertRes.json) ? insertRes.json : []
      if (rows.length > 0) runDbId = rows[0].id
    }
  } catch (err) {
    // Best-effort only
  }

  // Initialize live status
  if (runDbId) {
    await restUpsert({
      table: 'simcity_run_live',
      onConflict: 'run_id',
      records: [{
        run_id: runDbId,
        status: 'RUNNING',
        last_event_index: -1,
        last_heartbeat_at: new Date(runStartMs).toISOString(),
        last_metrics: {}
      }]
    }).catch(() => {})
  }
  
  await restUpsert({
    table: 'services',
    onConflict: 'id',
    records: [
      {
        id: servicesByVendor[vendorA],
        provider_id: vendorA,
        name: 'Chaos Service A',
        category: 'chaos',
        price: 0,
        is_active: true,
        duration_minutes: slotDurationMinutes
      },
      {
        id: servicesByVendor[vendorB],
        provider_id: vendorB,
        name: 'Chaos Service B',
        category: 'chaos',
        price: 0,
        is_active: true,
        duration_minutes: slotDurationMinutes
      }
    ]
  })

  await restUpsert({ table: 'availability_slots', onConflict: 'id', records: allSlots })

  const initialBookingId = stableUuid(`${runId}:booking:initial`)
  const initialSlotId = slotIdsByVendor[vendorA][0]
  const initialSlot = allSlots.find((s) => s.id === initialSlotId)
  if (!initialSlot) throw new Error('bootstrap_missing_initial_slot')

  await restPatch({ table: 'availability_slots', filters: { id: `eq.${initialSlotId}` }, patch: { is_available: false } })
  await restUpsert({
    table: 'bookings',
    onConflict: 'id',
    records: [
      {
        id: initialBookingId,
        customer_id: customers[0],
        provider_id: vendorA,
        service_id: servicesByVendor[vendorA],
        start_time: initialSlot.start_time,
        end_time: initialSlot.end_time,
        status: 'pending',
        total_amount: 0
      }
    ]
  })

  const paymentsBaseline = {
    payments_outbox: await restCountTable('payments_outbox'),
    processed_webhook_events: await restCountTable('processed_webhook_events')
  }

  const sentinelSlotA = slotIdsByVendor[vendorA]?.[1]
  const sentinelSlotB = slotIdsByVendor[vendorB]?.[1]
  if (!sentinelSlotA || !sentinelSlotB) throw new Error('bootstrap_missing_sentinels')

  const safeSlotsByVendor = {}
  for (const vendorId of vendors) {
    const list = slotIdsByVendor[vendorId] || []
    const safe = list.filter((id) => id !== list[0] && id !== list[1])
    if (safe.length < 2) throw new Error('bootstrap_slotCount_too_small')
    safeSlotsByVendor[vendorId] = safe
  }

  const bookingMeta = new Map()
  bookingMeta.set(initialBookingId, {
    vendorId: vendorA,
    customerId: customers[0],
    serviceId: servicesByVendor[vendorA],
    slotId: slotIdsByVendor[vendorA][0]
  })

  const cancelledBookings = new Set()
  const notificationKeys = new Set()
  const touchedSlots = new Set([slotIdsByVendor[vendorA][0]])
  const touchedSlotList = [slotIdsByVendor[vendorA][0]]

  function rememberTouchedSlot(slotId) {
    if (!slotId || touchedSlots.has(slotId)) return
    touchedSlots.add(slotId)
    touchedSlotList.push(slotId)
  }

  function baseTimeMs() {
    const t = Date.parse(baseTimeIso)
    if (!Number.isFinite(t)) throw new Error('bootstrap_baseTime_invalid')
    return t
  }

  function newSlotTimeForEvent(eventIndex, offsetSlots = 0) {
    const startMs = baseTimeMs() + (slotCount + offsetSlots + (eventIndex % 24)) * 60 * 60 * 1000
    const endMs = startMs + Number(slotDurationMinutes) * 60 * 1000
    return { startTime: new Date(startMs).toISOString(), endTime: new Date(endMs).toISOString() }
  }

  function eventRelevantStateQuery(event) {
    const slotIds = new Set([sentinelSlotA, sentinelSlotB])
    const bookingIds = new Set()
    const bookingSlotIds = new Set(touchedSlotList)
    const keys = new Set()

    if (event.type === 'create_booking') {
      bookingIds.add(event.payload.bookingId)
      slotIds.add(event.payload.slotId)
      bookingSlotIds.add(event.payload.slotId)
    } else if (event.type === 'cancel_booking') {
      bookingIds.add(event.payload.bookingId)
      const meta = bookingMeta.get(event.payload.bookingId)
      if (meta?.slotId) {
        slotIds.add(meta.slotId)
        bookingSlotIds.add(meta.slotId)
      }
    } else if (event.type === 'reschedule_booking') {
      bookingIds.add(event.payload.bookingId)
      slotIds.add(event.payload.newSlotId)
      bookingSlotIds.add(event.payload.newSlotId)
      const meta = bookingMeta.get(event.payload.bookingId)
      if (meta?.slotId) {
        slotIds.add(meta.slotId)
        bookingSlotIds.add(meta.slotId)
      }
    } else if (event.type === 'vendor_availability_change') {
      slotIds.add(event.payload.slotId)
      bookingSlotIds.add(event.payload.slotId)
    } else if (event.type === 'duplicate_webhook_delivery' || event.type === 'delayed_notification') {
      keys.add(event.payload.idempotency_key)
    } else if (event.type === 'concurrent_booking_attempt') {
      slotIds.add(event.payload.slotId)
      bookingSlotIds.add(event.payload.slotId)
      for (const attempt of event.payload.attempts) bookingIds.add(attempt.bookingId)
    }

    return {
      bookingIds: Array.from(bookingIds),
      bookingSlotIds: Array.from(bookingSlotIds),
      slotIds: Array.from(slotIds),
      notificationIdempotencyKeys: Array.from(keys),
      includePayments: true
    }
  }

  function findSlot(state, slotId) {
    return (state.slots || []).find((s) => s.id === slotId) || null
  }

  function collectBookings(state) {
    return Array.isArray(state.bookings) ? state.bookings : []
  }

  function collectSlots(state) {
    return Array.isArray(state.slots) ? state.slots : []
  }

  async function getState(query) {
    const bookingIds = Array.isArray(query.bookingIds) ? query.bookingIds : []
    const bookingSlotIds = Array.isArray(query.bookingSlotIds) ? query.bookingSlotIds : []
    const slotIds = Array.isArray(query.slotIds) ? query.slotIds : []
    const keys = Array.isArray(query.notificationIdempotencyKeys) ? query.notificationIdempotencyKeys : []

    // Merge all slot IDs: event slots + booking slot IDs (to ensure we have slots for all bookings)
    const allSlotIds = Array.from(new Set([...slotIds, ...bookingSlotIds]))

    const [bookingsById, slots, intents] = await Promise.all([
      restSelectInChunks({
        table: 'bookings',
        select: 'id,customer_id,provider_id,service_id,start_time,end_time,status,total_amount,created_at,updated_at',
        column: 'id',
        values: bookingIds
      }),
      restSelectInChunks({
        table: 'availability_slots',
        select: 'id,provider_id,start_time,end_time,is_available,created_at',
        column: 'id',
        values: allSlotIds
      }),
      restSelectInChunks({
        table: 'notification_intents',
        select: 'id,idempotency_key,intent_type,priority,allowed_channels,user_id,created_at',
        column: 'idempotency_key',
        values: keys
      })
    ])

    const bookings = bookingsById

    // Extract provider_ids from all bookings to find related slots by time range
    // Note: bookings don't have slot_id, so we match by provider_id and time overlap
    const bookingProviderIds = Array.from(new Set(bookings.map((b) => b.provider_id).filter(Boolean)))
    const allRequiredSlotIds = Array.from(new Set(allSlotIds))
    
    // Query additional slots if needed (by provider_id)
    const additionalSlots = bookingProviderIds.length
      ? await restSelectInChunks({
          table: 'availability_slots',
          select: 'id,provider_id,start_time,end_time,is_available,created_at',
          column: 'provider_id',
          values: bookingProviderIds
        })
      : []

    // Merge all slots
    const allSlotsMap = new Map()
    for (const s of slots) allSlotsMap.set(s.id, s)
    for (const s of additionalSlots) allSlotsMap.set(s.id, s)
    const allSlots = Array.from(allSlotsMap.values())

    const intentIds = intents.map((i) => i.id).filter(Boolean)
    const deliveries = intentIds.length
      ? await restSelectInChunks({
          table: 'notification_deliveries',
          select: 'id,intent_id,channel,status,attempt_count,created_at,updated_at',
          column: 'intent_id',
          values: intentIds
        })
      : []

    const payments = query.includePayments
      ? {
          payments_outbox: await restCountTable('payments_outbox'),
          processed_webhook_events: await restCountTable('processed_webhook_events')
        }
      : undefined

    return {
      ok: true,
      bookings,
      slots: allSlots,
      notification_intents: intents,
      notification_deliveries: deliveries,
      payments
    }
  }

  async function claimSlot(slotId) {
    const res = await restPatch({
      table: 'availability_slots',
      filters: { id: `eq.${slotId}`, is_available: 'eq.true' },
      patch: { is_available: false }
    })
    if (!res.ok) return { ok: false, status: res.status, json: res.json, text: res.text }
    const rows = Array.isArray(res.json) ? res.json : []
    return { ok: rows.length === 1, status: rows.length === 1 ? 200 : 409, json: res.json, text: res.text }
  }

  async function releaseSlot(slotId) {
    await restPatch({ table: 'availability_slots', filters: { id: `eq.${slotId}` }, patch: { is_available: true } }).catch(() => null)
  }

  async function createBooking(payload) {
    // Use atomic function to claim slot and create booking in one transaction
    const rpcRes = await fetchJson(`${restBase}/rpc/claim_slot_and_create_booking`, {
      method: 'POST',
      headers: { ...supabaseHeaders },
      body: JSON.stringify({
        p_slot_id: payload.slotId,
        p_booking_id: payload.bookingId,
        p_customer_id: payload.customerId,
        p_provider_id: payload.vendorId,
        p_service_id: payload.serviceId,
        p_total_amount: 0
      })
    })

    if (!rpcRes.ok) {
      return { ok: false, status: rpcRes.status, json: rpcRes.json, text: rpcRes.text }
    }

    const result = Array.isArray(rpcRes.json) ? rpcRes.json[0] : rpcRes.json
    if (!result || !result.success) {
      const errorMsg = result?.error_message || 'Failed to claim slot and create booking'
      const status = errorMsg.includes('not found') ? 404 : errorMsg.includes('not available') ? 409 : errorMsg.includes('mismatch') ? 400 : 500
      return { ok: false, status, json: { error: errorMsg }, text: errorMsg }
    }

    // Fetch the created booking to return full details
    const bookingRes = await fetchJson(restUrl('bookings', {
      select: 'id,customer_id,provider_id,service_id,start_time,end_time,status,total_amount,created_at,updated_at',
      id: `eq.${result.booking_id}`
    }), { method: 'GET', headers: { ...supabaseHeaders } })

    if (!bookingRes.ok) {
      return { ok: false, status: bookingRes.status, json: bookingRes.json, text: bookingRes.text }
    }

    const booking = Array.isArray(bookingRes.json) ? bookingRes.json[0] : bookingRes.json
    
    // Emit ops events
    await Promise.all([
      emitOpsEvent({ type: 'booking_created', payload: { booking_id: booking.id }, providerId: booking.provider_id }),
      emitOpsEvent({ type: 'slot_claimed', payload: { slot_id: payload.slotId }, providerId: booking.provider_id })
    ]);

    return { ok: true, status: 200, json: booking, text: JSON.stringify(booking) }
  }

  async function cancelBooking(bookingId) {
    const get = await fetchJson(restUrl('bookings', { select: 'id,status,provider_id,start_time,end_time', id: `eq.${bookingId}` }), {
      method: 'GET',
      headers: { ...supabaseHeaders }
    })
    if (!get.ok) return get
    const booking = Array.isArray(get.json) ? get.json[0] : null
    if (!booking) return { ok: false, status: 404, json: { error: 'Booking not found' }, text: 'Booking not found' }
    if (booking.status === 'cancelled') return { ok: true, status: 200, json: { ok: true }, text: '' }

    const updatedAtMs = timebase.nowMs()
    const patch = await restPatch({
      table: 'bookings',
      filters: { id: `eq.${bookingId}` },
      patch: { status: 'cancelled', updated_at: new Date(updatedAtMs).toISOString() }
    })
    if (!patch.ok) return patch
    // Find and release the slot by matching provider_id and time range
    if (booking.provider_id && booking.start_time && booking.end_time) {
      const slotRes = await fetchJson(restUrl('availability_slots', {
        select: 'id',
        provider_id: `eq.${booking.provider_id}`,
        start_time: `eq.${booking.start_time}`,
        end_time: `eq.${booking.end_time}`
      }), { method: 'GET', headers: { ...supabaseHeaders } })
      if (slotRes.ok && Array.isArray(slotRes.json) && slotRes.json.length > 0) {
        const slotId = slotRes.json[0].id;
        await releaseSlot(slotId)
        await emitOpsEvent({ type: 'slot_released', payload: { slot_id: slotId }, providerId: booking.provider_id });
      }
    }

    await emitOpsEvent({ type: 'booking_cancelled', payload: { booking_id: bookingId }, providerId: booking.provider_id });

    return patch
  }

  async function rescheduleBooking(bookingId, newSlotId) {
    const rpcRes = await fetchJson(`${restBase}/rpc/reschedule_booking_atomically`, {
      method: 'POST',
      headers: { ...supabaseHeaders },
      body: JSON.stringify({
        p_booking_id: bookingId,
        p_new_slot_id: newSlotId
      })
    })

    if (!rpcRes.ok) {
      return { ok: false, status: rpcRes.status, json: rpcRes.json, text: rpcRes.text }
    }

    const result = Array.isArray(rpcRes.json) ? rpcRes.json[0] : rpcRes.json
    if (!result || !result.success) {
      const errorMsg = result?.error_message || 'Failed to reschedule booking'
      const status = errorMsg.includes('not found') ? 404 : errorMsg.includes('not available') ? 409 : errorMsg.includes('cancelled') ? 409 : errorMsg.includes('mismatch') ? 400 : 500
      return { ok: false, status, json: { error: errorMsg }, text: errorMsg }
    }

    // Fetch the updated booking to return full details
    const bookingRes = await fetchJson(restUrl('bookings', {
      select: 'id,customer_id,provider_id,service_id,start_time,end_time,status,total_amount,created_at,updated_at',
      id: `eq.${result.booking_id}`
    }), { method: 'GET', headers: { ...supabaseHeaders } })

    if (!bookingRes.ok) {
      return { ok: false, status: bookingRes.status, json: bookingRes.json, text: bookingRes.text }
    }

    const booking = Array.isArray(bookingRes.json) ? bookingRes.json[0] : bookingRes.json
    
    // Emit ops events
    await Promise.all([
      emitOpsEvent({ type: 'booking_rescheduled', payload: { booking_id: booking.id, new_slot_id: newSlotId }, providerId: booking.provider_id }),
      emitOpsEvent({ type: 'slot_claimed', payload: { slot_id: newSlotId }, providerId: booking.provider_id })
    ]);

    return { ok: true, status: 200, json: booking, text: JSON.stringify(booking) }
  }

  async function availabilityChange(payload) {
    if (payload.operation === 'create') {
      const res = await restUpsert({
        table: 'availability_slots',
        onConflict: 'id',
        records: [
          {
            id: payload.slotId,
            provider_id: payload.vendorId,
            start_time: payload.startTime,
            end_time: payload.endTime,
            is_available: true
          }
        ]
      })
      await emitOpsEvent({ type: 'slot_released', payload: { slot_id: payload.slotId }, providerId: payload.vendorId });
      return { ok: true, status: 200, json: res, text: '' }
    }

    const del = await restDelete({
      table: 'availability_slots',
      filters: { id: `eq.${payload.slotId}`, provider_id: `eq.${payload.vendorId}`, is_available: 'eq.true' }
    })
    if (!del.ok) return del
    const rows = Array.isArray(del.json) ? del.json : []
    if (!rows.length) return { ok: false, status: 409, json: { error: 'Slot not deleted' }, text: 'Slot not deleted' }
    
    await emitOpsEvent({ type: 'slot_claimed', payload: { slot_id: payload.slotId }, providerId: payload.vendorId });
    
    return del
  }

  async function getIntentByKey(idempotencyKey) {
    const res = await fetchJson(
      restUrl('notification_intents', {
        select: 'id,idempotency_key',
        idempotency_key: `eq.${idempotencyKey}`,
        limit: 1
      }),
      { method: 'GET', headers: { ...supabaseHeaders } }
    )
    if (!res.ok) throw new Error(`notification_intents_lookup_failed:${res.status}:${res.text}`)
    const row = Array.isArray(res.json) ? res.json[0] : null
    return row || null
  }

  async function insertIntentOnce({ idempotencyKey, userId, intentType, priority, template, recipient, data }) {
    const res = await fetchJson(restUrl('notification_intents', {}), {
      method: 'POST',
      headers: { ...supabaseHeaders, Prefer: 'return=representation' },
      body: {
        user_id: userId,
        idempotency_key: idempotencyKey,
        intent_type: intentType,
        priority,
        allowed_channels: ['push'],
        payload_ref: {
          user_id: userId,
          template,
          recipient,
          data
        }
      }
    })
    if (res.ok) return res
    if (res.status === 409) return res
    throw new Error(`notification_intents_insert_failed:${res.status}:${res.text}`)
  }

  async function insertDeliveryOnce({ intentId, status }) {
    const deliveryUpdatedMs = timebase.nowMs()
    const res = await fetchJson(restUrl('notification_deliveries', {}), {
      method: 'POST',
      headers: { ...supabaseHeaders, Prefer: 'return=representation' },
      body: {
        intent_id: intentId,
        channel: 'push',
        status,
        attempt_count: 0,
        updated_at: new Date(deliveryUpdatedMs).toISOString()
      }
    })
    if (res.ok) return res
    if (res.status === 409) return res
    throw new Error(`notification_deliveries_insert_failed:${res.status}:${res.text}`)
  }

  async function deliverNotification({ payload, priority, duplicate, deliveryStatus }) {
    const idempotencyKey = payload.idempotency_key
    const userId = payload.user_id
    const intentType = payload.intent_type
    const template = payload.template
    const recipient = payload.recipient
    const data = payload.data

    if (duplicate) {
      await Promise.all([
        insertIntentOnce({ idempotencyKey, userId, intentType, priority, template, recipient, data }),
        insertIntentOnce({ idempotencyKey, userId, intentType, priority, template, recipient, data })
      ])
    } else {
      await insertIntentOnce({ idempotencyKey, userId, intentType, priority, template, recipient, data })
    }

    const intent = await getIntentByKey(idempotencyKey)
    if (!intent?.id) throw new Error('notification_intents_missing_after_insert')

    if (duplicate) {
      await Promise.all([
        insertDeliveryOnce({ intentId: intent.id, status: deliveryStatus }),
        insertDeliveryOnce({ intentId: intent.id, status: deliveryStatus })
      ])
    } else {
      await insertDeliveryOnce({ intentId: intent.id, status: deliveryStatus })
    }

    return { ok: true, status: 200, json: { intent_id: intent.id }, text: '' }
  }

  function checkInvariants({ event, seed, eventIndex, stateBefore, stateAfter }) {
    // no_double_booking: for all touched slots, max 1 non-cancelled booking per provider/time slot
    {
      const bookings = collectBookings(stateAfter)
      const counts = new Map()
      for (const b of bookings) {
        if (!b?.provider_id || !b?.start_time || !b?.end_time) continue
        if (b.status === 'cancelled') continue
        const k = `${b.provider_id}:${b.start_time}:${b.end_time}`
        counts.set(k, (counts.get(k) || 0) + 1)
      }
      for (const [k, n] of counts.entries()) {
        if (n > 1) {
          return invariantFail({
            invariant: 'no_double_booking',
            seed,
            eventIndex,
            event,
            stateBefore,
            stateAfter
          })
        }
      }
    }

    // canceled booking never resurrects
    {
      const bookings = collectBookings(stateAfter)
      for (const b of bookings) {
        if (b?.id && b.status === 'cancelled') cancelledBookings.add(b.id)
      }
      for (const cancelledId of cancelledBookings) {
        const b = bookings.find((x) => x.id === cancelledId)
        if (b && b.status !== 'cancelled') {
          return invariantFail({
            invariant: 'cancelled_booking_never_resurrects',
            seed,
            eventIndex,
            event,
            stateBefore,
            stateAfter
          })
        }
      }
    }

    // notification idempotency (no duplicates)
    {
      const intents = Array.isArray(stateAfter.notification_intents) ? stateAfter.notification_intents : []
      const deliveries = Array.isArray(stateAfter.notification_deliveries) ? stateAfter.notification_deliveries : []

      const intentCounts = new Map()
      for (const i of intents) {
        if (!i?.idempotency_key) continue
        intentCounts.set(i.idempotency_key, (intentCounts.get(i.idempotency_key) || 0) + 1)
      }
      for (const [key, n] of intentCounts.entries()) {
        if (n > 1) {
          return invariantFail({
            invariant: 'notification_idempotency',
            seed,
            eventIndex,
            event,
            stateBefore,
            stateAfter
          })
        }
      }

      const deliveryCounts = new Map()
      for (const d of deliveries) {
        const k = `${d.intent_id}:${d.channel}`
        deliveryCounts.set(k, (deliveryCounts.get(k) || 0) + 1)
      }
      for (const [k, n] of deliveryCounts.entries()) {
        if (n > 1) {
          return invariantFail({
            invariant: 'notification_idempotency',
            seed,
            eventIndex,
            event,
            stateBefore,
            stateAfter
          })
        }
      }
    }

    // booking requires availability
    {
      const bookings = collectBookings(stateAfter)
      const slots = collectSlots(stateAfter)
      // Create a map of slots by provider_id and time range
      const slotsByProviderTime = new Map()
      for (const s of slots) {
        const key = `${s.provider_id}:${s.start_time}:${s.end_time}`
        slotsByProviderTime.set(key, s)
      }
      for (const b of bookings) {
        if (!b?.provider_id || !b?.start_time || !b?.end_time) continue
        if (b.status === 'cancelled') continue
        const key = `${b.provider_id}:${b.start_time}:${b.end_time}`
        const matchingSlots = Array.from(slotsByProviderTime.values()).filter(
          s => s.provider_id === b.provider_id && s.start_time === b.start_time && s.end_time === b.end_time
        )
        const slot = slotsByProviderTime.get(key)
        if (!slot) {
          const forensic = {
            event_payload: event.payload,
            booking: { id: b.id, provider_id: b.provider_id, start_time: b.start_time, end_time: b.end_time },
            matched_slots: [],
            classification_hint: 'no slot matched'
          }
          return invariantFail({
            invariant: 'booking_requires_availability',
            seed,
            eventIndex,
            event,
            stateBefore,
            stateAfter,
            forensic
          })
        }
        // Normalize is_available to boolean for comparison
        // A booked slot should have is_available = false
        const slotIsUnavailable = !slot.is_available
        if (slot.provider_id !== b.provider_id || !slotIsUnavailable) {
          const forensic = {
            event_payload: event.payload,
            booking: { id: b.id, provider_id: b.provider_id, start_time: b.start_time, end_time: b.end_time },
            matched_slot: { id: slot.id, provider_id: slot.provider_id, start_time: slot.start_time, end_time: slot.end_time, is_available: slot.is_available },
            classification_hint: matchingSlots.length > 1 ? 'multiple slots matched' : 'booking exists while slot still available'
          }
          return invariantFail({
            invariant: 'booking_requires_availability',
            seed,
            eventIndex,
            event,
            stateBefore,
            stateAfter,
            forensic
          })
        }
      }
    }

    // no payment/billing state touched
    {
      const after = stateAfter.payments || {}
      const beforeBaseline = paymentsBaseline || {}
      for (const key of ['payments_outbox', 'processed_webhook_events']) {
        const base = beforeBaseline[key]
        const now = after[key]
        if (base == null || now == null) continue
        if (base !== now) {
          return invariantFail({
            invariant: 'no_payment_or_billing_state_touched',
            seed,
            eventIndex,
            event,
            stateBefore,
            stateAfter
          })
        }
      }
    }

    // no cross-vendor leakage: sentinel slots for uninvolved vendors unchanged
    {
      const affectedVendors = new Set()
      if (event.type === 'create_booking') affectedVendors.add(event.payload.vendorId)
      if (event.type === 'cancel_booking') {
        const meta = bookingMeta.get(event.payload.bookingId)
        if (meta?.vendorId) affectedVendors.add(meta.vendorId)
      }
      if (event.type === 'reschedule_booking') {
        const meta = bookingMeta.get(event.payload.bookingId)
        if (meta?.vendorId) affectedVendors.add(meta.vendorId)
      }
      if (event.type === 'vendor_availability_change') affectedVendors.add(event.payload.vendorId)
      if (event.type === 'concurrent_booking_attempt') affectedVendors.add(event.payload.vendorId)

      const beforeA = snapshotSlot(findSlot(stateBefore, sentinelSlotA))
      const afterA = snapshotSlot(findSlot(stateAfter, sentinelSlotA))
      const beforeB = snapshotSlot(findSlot(stateBefore, sentinelSlotB))
      const afterB = snapshotSlot(findSlot(stateAfter, sentinelSlotB))

      if (!affectedVendors.has(vendorA) && !arraysEqual(beforeA, afterA)) {
        return invariantFail({
          invariant: 'no_cross_vendor_data_leakage',
          seed,
          eventIndex,
          event,
          stateBefore,
          stateAfter
        })
      }
      if (!affectedVendors.has(vendorB) && !arraysEqual(beforeB, afterB)) {
        return invariantFail({
          invariant: 'no_cross_vendor_data_leakage',
          seed,
          eventIndex,
          event,
          stateBefore,
          stateAfter
        })
      }
    }

    return null
  }

  async function runEvent(event) {
    if (event.type === 'create_booking') {
      return createBooking(event.payload)
    }
    if (event.type === 'cancel_booking') {
      return cancelBooking(event.payload.bookingId)
    }
    if (event.type === 'reschedule_booking') {
      return rescheduleBooking(event.payload.bookingId, event.payload.newSlotId)
    }
    if (event.type === 'vendor_availability_change') {
      return availabilityChange(event.payload)
    }
    if (event.type === 'duplicate_webhook_delivery') {
      return deliverNotification({
        payload: event.payload,
        priority: 'high',
        duplicate: true,
        deliveryStatus: 'queued'
      })
    }
    if (event.type === 'delayed_notification') {
      // "Delayed" is modeled as a low-priority queued delivery record; idempotency_key is still enforced.
      return deliverNotification({
        payload: event.payload,
        priority: 'low',
        duplicate: false,
        deliveryStatus: 'queued'
      })
    }
    if (event.type === 'concurrent_booking_attempt') {
      const reqs = event.payload.attempts.map((attempt) =>
        createBooking({
          bookingId: attempt.bookingId,
          vendorId: event.payload.vendorId,
          customerId: event.payload.customerId,
          serviceId: event.payload.serviceId,
          slotId: event.payload.slotId
        })
      )
      const results = await Promise.all(reqs)
      return { ok: true, status: 200, json: results.map((r) => ({ ok: r.ok, status: r.status, json: r.json })), text: '' }
    }
    throw new Error(`unknown_event_type: ${event.type}`)
  }

  const startedAt = timebase.nowMs()
  let executed = 0

  for (let eventIndex = 0; eventIndex < maxEvents; eventIndex++) {
    const elapsedSec = (timebase.nowMs() - startedAt) / 1000
    if (elapsedSec >= durationSec) break

    const type = chooseEventType(rng)
    const vendorId = pick(rng, vendors)
    const customerId = pick(rng, customers)
    const serviceId = servicesByVendor[vendorId]

    const event = { type, payload: null }

    if (type === 'create_booking') {
      const slotId = pick(rng, safeSlotsByVendor[vendorId])
      const bookingId = stableUuid(`${runId}:booking:${eventIndex}:${vendorId}:${slotId}`)
      event.payload = { bookingId, vendorId, customerId, serviceId, slotId }
      bookingMeta.set(bookingId, { vendorId, customerId, serviceId, slotId })
      rememberTouchedSlot(slotId)
    } else if (type === 'cancel_booking') {
      const known = Array.from(bookingMeta.keys())
      const bookingId = pick(rng, known)
      event.payload = { bookingId }
      const meta = bookingMeta.get(bookingId)
      if (meta?.slotId) rememberTouchedSlot(meta.slotId)
    } else if (type === 'reschedule_booking') {
      const known = Array.from(bookingMeta.keys())
      const bookingId = pick(rng, known)
      const meta = bookingMeta.get(bookingId) || { vendorId, customerId, serviceId, slotId: pick(rng, safeSlotsByVendor[vendorId]) }
      const newSlotId = pick(rng, safeSlotsByVendor[meta.vendorId])
      event.payload = { bookingId, newSlotId }
      bookingMeta.set(bookingId, { ...meta, slotId: newSlotId })
      rememberTouchedSlot(meta.slotId)
      rememberTouchedSlot(newSlotId)
    } else if (type === 'vendor_availability_change') {
      const operation = rng() < 0.5 ? 'delete' : 'create'
      if (operation === 'delete') {
        const slotId = pick(rng, safeSlotsByVendor[vendorId])
        event.payload = { operation: 'delete', vendorId, slotId }
        rememberTouchedSlot(slotId)
      } else {
        const slotId = stableUuid(`${runId}:slot:new:${eventIndex}:${vendorId}`)
        const { startTime, endTime } = newSlotTimeForEvent(eventIndex)
        event.payload = { operation: 'create', vendorId, serviceId, slotId, startTime, endTime }
        rememberTouchedSlot(slotId)
      }
    } else if (type === 'duplicate_webhook_delivery' || type === 'delayed_notification') {
      const idempotency_key = crypto
        .createHash('sha256')
        .update(`notif:${runId}:${type}:${eventIndex}`)
        .digest('hex')
      const actorRole = rng() < 0.5 ? 'customer' : 'vendor'
      const actorId = actorRole === 'customer' ? customerId : vendorId
      event.payload = {
        actorId,
        actorRole,
        recipient: customerId,
        template: type === 'delayed_notification' ? 'booking_updated' : 'booking_created',
        data: { chaos: true, runId, eventIndex },
        idempotency_key,
        intent_type: 'chaos_notification',
        user_id: customerId
      }
      notificationKeys.add(idempotency_key)
    } else if (type === 'concurrent_booking_attempt') {
      const slotId = pick(rng, safeSlotsByVendor[vendorId])
      const attempts = Math.max(2, Math.min(8, Math.floor(concurrency)))
      const list = []
      for (let a = 0; a < attempts; a++) {
        const bookingId = stableUuid(`${runId}:booking:concurrent:${eventIndex}:${a}:${vendorId}:${slotId}`)
        list.push({ bookingId })
        bookingMeta.set(bookingId, { vendorId, customerId, serviceId, slotId })
      }
      event.payload = { vendorId, customerId, serviceId, slotId, attempts: list }
      rememberTouchedSlot(slotId)
    }

    const query = eventRelevantStateQuery(event)
    const stateBefore = await getState(query)

    // Push event telemetry
    if (runDbId) {
      const observedAtMs = timebase.nowMs()
      await restInsert({
        table: 'simcity_run_events',
        record: {
          run_id: runDbId,
          event_index: eventIndex,
          event_type: type,
          event_payload: event.payload,
          observed_at: new Date(observedAtMs).toISOString()
        }
      }).catch(() => {})
    }

    const eventResult = await runEvent(event).catch((e) => ({ ok: false, status: 0, json: null, text: '', error: e }))

    const stateAfter = await getState(query)

    // Periodic snapshot and live update
    if (runDbId && (eventIndex % 5 === 0 || eventIndex === maxEvents - 1)) {
      try {
        const metricsRes = await fetchJson(`${restBase}/rpc/get_simcity_metrics`, {
          method: 'POST',
          headers: { ...supabaseHeaders }
        })
        const metrics = (Array.isArray(metricsRes.json) ? metricsRes.json[0] : metricsRes.json) || {}
        
        const heartbeatAtMs = timebase.nowMs()
        await Promise.all([
          restInsert({
            table: 'simcity_run_snapshots',
            record: {
              run_id: runDbId,
              event_index: eventIndex,
              metrics: metrics,
              state_summary: {
                bookings: stateAfter.bookings?.length || 0,
                slots: stateAfter.slots?.length || 0
              }
            }
          }),
          restPatch({
            table: 'simcity_run_live',
            filters: { run_id: `eq.${runDbId}` },
            patch: {
              last_event_index: eventIndex,
              last_heartbeat_at: new Date(heartbeatAtMs).toISOString(),
              last_metrics: metrics
            }
          })
        ]).catch(() => {})
      } catch (err) {
        // Best-effort
      }
    }

    const fail = checkInvariants({ event, seed: seedStr, eventIndex, stateBefore, stateAfter })
    if (fail) {
      if (eventResult?.error) fail.error = String(eventResult.error)

      // Emit invariant failure to ops_events
      await emitOpsEvent({
        type: 'invariant_failed',
        payload: {
          invariant: fail.invariant,
          event_index: fail.event_index,
          event: fail.event,
          forensic: fail.forensic || null
        }
      });

      // Best-effort: persist chaos run fail
      if (runDbId) {
        const failureAtMs = timebase.nowMs()
        await Promise.all([
          restPatch({
            table: 'simcity_runs',
            filters: { id: `eq.${runDbId}` },
            patch: {
              ended_at: new Date(failureAtMs).toISOString(),
              result: 'FAIL',
              pass: false,
              fail_invariant: fail.invariant,
              fail_event_index: fail.event_index,
              fail_forensic: fail.forensic || null,
              duration_seconds_actual: (failureAtMs - startedAt) / 1000
            }
          }),
          restPatch({
            table: 'simcity_run_live',
            filters: { run_id: `eq.${runDbId}` },
            patch: {
              status: 'FAILED',
              last_message: `Failed on invariant: ${fail.invariant}`
            }
          })
        ]).catch(() => {})
      }

      if (outPath) {
        await fs.writeFile(outPath, JSON.stringify(fail, null, 2), 'utf8').catch(() => {})
      }
      const output = [
        'FAIL',
        `invariant: ${fail.invariant}`,
        `seed: ${fail.seed}`,
        `event_index: ${fail.event_index}`,
        `event: ${JSON.stringify(fail.event)}`
      ]
      if (fail.forensic) {
        output.push(`forensic: ${JSON.stringify(fail.forensic)}`)
      }
      output.push(
        `state_before: ${JSON.stringify(fail.state_before)}`,
        `state_after: ${JSON.stringify(fail.state_after)}`,
        ...(fail.error ? [`error: ${fail.error}`] : [])
      )
      process.stdout.write(output.join('\n') + '\n')
      process.exit(1)
    }

    executed++
  }

  const completionMs = timebase.nowMs()
  const durationActual = Math.round(((completionMs - startedAt) / 1000) * 10) / 10

  // Best-effort: persist chaos run pass
  if (runDbId) {
    const durationSeconds = (completionMs - startedAt) / 1000
    await Promise.all([
      restPatch({
        table: 'simcity_runs',
        filters: { id: `eq.${runDbId}` },
        patch: {
          ended_at: new Date(completionMs).toISOString(),
          result: 'PASS',
          pass: true,
          duration_seconds_actual: durationSeconds
        }
      }),
      restPatch({
        table: 'simcity_run_live',
        filters: { run_id: `eq.${runDbId}` },
        patch: {
          status: 'PASSED'
        }
      })
    ]).catch(() => {})
  }

  process.stdout.write(['PASS', `seed: ${seedStr}`, `events: ${executed}`, `duration: ${durationActual}s`].join('\n') + '\n')
  process.exit(0)
}

main().catch((e) => {
  const seed = process.argv.includes('--seed') ? process.argv[process.argv.indexOf('--seed') + 1] : 'unknown'
  process.stdout.write(['FAIL', 'invariant: harness_bootstrap', `seed: ${seed}`, 'event_index: -1', `event: {}`, `state_before: {}`, `state_after: {}`, `error: ${String(e?.message || e)}`].join('\n') + '\n')
  process.exit(1)
})
