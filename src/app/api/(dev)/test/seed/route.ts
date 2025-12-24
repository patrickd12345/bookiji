import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import crypto from 'node:crypto'

function stableUuid(seed: string) {
  const hex = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  if (process.env.E2E !== 'true') return NextResponse.json({ error: 'E2E=true is required for /api/test/seed' }, { status: 403 })

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey?: string }
  if (!url || !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url)) {
    return NextResponse.json({ error: `Refusing to seed non-local Supabase: ${url ?? '(missing)'}` }, { status: 400 })
  }
  if (!secretKey) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY for E2E seeding' }, { status: 500 })
  }

  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    try {
      const health = await fetch(`${url}/auth/v1/health`)
      if (!health.ok) {
        return NextResponse.json(
          { error: 'Supabase auth not reachable at http://localhost:54321 (run `pnpm supabase:start`)' },
          { status: 500 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Supabase not reachable at http://localhost:54321 (run `pnpm supabase:start`)' },
        { status: 500 }
      )
    }

    // Fail fast with a clear error if local schema/compat wasn't applied.
    {
      const usersCheck = await admin.from('users').select('id').limit(1)
      if (usersCheck.error) {
        return NextResponse.json({ error: `Schema not ready (public.users missing?): ${usersCheck.error.message}` }, { status: 500 })
      }
      const servicesCheck = await admin.from('services').select('id,vendor_id').limit(1)
      if (servicesCheck.error) {
        return NextResponse.json({ error: `Schema not ready (services.vendor_id missing?): ${servicesCheck.error.message}` }, { status: 500 })
      }
      const bookingsCheck = await admin.from('bookings').select('id,slot_start,slot_end,total_amount_cents').limit(1)
      if (bookingsCheck.error) {
        return NextResponse.json({ error: `Schema not ready (booking slot_* columns missing?): ${bookingsCheck.error.message}` }, { status: 500 })
      }
    }

    const vendorEmail = 'vendor@test.dev'
    const customerEmail = 'customer@test.dev'
    const expectationText = 'Arrive 10 minutes early'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = await request.json().catch(() => ({} as any))
    const seedIdRaw = typeof body?.seedId === 'string' ? body.seedId : typeof body?.runId === 'string' ? body.runId : 'default'
    const seedId = seedIdRaw && seedIdRaw.length > 0 ? seedIdRaw : 'default'

    async function ensureAuthUser(email: string, fullName: string, role: 'vendor' | 'customer') {
      const password = 'test-password-1234'
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
      })

      if (created.data.user) return created.data.user

      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 2000 })
      const existing = (list.data?.users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase())
      if (!existing) throw new Error(created.error?.message ?? `Failed to create or find auth user for ${email}`)
      return existing
    }

    const vendorAuth = await ensureAuthUser(vendorEmail, 'Test Vendor', 'vendor')
    const customerAuth = await ensureAuthUser(customerEmail, 'Test Customer', 'customer')

    const vendorId = vendorAuth.id
    const customerId = customerAuth.id

    // Idempotent: safe to run repeatedly (upserts by primary key).
    await admin.from('users').upsert({ id: vendorId, email: vendorEmail, role: 'vendor', full_name: 'Test Vendor' }, { onConflict: 'id' })
    await admin.from('users').upsert({ id: customerId, email: customerEmail, role: 'customer', full_name: 'Test Customer' }, { onConflict: 'id' })

    const serviceId = '8b3a1cf5-3e2d-4e86-aed9-50f2d9b2b4a1'
    const { error: serviceErr } = await admin.from('services').upsert(
      {
        id: serviceId,
        vendor_id: vendorId,
        name: 'Test Service',
        description: expectationText,
        category: 'test',
        duration_minutes: 60,
        is_active: true,
        price_cents: 0,
      },
      { onConflict: 'id' }
    )
    if (serviceErr) return NextResponse.json({ error: `Service upsert failed: ${serviceErr.message}` }, { status: 500 })

    const start = new Date(Date.now() + 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)

    const slotId =
      seedId === 'default'
        ? '4f7f7d2a-7d7e-4c7f-a8ff-1a8c72a0c6c2'
        : stableUuid(`slot:${seedId}`)
    const { error: slotErr } = await admin.from('availability_slots').upsert(
      {
        id: slotId,
        vendor_id: vendorId,
        service_id: serviceId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_booked: false,
      },
      { onConflict: 'id' }
    )
    if (slotErr) return NextResponse.json({ error: `Slot upsert failed: ${slotErr.message}` }, { status: 500 })

    const bookingId =
      seedId === 'default'
        ? '54d4a6d0-2b07-42bb-9b8c-5e5be4f1e6a7'
        : stableUuid(`booking:${seedId}`)
    const { error: bookingErr } = await admin.from('bookings').upsert(
      {
        id: bookingId,
        customer_id: customerId,
        vendor_id: vendorId,
        service_id: serviceId,
        slot_id: slotId,
        slot_start: start.toISOString(),
        slot_end: end.toISOString(),
        status: 'pending',
        total_amount_cents: 0,
      },
      { onConflict: 'id' }
    )
    if (bookingErr) return NextResponse.json({ error: `Booking upsert failed: ${bookingErr.message}` }, { status: 500 })

    return NextResponse.json({ vendorId, customerId, serviceId, slotId, bookingId, expectationText, seedId })
  } catch (error) {
    console.error('Test seed error:', error)
    return NextResponse.json(
      { error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
