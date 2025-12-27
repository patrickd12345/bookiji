const DEFAULT_TIME_ENDPOINT = '/api/system/time'

function coerceToNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export class Timebase {
  constructor({ targetUrl, timeEndpoint = DEFAULT_TIME_ENDPOINT, timeoutMs = 6000 } = {}) {
    if (!targetUrl) throw new Error('Timebase requires targetUrl')
    this.targetUrl = targetUrl.replace(/\/+$/, '')
    this.timeEndpoint = timeEndpoint
    this.timeoutMs = timeoutMs
    this.serverTimeOffsetMs = 0
    this.lastTimestamp = 0
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) return this
    const url = new URL(this.timeEndpoint, this.targetUrl).toString()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      })
      if (!response.ok) {
        throw new Error(`Timebase initialization failed: ${response.status} ${response.statusText}`)
      }
      const payload = await response.json().catch(() => null)
      const serverNow =
        coerceToNumber(payload?.server_now) ??
        coerceToNumber(payload?.serverNow) ??
        coerceToNumber(payload?.server_time) ??
        coerceToNumber(payload?.serverTime) ??
        coerceToNumber(payload?.now) ??
        coerceToNumber(payload?.timestamp)
      if (serverNow === null) {
        throw new Error('Timebase initialization failed: response missing numeric server_now')
      }
      this.serverTimeOffsetMs = serverNow - Date.now()
      this.lastTimestamp = serverNow
      this.initialized = true
      return this
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      throw new Error(`Timebase initialization failed: ${err.message}`)
    } finally {
      clearTimeout(timer)
    }
  }

  ensureInitialized() {
    if (!this.initialized) throw new Error('Timebase not initialized')
  }

  nowMs() {
    this.ensureInitialized()
    const candidate = Date.now() + this.serverTimeOffsetMs
    if (candidate < this.lastTimestamp) {
      throw new Error(
        `Time regression detected: ${candidate}ms < last recorded ${this.lastTimestamp}ms`
      )
    }
    this.lastTimestamp = candidate
    return candidate
  }

  elapsedSince(referenceMs) {
    return this.nowMs() - referenceMs
  }

  toISOString(ms = this.lastTimestamp) {
    return new Date(ms).toISOString()
  }

  getDiagnostics() {
    return {
      server_time_offset: this.serverTimeOffsetMs,
      last_timestamp: this.lastTimestamp
    }
  }
}
