import { fetchJson } from '../utils.mjs'

export async function sendRequest(intentId, endpoint, payload, config) {
  const { restBase, supabaseHeaders, targetUrl } = config
  
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

