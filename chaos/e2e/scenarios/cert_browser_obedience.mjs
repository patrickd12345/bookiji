import { withBrowser } from '../browserHarness.mjs'

export async function certBrowserObedience({ baseUrl, seed }) {
  await withBrowser(seed, async ({ page }) => {
    await page.goto(`${baseUrl}/e2e/cert`)

    await page.click('[data-test=increment]')
    await page.waitForSelector('[data-test=value][data-value="1"]')

    await page.reload()
    await page.waitForSelector('[data-test=value][data-value="1"]')
  })
}

