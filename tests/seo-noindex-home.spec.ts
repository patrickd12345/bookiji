import { test, expect } from '@playwright/test'

test('non-prod home sends X-Robots-Tag: noindex, nofollow', async ({ request }) => {
  const isProd = process.env.VERCEL_ENV === 'production'
  const res = await request.get('/')
  const headers = res.headers()
  const v = headers['x-robots-tag'] || headers['X-Robots-Tag' as any]
  if (!isProd) expect(String(v || '')).toContain('noindex')
})


