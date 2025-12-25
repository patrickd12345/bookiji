import { fetchJson } from '../utils.mjs'

/**
 * HTTP transport - executes requests via HTTP/REST API
 * Fire-and-forget, no return values, idempotency via intentId
 */
export async function execute({ intentId, endpoint, payload, context }) {
  const { restBase, supabaseHeaders, targetUrl } = context
  
  // Determine if this is a REST API or Supabase RPC call
  let url
  if (endpoint.startsWith('/rpc/')) {
    url = `${restBase}${endpoint}`
  } else if (endpoint.startsWith('/api/')) {
    url = `${targetUrl}${endpoint}`
  } else if (endpoint.startsWith('http')) {
    url = endpoint
  } else {
    url = `${restBase}/${endpoint}`
  }

  // Fire and forget - don't await, don't throw
  fetchJson(url, {
    method: 'POST',
    headers: supabaseHeaders,
    body: payload
  }).catch(() => {
    // Ignore errors - fire and forget
  })
}

