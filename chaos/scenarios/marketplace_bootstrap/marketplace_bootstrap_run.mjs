import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import dns from 'node:dns'

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

async function fetchJson(url, { method = 'GET', headers = {}, body, timeoutMs = 15_000 } = {}) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const fetchOptions = {
      method,
      headers: { ...headers },
      body: body === undefined ? undefined : (typeof body === 'string' || body instanceof FormData ? body : JSON.stringify(body)),
      signal: controller.signal
    }
    
    // Auto-set content type for JSON if not FormData
    if (!(body instanceof FormData) && !fetchOptions.headers['Content-Type']) {
      fetchOptions.headers['Content-Type'] = 'application/json'
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
        '  node marketplace_bootstrap_run.mjs --seed <seed> --duration <seconds> --concurrency <n> --target-url <url>',
      ].join('\n')
    )
    process.exit(0)
  }

  const seed = args.seed
  const durationSec = Number(args.duration)
  const concurrency = Number(args.concurrency) || 2
  const targetUrlRaw = args['target-url']
  
  if (!seed) throw new Error('--seed is required')
  if (!Number.isFinite(durationSec) || durationSec <= 0) throw new Error('--duration must be a positive number (seconds)')
  if (!Number.isFinite(concurrency) || concurrency <= 0) throw new Error('--concurrency must be a positive number')
  if (!targetUrlRaw) throw new Error('--target-url is required')

  const targetUrl = validateTargetUrl(targetUrlRaw)
  const seedStr = String(seed)
  const rng = mulberry32(hashSeedToU32(seedStr))

  // Supabase Setup
  const supabaseUrlRaw = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ''

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

  async function restUpsert({ table, onConflict, records }) {
      const res = await fetchJson(`${restBase}/${table}?on_conflict=${onConflict}`, {
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

  const runId = stableUuid(`bootstrap-run:${seedStr}`)
  let runDbId = null

  // Register Run
  try {
    const insertRes = await restInsert({
      table: 'simcity_runs',
      record: {
        id: runId,
        tier: 'marketplace_bootstrap',
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
    console.error('Failed to register run:', err.message)
  }

  // Init Live Status
  if (runDbId) {
    await restUpsert({
      table: 'simcity_run_live',
      onConflict: 'run_id',
      records: [{
        run_id: runDbId,
        status: 'RUNNING',
        last_event_index: -1,
        last_heartbeat_at: new Date().toISOString(),
        last_metrics: {}
      }]
    }).catch(() => {})
  }

  async function emitOpsEvent({ type, entityId, payload = {} }) {
    await restInsert({
      table: 'ops_events',
      record: {
        source: 'simcity',
        run_id: runId,
        provider_id: null,
        type: type,
        payload: {
          entity_id: entityId,
          ...payload
        },
        observed_at: new Date().toISOString()
      }
    }).catch(err => {
      console.error(`Failed to emit ops event ${type}:`, err.message)
    })
  }

  async function createVendor(index) {
    const email = `vendor_${seedStr}_${index}@example.com`
    
    const formData = new FormData()
    formData.append('business_name', `SimCity Vendor ${index}`)
    formData.append('business_description', 'Generated by SimCity Marketplace Bootstrap')
    formData.append('business_type', 'individual')
    formData.append('service_categories', JSON.stringify(['home_services']))
    formData.append('contact_name', `Vendor Contact ${index}`)
    formData.append('email', email)
    formData.append('phone', '555-0100')
    formData.append('business_address', '123 Sim St')
    formData.append('city', 'SimCity')
    formData.append('state', 'CA')
    formData.append('zip_code', '90001')
    formData.append('service_radius', '10')
    formData.append('services', JSON.stringify([{ name: 'Basic Service', price: 100 }]))
    formData.append('years_in_business', '1')
    formData.append('advance_booking_days', '30')
    
    // Call real API
    const res = await fetchJson(`${targetUrl}/api/vendor/register`, {
      method: 'POST',
      body: formData
    })

    if (!res.ok) {
      throw new Error(`Vendor creation failed: ${res.status} ${res.text}`)
    }

    const createdId = res.json?.vendor?.id
    if (!createdId) {
      throw new Error('Vendor creation response missing ID')
    }

    await emitOpsEvent({ type: 'vendor.created', entityId: createdId })
    return createdId
  }

  async function createCustomer(index) {
    const email = `customer_${seedStr}_${index}@example.com`
    const password = `Pass${stableUuid(`pw:${seedStr}:${index}`)}` 
    
    const res = await fetchJson(`${targetUrl}/api/auth/register`, {
      method: 'POST',
      body: {
        email,
        password,
        full_name: `SimCity Customer ${index}`,
        role: 'customer'
      }
    })

    if (!res.ok) {
      // Treat 400 as non-fatal if user exists? 
      // Instructions say "Fail the run if... Any entity creation fails".
      // We will propagate error.
      throw new Error(`Customer creation failed: ${res.status} ${res.text}`)
    }

    const createdId = res.json?.user?.id
    if (!createdId) {
      throw new Error('Customer creation response missing ID')
    }

    await emitOpsEvent({ type: 'customer.created', entityId: createdId })
    return createdId
  }

  const startedAt = Date.now()
  const endTime = startedAt + durationSec * 1000
  let executed = 0
  const activePromises = new Set()

  let eventIndex = 0

  while (Date.now() < endTime || activePromises.size > 0) {
    while (activePromises.size < concurrency && Date.now() < endTime) {
      const idx = eventIndex++
      const promise = (async () => {
        try {
          await createVendor(idx)
          await createCustomer(idx)
          executed++
        } catch (err) {
          console.error(`Iteration ${idx} failed:`, err)
          process.exit(1)
        }
      })().then(() => {
        activePromises.delete(promise)
      })
      
      activePromises.add(promise)
    }

    if (activePromises.size > 0) {
      await Promise.race(Array.from(activePromises))
    }
    
    // Heartbeat / Snapshot logic every 5 events or on completion
    if (runDbId && (eventIndex % 5 === 0)) {
        try {
            const metricsRes = await fetchJson(`${restBase}/rpc/get_simcity_metrics`, {
              method: 'POST',
              headers: { ...supabaseHeaders }
            })
            const metrics = (Array.isArray(metricsRes.json) ? metricsRes.json[0] : metricsRes.json) || {}
            
            await Promise.all([
              restInsert({
                table: 'simcity_run_snapshots',
                record: {
                  run_id: runDbId,
                  event_index: eventIndex,
                  metrics: metrics,
                  state_summary: {
                    executed_total: executed
                  }
                }
              }),
              restPatch({
                table: 'simcity_run_live',
                filters: { run_id: `eq.${runDbId}` },
                patch: {
                  last_event_index: eventIndex,
                  last_heartbeat_at: new Date().toISOString(),
                  last_metrics: metrics
                }
              })
            ]).catch(() => {})
        } catch (e) {
            // Ignore snapshot errors
        }
    }

    if (Date.now() >= endTime && activePromises.size === 0) {
      break
    }
  }

  await Promise.all(Array.from(activePromises))

  const durationActual = (Date.now() - startedAt) / 1000

  // Finish Run
  if (runDbId) {
    await Promise.all([
      restPatch({
        table: 'simcity_runs',
        filters: { id: `eq.${runDbId}` },
        patch: {
          ended_at: new Date().toISOString(),
          result: 'PASS',
          pass: true,
          duration_seconds_actual: durationActual
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

  console.log(`PASS\nseed: ${seedStr}\nexecuted: ${executed}\nduration: ${durationActual}s`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
