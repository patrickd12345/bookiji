import { headers as nextHeaders } from 'next/headers'

const SYNTHETIC_HEADER = 'X-Bookiji-Synthetic'
const SYNTHETIC_TRACE_HEADER = 'X-Bookiji-Synthetic-Trace'
const SYNTHETIC_SOURCE = 'simcity'

export interface SyntheticRequestContext {
  readonly synthetic: true
  readonly source: typeof SYNTHETIC_SOURCE
  readonly trace?: string
}

export function detectSyntheticContext(source?: Headers | (() => Headers)): SyntheticRequestContext | undefined {
  let headerBag: Headers | undefined

  if (source instanceof Headers) {
    headerBag = source
  } else if (typeof source === 'function') {
    try {
      headerBag = source()
    } catch {
      headerBag = undefined
    }
  } else {
    try {
      headerBag = nextHeaders()
    } catch {
      headerBag = undefined
    }
  }

  if (!headerBag) return undefined

  const syntheticHeader = headerBag.get(SYNTHETIC_HEADER)
  const trace = headerBag.get(SYNTHETIC_TRACE_HEADER) ?? undefined

  if (syntheticHeader !== SYNTHETIC_SOURCE) return undefined

  return { synthetic: true, source: SYNTHETIC_SOURCE, trace }
}

export function applySyntheticTags<T extends Record<string, unknown>>(
  payload: T,
  context?: SyntheticRequestContext,
): T {
  if (!context?.synthetic) return payload

  return {
    ...payload,
    synthetic_source: SYNTHETIC_SOURCE,
    synthetic_trace: context.trace,
  }
}

export function tagSyntheticBody(body: unknown, context?: SyntheticRequestContext): unknown {
  if (!context?.synthetic) return body

  if (Array.isArray(body)) {
    return body.map((record) => (typeof record === 'object' && record ? applySyntheticTags(record as any, context) : record))
  }

  if (typeof body === 'object' && body !== null) {
    return applySyntheticTags(body as Record<string, unknown>, context)
  }

  return body
}

// @feature simcity.synthetic_headers
export function buildSyntheticAwareFetch(context?: SyntheticRequestContext) {
  if (!context?.synthetic) return undefined

  return async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const method = (init.method || 'GET').toUpperCase()
    let nextInit = { ...init }

    if (['POST', 'PUT', 'PATCH'].includes(method) && typeof init.body === 'string') {
      try {
        const parsed = JSON.parse(init.body)
        const tagged = tagSyntheticBody(parsed, context)
        nextInit = { ...nextInit, body: JSON.stringify(tagged) }
      } catch {
        // If parsing fails, fall back to the original payload
      }
    }

    const headers = new Headers(nextInit.headers)
    headers.set(SYNTHETIC_HEADER, SYNTHETIC_SOURCE)
    if (context.trace) {
      headers.set(SYNTHETIC_TRACE_HEADER, context.trace)
    }

    return fetch(input, { ...nextInit, headers })
  }
}

export { SYNTHETIC_HEADER, SYNTHETIC_TRACE_HEADER, SYNTHETIC_SOURCE }
