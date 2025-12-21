import crypto from 'node:crypto'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && (value as any).constructor === Object
}

export function stableStringify(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort()
    const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    return `{${entries.join(',')}}`
  }

  // Fallback for Dates, class instances, etc. — stringify via JSON rules (but stable key order isn't guaranteed).
  // We avoid throwing to keep event ID generation fail-closed but predictable.
  return JSON.stringify(value) ?? 'null'
}

export function stableHash(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex')
}

export function makeEventId(args: {
  seed: number
  tick: number
  domain: string
  type: string
  payload: unknown
}): string {
  const stablePayload = stableStringify(args.payload)
  return stableHash(`${args.seed}:${args.tick}:${args.domain}:${args.type}:${stablePayload}`)
}

