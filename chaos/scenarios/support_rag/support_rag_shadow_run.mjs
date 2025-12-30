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

function pick(rng, arr) {
  if (!arr.length) throw new Error('empty pick set')
  const idx = Math.floor(rng() * arr.length)
  return arr[Math.min(arr.length - 1, Math.max(0, idx))]
}

function weightedPick(rng, items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  let roll = rng() * totalWeight
  for (const item of items) {
    roll -= item.weight
    if (roll <= 0) return item.value
  }
  return items[items.length - 1].value
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

const QUESTION_CORPUS = {
  core: [
    { value: 'How do I book an appointment?', weight: 10 },
    { value: 'Can I cancel a booking?', weight: 8 },
    { value: 'How do refunds work?', weight: 8 },
    { value: 'Do providers pay upfront?', weight: 7 },
    { value: 'What happens if a provider cancels?', weight: 7 },
  ],
  edge: [
    { value: 'Can I reschedule after payment?', weight: 5 },
    { value: 'Is there a penalty for no-shows?', weight: 4 },
    { value: 'How does Bookiji make money?', weight: 3 },
  ],
  outOfScope: [
    { value: 'Can I book a flight?', weight: 2 },
    { value: 'Is Bookiji a dating app?', weight: 1 },
    { value: 'How do I reset my Bitcoin wallet?', weight: 1 },
  ]
}

function selectQuestion(rng) {
  const roll = rng()
  if (roll < 0.6) {
    return weightedPick(rng, QUESTION_CORPUS.core)
  } else if (roll < 0.85) {
    return weightedPick(rng, QUESTION_CORPUS.edge)
  } else {
    return weightedPick(rng, QUESTION_CORPUS.outOfScope)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || args.h) {
    console.log(
      [
        'Usage:',
        '  node support_rag_shadow_run.mjs --seed <seed> --duration <seconds> --concurrency <n> --target-url <url> [--out <path>]',
      ].join('\n')
    )
    process.exit(0)
  }

  const seed = args.seed
  const durationSec = Number(args.duration)
  const concurrency = Number(args.concurrency)
  const targetUrlRaw = args['target-url']
  const outPath = typeof args.out === 'string' ? args.out : null
  const tier = args.tier || 'support_rag'

  if (!seed) throw new Error('--seed is required')
  if (!Number.isFinite(durationSec) || durationSec <= 0) throw new Error('--duration must be a positive number (seconds)')
  if (!Number.isFinite(concurrency) || concurrency <= 0) throw new Error('--concurrency must be a positive number')
  if (!targetUrlRaw) throw new Error('--target-url is required')

  const targetUrl = validateTargetUrl(targetUrlRaw)
  const seedStr = String(seed)
  const rng = mulberry32(hashSeedToU32(seedStr))

  // Use local Supabase defaults if not provided (for local development)
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

  async function restInsert({ table, record }) {
    const res = await fetchJson(`${restBase}/${table}`, {
      method: 'POST',
      headers: { ...supabaseHeaders, Prefer: 'return=representation' },
      body: record
    })
    return res
  }

  async function restPatch({ table, filters, patch }) {
    const qs = Object.entries(filters || {})
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    const res = await fetchJson(`${restBase}/${table}${qs ? '?' + qs : ''}`, {
      method: 'PATCH',
      headers: { ...supabaseHeaders, Prefer: 'return=representation' },
      body: patch
    })
    return res
  }

  const runId = stableUuid(`support-rag-run:${seedStr}`)

  let runDbId = null
  try {
    const insertRes = await restInsert({
      table: 'simcity_runs',
      record: {
        id: runId,
        tier,
        seed: hashSeedToU32(seedStr),
        concurrency,
        max_events: 0,
        duration_seconds: durationSec,
        started_at: new Date().toISOString()
      }
    })
    if (insertRes.ok && Array.isArray(insertRes.json) && insertRes.json.length > 0) {
      runDbId = insertRes.json[0].id
    }
  } catch (err) {
    // Best-effort only
  }

  const startedAt = Date.now()
  let executed = 0
  const failures = []
  const MAX_LATENCY_MS = 3200

  // Snapshot telemetry: Event buffer and timer
  const eventBuffer = []
  let snapshotTimer = null
  let snapshotEventIndex = 0
  let isRunActive = false

  // Compute metrics from event buffer
  function computeSnapshotMetrics(events) {
    if (events.length === 0) {
      return {
        events_per_sec: 0,
        latency_avg_ms: 0,
        latency_p95_ms: 0,
        fallback_rate: 0,
        error_rate: 0
      }
    }

    const latencies = events.map(e => e.latencyMs || 0).filter(l => l > 0)
    const sortedLatencies = [...latencies].sort((a, b) => a - b)
    const p95Index = Math.floor(sortedLatencies.length * 0.95)
    const latencyP95 = sortedLatencies.length > 0 ? sortedLatencies[Math.min(p95Index, sortedLatencies.length - 1)] : 0
    const latencyAvg = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0

    const fallbackCount = events.filter(e => e.fallbackUsed === true).length
    const errorCount = events.filter(e => e.status !== 200).length

    return {
      events_per_sec: events.length,
      latency_avg_ms: Math.round(latencyAvg),
      latency_p95_ms: Math.round(latencyP95),
      fallback_rate: events.length > 0 ? fallbackCount / events.length : 0,
      error_rate: events.length > 0 ? errorCount / events.length : 0
    }
  }

  // Emit snapshot to database
  async function emitSnapshot() {
    if (!runDbId || !isRunActive) return

    try {
      // Drain buffer and compute metrics
      const eventsToProcess = eventBuffer.splice(0)
      const metrics = computeSnapshotMetrics(eventsToProcess)

      // Store snapshot (append-only, Class C derived data)
      await restInsert({
        table: 'simcity_run_snapshots',
        record: {
          run_id: runDbId,
          event_index: snapshotEventIndex++,
          metrics: metrics,
          state_summary: {
            executed_total: executed,
            failures_total: failures.length
          }
        }
      }).catch(err => {
        // Snapshot failures must never stop a run
        console.error(`[Snapshot] Failed to emit snapshot: ${err.message}`)
      })
    } catch (err) {
      // Snapshot failures must never stop a run
      console.error(`[Snapshot] Error in snapshot logic: ${err.message}`)
    }
  }

  // Start snapshot timer (after run is created and preflight passes)
  function startSnapshotTimer() {
    if (!runDbId || snapshotTimer) return

    isRunActive = true
    snapshotTimer = setInterval(() => {
      emitSnapshot().catch(() => {
        // Already handled in emitSnapshot, but catch here too for safety
      })
    }, 1000) // 1 second interval
  }

  // Stop snapshot timer
  function stopSnapshotTimer() {
    isRunActive = false
    if (snapshotTimer) {
      clearInterval(snapshotTimer)
      snapshotTimer = null
    }
    // Emit final snapshot with remaining events
    emitSnapshot().catch(() => {})
  }

  async function runQuestion(question, eventIndex) {
    try {
      const res = await fetchJson(`${targetUrl}/api/support/ask`, {
        method: 'POST',
        body: { question },
        timeoutMs: MAX_LATENCY_MS
      })

      const latencyMs = res.latencyMs || 0

      if (!res.ok || res.status !== 200) {
        failures.push({
          eventIndex,
          question,
          status: res.status,
          latencyMs,
          error: 'Non-200 status'
        })
        // Add to snapshot buffer (for telemetry)
        eventBuffer.push({
          status: res.status,
          latencyMs,
          fallbackUsed: false
        })
        return { ok: false, eventIndex, question, status: res.status, latencyMs }
      }

      const answer = res.json
      if (!answer || typeof answer !== 'object') {
        failures.push({
          eventIndex,
          question,
          status: res.status,
          latencyMs,
          error: 'Invalid response format'
        })
        // Add to snapshot buffer (for telemetry)
        eventBuffer.push({
          status: res.status,
          latencyMs,
          fallbackUsed: false
        })
        return { ok: false, eventIndex, question, status: res.status, latencyMs }
      }

      const fallbackUsed = answer.fallbackUsed === true
      const citationsCount = Array.isArray(answer.citations) ? answer.citations.length : 0
      const confidence = typeof answer.confidence === 'number' ? answer.confidence : 0

      if (latencyMs > MAX_LATENCY_MS) {
        failures.push({
          eventIndex,
          question,
          status: res.status,
          latencyMs,
          error: `Latency exceeded ${MAX_LATENCY_MS}ms`
        })
        // Add to snapshot buffer (for telemetry)
        eventBuffer.push({
          status: res.status,
          latencyMs,
          fallbackUsed
        })
        return { ok: false, eventIndex, question, status: res.status, latencyMs }
      }

      if (!fallbackUsed && citationsCount === 0) {
        failures.push({
          eventIndex,
          question,
          status: res.status,
          latencyMs,
          error: 'LangChain path returned zero citations'
        })
        // Add to snapshot buffer (for telemetry)
        eventBuffer.push({
          status: res.status,
          latencyMs,
          fallbackUsed
        })
        return { ok: false, eventIndex, question, status: res.status, latencyMs }
      }

      if (runDbId) {
        await restInsert({
          table: 'simcity_run_events',
          record: {
            run_id: runDbId,
            event_index: eventIndex,
            event_type: 'support.ask',
            event_payload: {
              question,
              status: res.status,
              latencyMs,
              fallbackUsed,
              citationsCount,
              confidence
            },
            observed_at: new Date().toISOString()
          }
        }).catch(() => {})
      }

      // Add to snapshot buffer (for telemetry)
      eventBuffer.push({
        status: res.status,
        latencyMs,
        fallbackUsed
      })

      return {
        ok: true,
        eventIndex,
        question,
        status: res.status,
        latencyMs,
        fallbackUsed,
        citationsCount,
        confidence
      }
    } catch (err) {
      failures.push({
        eventIndex,
        question,
        status: 0,
        latencyMs: 0,
        error: err instanceof Error ? err.message : String(err)
      })
      
      // Add error event to snapshot buffer
      eventBuffer.push({
        status: 0,
        latencyMs: 0,
        fallbackUsed: false
      })
      
      return { ok: false, eventIndex, question, status: 0, latencyMs: 0, error: err }
    }
  }

  const endTime = startedAt + durationSec * 1000
  let eventIndex = 0
  const activePromises = new Set()

  while (Date.now() < endTime || activePromises.size > 0) {
    while (activePromises.size < concurrency && Date.now() < endTime) {
      const question = selectQuestion(rng)
      const promise = runQuestion(question, eventIndex).then(result => {
        activePromises.delete(promise)
        if (result.ok) {
          executed++
        }
        return result
      })
      activePromises.add(promise)
      eventIndex++
    }

    if (activePromises.size > 0) {
      await Promise.race(Array.from(activePromises))
    }

    if (Date.now() >= endTime && activePromises.size === 0) {
      break
    }
  }

  await Promise.all(Array.from(activePromises))

  // Stop snapshot timer before finalizing run
  stopSnapshotTimer()

  if (failures.length > 0) {
    if (runDbId) {
      await restPatch({
        table: 'simcity_runs',
        filters: { id: `eq.${runDbId}` },
        patch: {
          ended_at: new Date().toISOString(),
          result: 'FAIL',
          pass: false,
          fail_invariant: 'support_rag_assertions',
          fail_event_index: failures[0].eventIndex,
          fail_forensic: { failures: failures.slice(0, 10) },
          duration_seconds_actual: (Date.now() - startedAt) / 1000
        }
      }).catch(() => {})
    }

    if (outPath) {
      await import('fs/promises').then(fs =>
        fs.writeFile(outPath, JSON.stringify({ failures, executed, seed: seedStr }, null, 2), 'utf8')
      ).catch(() => {})
    }

    const output = [
      'FAIL',
      `invariant: support_rag_assertions`,
      `seed: ${seedStr}`,
      `executed: ${executed}`,
      `failures: ${failures.length}`,
      `first_failure: ${JSON.stringify(failures[0])}`
    ]
    process.stdout.write(output.join('\n') + '\n')
    process.exit(1)
  }

  const durationActual = Math.round(((Date.now() - startedAt) / 1000) * 10) / 10

  // Ensure snapshot timer is stopped
  stopSnapshotTimer()

  if (runDbId) {
    await restPatch({
      table: 'simcity_runs',
      filters: { id: `eq.${runDbId}` },
      patch: {
        ended_at: new Date().toISOString(),
        result: 'PASS',
        pass: true,
        duration_seconds_actual: durationActual
      }
    }).catch(() => {})
  }

  process.stdout.write(['PASS', `seed: ${seedStr}`, `events: ${executed}`, `duration: ${durationActual}s`].join('\n') + '\n')
  process.exit(0)
}

main().catch((e) => {
  // Ensure snapshot timer is stopped on error
  if (typeof stopSnapshotTimer === 'function') {
    try {
      stopSnapshotTimer()
    } catch {}
  }
  const seed = process.argv.includes('--seed') ? process.argv[process.argv.indexOf('--seed') + 1] : 'unknown'
  process.stdout.write(['FAIL', 'invariant: support_rag_bootstrap', `seed: ${seed}`, 'event_index: -1', `event: {}`, `error: ${String(e?.message || e)}`].join('\n') + '\n')
  process.exit(1)
})

