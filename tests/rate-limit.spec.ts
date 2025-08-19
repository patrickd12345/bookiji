import { test, expect } from '@playwright/test'

const PATH = '/api/payments/create-payment-intent'

// hammer burst; set to just over your configured limit
const BURST = parseInt(process.env.RLH_BURST || '15', 10)

test('rate limiter triggers 429 after threshold', async ({ request }) => {
  const results = await Promise.allSettled(
    [...Array(BURST)].map((_, i) =>
      request.post(PATH, {
        data: {
          amount_cents: 100, // $1.00
          currency: 'usd',
          testTrace: `rlh-${Date.now()}-${i}`,
        },
      })
    )
  )

  const codes = await Promise.all(results.map(async r => {
    if (r.status === 'fulfilled') return r.value.status()
    return 0
  }))

  // at least one should be 429 when limiter bites
  expect(codes.some(c => c === 429)).toBeTruthy()

  // and most should be either 200/201 or 429, nothing bizarre
  for (const c of codes) {
    expect([200, 201, 429].includes(c)).toBeTruthy()
  }
})


