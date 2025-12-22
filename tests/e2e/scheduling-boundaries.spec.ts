import { test, expect } from '../fixtures/base'

const EXPECTATION_TEXT = 'Arrive 10 minutes early'

const customerForbidden = [
  /\bpayment\b/i,
  /\bpricing\b/i,
  /\bcheckout\b/i,
  /\brefund/i,
  /\bpenalt/i,
  /\bno-show\b/i,
  /\bfee\b/i,
  /\bprice\b/i,
]

const vendorForbidden = [
  /\bpayment\b/i,
  /\bfee\b/i,
  /\bpenalt/i,
  /\bno-show\b/i,
]

const marketplaceTerms = [
  /\bmarketplace\b/i,
  /\bdiscover/i,
  /\branking/i,
  /\bother providers\b/i,
  /\bcompare\b/i,
]

async function assertNoTerms(text: string, terms: RegExp[]) {
  for (const term of terms) {
    expect(text, `Forbidden term matched: ${term}`).not.toMatch(term)
  }
}

test('booking surface stays scheduling-only and vendor-first', async ({ page, request }) => {
  const seed = await request.post('/api/test/seed')
  expect(seed.ok()).toBeTruthy()
  const { vendorId } = await seed.json()

  await page.goto(`/book/${vendorId}`)
  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toContainText(/Book with/i)
  await expect(heading).toContainText('Test Vendor')
  await expect(heading).not.toContainText(/Bookiji/i)

  await expect(page.getByText(EXPECTATION_TEXT)).toBeVisible()

  const bodyText = await page.locator('body').innerText()
  await assertNoTerms(bodyText, customerForbidden)
  await assertNoTerms(bodyText, marketplaceTerms)
})

test('vendor booking surfaces avoid payment or penalty language', async ({ page }) => {
  await page.goto('/vendor/dashboard')
  await expect(page.getByText('Loading dashboard...')).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Provider Dashboard' })).toBeVisible({ timeout: 15_000 })

  const bodyText = await page.locator('body').innerText()
  await assertNoTerms(bodyText, vendorForbidden)
})
