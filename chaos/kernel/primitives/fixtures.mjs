import { stableUuid, fetchJson } from '../utils.mjs'

export async function createFixture(type, spec, config) {
  const { restBase, supabaseHeaders, supabaseUrl, seedStr } = config

  if (type === 'auth_user') {
    return await createAuthUser(spec, supabaseUrl, supabaseHeaders)
  } else if (type === 'profile') {
    return await createProfile(spec, restBase, supabaseHeaders)
  } else if (type === 'service') {
    return await createService(spec, restBase, supabaseHeaders)
  } else if (type === 'slot') {
    return await createSlot(spec, restBase, supabaseHeaders)
  } else if (type === 'booking') {
    return await createBooking(spec, restBase, supabaseHeaders)
  } else {
    throw new Error(`Unknown fixture type: ${type}`)
  }
}

async function createAuthUser(spec, supabaseUrl, supabaseHeaders) {
  const { email, fullName, role } = spec
  
  // Try to find existing user first (search more pages)
  let page = 1
  let foundUser = null
  while (page <= 20) { // Search more pages
    const listRes = await fetchJson(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=1000`, {
      method: 'GET',
      headers: supabaseHeaders
    })

    if (listRes.ok && Array.isArray(listRes.json?.users)) {
      foundUser = listRes.json.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
      if (foundUser) break
      // If we got fewer users than requested, we've reached the end
      if (listRes.json.users.length < 1000) break
    } else {
      break
    }
    page++
  }

  if (foundUser) {
    return { id: foundUser.id, type: 'auth_user', data: foundUser }
  }

  // Create new user
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
    if (userId) return { id: userId, type: 'auth_user', data: createRes.json || createRes.json?.user }
  }

  // If creation failed (e.g., user exists), try one more search
  if (!createRes.ok && createRes.status === 422) {
    // User might have been created between searches, try again
    const finalListRes = await fetchJson(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
      method: 'GET',
      headers: supabaseHeaders
    })

    if (finalListRes.ok && Array.isArray(finalListRes.json?.users)) {
      const existing = finalListRes.json.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
      if (existing) return { id: existing.id, type: 'auth_user', data: existing }
    }
  }

  throw new Error(`Failed to create or find auth user for ${email}: ${createRes.text}`)
}

async function createProfile(spec, restBase, supabaseHeaders) {
  const res = await fetchJson(`${restBase}/profiles`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: spec
  })

  if (!res.ok && res.status !== 409) {
    throw new Error(`Failed to create profile: ${res.text}`)
  }

  // Get the created profile data - merge spec with response to ensure all fields are present
  const responseData = Array.isArray(res.json) ? res.json[0] : res.json
  const data = responseData ? { ...spec, ...responseData } : spec
  return { id: spec.id, type: 'profile', data }
}

async function createService(spec, restBase, supabaseHeaders) {
  const res = await fetchJson(`${restBase}/services`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: spec
  })

  if (!res.ok && res.status !== 409) {
    throw new Error(`Failed to create service: ${res.text}`)
  }

  // Get the created service data - merge spec with response to ensure all fields are present
  const responseData = Array.isArray(res.json) ? res.json[0] : res.json
  const data = responseData ? { ...spec, ...responseData } : spec
  return { id: spec.id, type: 'service', data }
}

async function createSlot(spec, restBase, supabaseHeaders) {
  const res = await fetchJson(`${restBase}/availability_slots`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: spec
  })

  if (!res.ok && res.status !== 409) {
    throw new Error(`Failed to create slot: ${res.text}`)
  }

  // Get the created slot data - merge spec with response to ensure all fields are present
  const responseData = Array.isArray(res.json) ? res.json[0] : res.json
  const data = responseData ? { ...spec, ...responseData } : spec
  return { id: spec.id, type: 'slot', data }
}

async function createBooking(spec, restBase, supabaseHeaders) {
  const res = await fetchJson(`${restBase}/bookings`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: spec
  })

  if (!res.ok && res.status !== 409) {
    throw new Error(`Failed to create booking: ${res.text}`)
  }

  // Get the created booking data - merge spec with response to ensure all fields are present
  const responseData = Array.isArray(res.json) ? res.json[0] : res.json
  const data = responseData ? { ...spec, ...responseData } : spec
  return { id: spec.id, type: 'booking', data }
}

