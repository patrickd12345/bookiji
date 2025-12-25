import { chromium } from 'playwright'

let browser = null
let page = null
let browserContext = null
let baseUrl = null

/**
 * Playwright transport - executes requests via browser automation
 * Fire-and-forget, no return values, idempotency via intentId
 * 
 * Requires SIMCITY_E2E_BASE_URL environment variable
 */
async function ensureBrowser() {
  if (browser && page) return

  baseUrl = process.env.SIMCITY_E2E_BASE_URL
  if (!baseUrl) {
    throw new Error('SIMCITY_E2E_BASE_URL is required for Playwright transport')
  }

  browser = await chromium.launch({ headless: true })
  browserContext = await browser.newContext()
  page = await browserContext.newPage()

  await page.goto(baseUrl)
}

/**
 * Execute a request via Playwright
 * 
 * @param {Object} params
 * @param {string} params.intentId - Idempotency key (not used in Playwright, but kept for interface consistency)
 * @param {string} params.endpoint - UI action endpoint (e.g., "ui/login", "ui/book_slot")
 * @param {Object} params.payload - Action parameters
 * @param {Object} params.context - Execution context (not used in Playwright)
 */
export async function execute({ intentId, endpoint, payload }) {
  await ensureBrowser()

  // Convention: endpoint maps to a UI action
  // Example: "ui/login", "ui/book_slot", etc.
  switch (endpoint) {
    case 'ui/login': {
      await page.fill('[data-test="email"]', payload.email)
      await page.fill('[data-test="password"]', payload.password)
      await page.click('[data-test="login"]')
      break
    }

    case 'ui/book_slot': {
      await page.click(`[data-slot-id="${payload.slot_id}"]`)
      await page.click('[data-test="confirm-booking"]')
      break
    }

    case 'ui/click': {
      await page.click(payload.selector)
      break
    }

    case 'ui/fill': {
      await page.fill(payload.selector, payload.value)
      break
    }

    case 'ui/navigate': {
      await page.goto(payload.url)
      break
    }

    default:
      throw new Error(`Playwright transport does not support endpoint: ${endpoint}`)
  }
}

/**
 * Reload the current page
 * Simulates a browser refresh
 */
export async function reloadPage() {
  if (!page) return
  try {
    await page.reload()
  } catch (err) {
    // Ignore errors - page might not be loaded yet
  }
}

/**
 * Restart browser context
 * Closes current context and creates a new one
 * Simulates a full browser restart
 */
export async function restartContext() {
  if (!browser) return
  
  try {
    // Close current context
    if (browserContext) {
      await browserContext.close()
    }
    
    // Create new context and page
    browserContext = await browser.newContext()
    page = await browserContext.newPage()
    
    // Navigate to base URL
    if (baseUrl) {
      await page.goto(baseUrl)
    }
  } catch (err) {
    // If restart fails, reset state so ensureBrowser will recreate
    browserContext = null
    page = null
  }
}

/**
 * Check if Playwright transport is active
 * Returns true if browser is initialized
 */
export function isActive() {
  return browser !== null && page !== null
}

/**
 * Shutdown browser instance
 * Call this when done with Playwright transport
 */
export async function shutdown() {
  if (browser) {
    await browser.close()
    browser = null
    browserContext = null
    page = null
    baseUrl = null
  }
}

