import { chromium } from 'playwright'

export async function withBrowser(seed, fn) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await fn({ page, seed })
  } finally {
    await browser.close()
  }
}

