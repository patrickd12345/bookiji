import { fetchJson } from '../utils.mjs'

export async function queryState(query, config) {
  const { restBase, supabaseHeaders } = config

  if (query.type === 'slot') {
    // Resolve slot ID if it's a template variable
    const slotId = typeof query.id === 'string' && !query.id.includes('{{') ? query.id : query.id
    return await querySlot(slotId, restBase, supabaseHeaders)
  } else if (query.type === 'bookings') {
    return await queryBookings(query.filters || {}, restBase, supabaseHeaders)
  } else if (query.type === 'booking') {
    const bookingId = typeof query.id === 'string' && !query.id.includes('{{') ? query.id : query.id
    return await queryBooking(bookingId, restBase, supabaseHeaders)
  } else if (query.type === 'multi') {
    return await queryMulti(query.queries || {}, restBase, supabaseHeaders)
  } else {
    throw new Error(`Unknown query type: ${query.type}`)
  }
}

async function querySlot(slotId, restBase, supabaseHeaders) {
  // Handle both UUID and template variable
  const actualSlotId = slotId && typeof slotId === 'string' ? slotId : (slotId?.id || slotId)
  if (!actualSlotId) return null
  
  const res = await fetchJson(`${restBase}/availability_slots?id=eq.${actualSlotId}`, {
    method: 'GET',
    headers: supabaseHeaders
  })

  if (!res.ok) {
    throw new Error(`Failed to query slot: ${res.text}`)
  }

  const slots = Array.isArray(res.json) ? res.json : []
  return slots[0] || null
}

async function queryBooking(bookingId, restBase, supabaseHeaders) {
  const res = await fetchJson(`${restBase}/bookings?id=eq.${bookingId}`, {
    method: 'GET',
    headers: supabaseHeaders
  })

  if (!res.ok) {
    throw new Error(`Failed to query booking: ${res.text}`)
  }

  const bookings = Array.isArray(res.json) ? res.json : []
  return bookings[0] || null
}

async function queryBookings(filters, restBase, supabaseHeaders) {
  // Build query string from filters manually (to avoid double-encoding timestamps)
  const parts = []
  if (filters.provider_id) parts.push(`provider_id=eq.${filters.provider_id}`)
  if (filters.start_time) {
    // Supabase expects ISO timestamps, encode only the colon and other special chars
    const startTime = filters.start_time.replace(/:/g, '%3A').replace(/\+/g, '%2B')
    parts.push(`start_time=eq.${startTime}`)
  }
  if (filters.end_time) {
    const endTime = filters.end_time.replace(/:/g, '%3A').replace(/\+/g, '%2B')
    parts.push(`end_time=eq.${endTime}`)
  }
  if (filters.status) parts.push(`status=eq.${filters.status}`)
  if (filters.slot_id) {
    // Bookings don't have slot_id, so we need to query by time range
    // This is handled by the caller providing start_time/end_time
  }

  const queryString = parts.join('&')
  const res = await fetchJson(`${restBase}/bookings?${queryString}`, {
    method: 'GET',
    headers: supabaseHeaders
  })

  if (!res.ok) {
    throw new Error(`Failed to query bookings: ${res.text}`)
  }

  let bookings = Array.isArray(res.json) ? res.json : []
  
  // Filter by status if needed (for non-cancelled)
  if (filters.exclude_status) {
    const exclude = Array.isArray(filters.exclude_status) ? filters.exclude_status : [filters.exclude_status]
    bookings = bookings.filter(b => b.status && !exclude.includes(b.status))
  }

  return bookings
}

async function queryMulti(queries, restBase, supabaseHeaders) {
  const results = {}
  for (const [key, query] of Object.entries(queries)) {
    results[key] = await queryState(query, { restBase, supabaseHeaders })
  }
  return results
}

