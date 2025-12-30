import { test, expect } from '../fixtures/base'
import { getSupabaseAdmin } from './helpers/supabaseAdmin'

test.skip(process.env.E2E_SCHEDULING_EXTENDED !== 'true', 'Extended scheduling canary is opt-in (set E2E_SCHEDULING_EXTENDED=true).')

test('scheduling canary: seed creates a booking that can be fetched', async ({ request }) => {
  const seed = await request.post('/api/test/seed')
  expect(seed.ok()).toBeTruthy()
  const { bookingId } = await seed.json()

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('bookings').select('id,slot_start').eq('id', bookingId).single()
  expect(error?.message ?? null).toBeNull()
  expect(data?.id).toBe(bookingId)
  expect((data as any).slot_start).toMatch(/(Z|[+-]\d\d:\d\d)$/)
})
