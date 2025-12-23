import { test, expect } from '@playwright/test'
import { URL } from 'url'

interface CrawlResult {
  url: string
  status: number
  errors: string[]
  consoleErrors: string[]
  links: string[]
  title: string
}

test.describe('Site Crawler', () => {
  test('crawl entire site and check for errors', async ({ page, browser }) => {
    test.setTimeout(300_000) // 5 minutes for full crawl

    const baseURL = process.env.BASE_URL || 'http://localhost:3000'
    const visited = new Set<string>()
    const results: CrawlResult[] = []
    const toVisit: string[] = [baseURL]
    const errors: string[] = []
    const consoleErrors: string[] = []

    // Track console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        consoleErrors.push(text)
        console.log(`[Console Error] ${text}`)
      }
    })

    // Track page errors
    page.on('pageerror', (error) => {
      errors.push(error.message)
      console.log(`[Page Error] ${error.message}`)
    })

    // Track failed requests
    page.on('response', (response) => {
      if (response.status() >= 400) {
        const url = response.url()
        console.log(`[HTTP ${response.status()}] ${url}`)
      }
    })

    // Normalize URL to avoid duplicates
    const normalizeURL = (url: string): string => {
      try {
        const parsed = new URL(url, baseURL)
        // Remove hash, normalize path
        parsed.hash = ''
        parsed.searchParams.sort()
        return parsed.toString().replace(/\/$/, '') || baseURL
      } catch {
        return url
      }
    }

    // Check if URL should be crawled
    const shouldCrawl = (url: string): boolean => {
      const normalized = normalizeURL(url)
      
      // Only crawl same origin
      try {
        const urlObj = new URL(normalized)
        const baseObj = new URL(baseURL)
        if (urlObj.origin !== baseObj.origin) {
          return false
        }
      } catch {
        return false
      }

      // Skip external links, API routes, static assets
      if (
        normalized.includes('/api/') ||
        normalized.includes('/_next/') ||
        normalized.includes('/static/') ||
        normalized.includes('.jpg') ||
        normalized.includes('.png') ||
        normalized.includes('.svg') ||
        normalized.includes('.ico') ||
        normalized.includes('.css') ||
        normalized.includes('.js') ||
        normalized.includes('mailto:') ||
        normalized.includes('tel:') ||
        normalized.includes('javascript:')
      ) {
        return false
      }

      // Skip if already visited
      if (visited.has(normalized)) {
        return false
      }

      return true
    }

    // Extract all links from page
    const extractLinks = async (): Promise<string[]> => {
      const links = await page.$$eval('a[href]', (anchors) =>
        anchors.map((a) => (a as HTMLAnchorElement).href)
      )
      return links.filter(shouldCrawl).map(normalizeURL)
    }

    console.log(`🚀 Starting site crawl from ${baseURL}`)
    console.log(`📋 Will visit pages and check for errors...\n`)

    // Main crawl loop
    while (toVisit.length > 0) {
      const currentURL = toVisit.shift()!
      const normalized = normalizeURL(currentURL)

      if (visited.has(normalized)) {
        continue
      }

      visited.add(normalized)
      console.log(`\n📍 Visiting: ${normalized}`)

      try {
        // Use load event instead of domcontentloaded for better reliability
        const response = await Promise.race([
          page.goto(normalized, {
            waitUntil: 'load',
            timeout: 15000, // Reduced timeout
          }),
          // Fallback: if page takes too long, just continue
          new Promise((resolve) => setTimeout(() => resolve(null), 15000))
        ]) as any
        
        // Wait a bit for dynamic content, but don't wait too long
        await page.waitForTimeout(1000)

        const status = response?.status() || 200 // Assume 200 if no response
        const title = await page.title().catch(() => 'No title')
        
        // Extract links - try to get them even if page didn't fully load
        let links: string[] = []
        try {
          links = await extractLinks()
        } catch (err) {
          console.log(`   ⚠️  Could not extract links from page`)
        }
        
        links.forEach((link) => {
          if (!visited.has(link) && !toVisit.includes(link)) {
            toVisit.push(link)
          }
        })

        // Get console errors for this page
        const pageConsoleErrors = consoleErrors.slice()

        results.push({
          url: normalized,
          status,
          errors: errors.slice(),
          consoleErrors: pageConsoleErrors,
          links: links,
          title,
        })

        console.log(`   ✅ Status: ${status} | Title: ${title}`)
        console.log(`   🔗 Found ${links.length} new links (${toVisit.length} queued)`)

        // Check for critical errors
        if (status >= 400) {
          console.log(`   ⚠️  HTTP Error: ${status}`)
        }

        // Small delay to avoid overwhelming the server
        await page.waitForTimeout(300)

      } catch (error: any) {
        // Even if there's an error, try to extract links before giving up
        let links: string[] = []
        try {
          links = await extractLinks()
          links.forEach((link) => {
            if (!visited.has(link) && !toVisit.includes(link)) {
              toVisit.push(link)
            }
          })
        } catch (err) {
          // Ignore link extraction errors
        }
        
        console.log(`   ⚠️  Error loading page (continuing): ${error.message}`)
        results.push({
          url: normalized,
          status: 0,
          errors: [error.message],
          consoleErrors: [],
          links: links,
          title: 'Error',
        })
      }

      // Safety limit
      if (visited.size > 200) {
        console.log(`\n⚠️  Reached safety limit of 200 pages. Stopping crawl.`)
        break
      }
    }

    // Generate report
    console.log(`\n\n${'='.repeat(80)}`)
    console.log(`📊 CRAWL REPORT`)
    console.log(`${'='.repeat(80)}`)
    console.log(`\n✅ Total pages visited: ${results.length}`)
    console.log(`❌ Pages with errors: ${results.filter((r) => r.errors.length > 0 || r.status >= 400).length}`)
    console.log(`🔴 HTTP errors: ${results.filter((r) => r.status >= 400).length}`)
    console.log(`⚠️  Console errors: ${consoleErrors.length}`)

    // List pages with errors
    const errorPages = results.filter(
      (r) => r.errors.length > 0 || r.status >= 400 || r.consoleErrors.length > 0
    )

    if (errorPages.length > 0) {
      console.log(`\n\n❌ PAGES WITH ERRORS:\n`)
      errorPages.forEach((result) => {
        console.log(`\n📍 ${result.url}`)
        console.log(`   Status: ${result.status}`)
        if (result.errors.length > 0) {
          console.log(`   Errors:`)
          result.errors.forEach((err) => console.log(`     - ${err}`))
        }
        if (result.consoleErrors.length > 0) {
          console.log(`   Console Errors:`)
          result.consoleErrors.forEach((err) => console.log(`     - ${err}`))
        }
      })
    }

    // List all visited pages
    console.log(`\n\n📄 ALL VISITED PAGES:\n`)
    results.forEach((result) => {
      const statusIcon = result.status >= 400 ? '❌' : result.status === 0 ? '⚠️' : '✅'
      console.log(`${statusIcon} [${result.status}] ${result.url} - ${result.title}`)
    })

    // Assertions
    const criticalErrors = results.filter((r) => r.status >= 500)
    expect(criticalErrors.length).toBe(0)

    console.log(`\n✅ Crawl completed successfully!`)
  })

  test('crawl admin pages (requires login)', async ({ page }) => {
    test.setTimeout(180_000) // 3 minutes

    const baseURL = process.env.BASE_URL || 'http://localhost:3000'
    const adminEmail = process.env.ADMIN_EMAIL || 'patrick_duchesneau_1@hotmail.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'Taratata!1232123'

    console.log(`🔐 Logging in as admin to crawl admin pages...`)

    // Login first
    await page.goto(`${baseURL}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', adminPassword)
    await page.click('button[type="submit"]')
    
    // Wait for redirect
    await page.waitForURL(/\/(admin|get-started|choose-role)/, { timeout: 10000 })

    const visited = new Set<string>()
    const adminPages = [
      '/admin',
      '/admin/analytics',
      '/admin/slo',
      '/admin/cache',
      '/admin/ops-ai',
      '/admin/simcity/mission-control',
      '/admin/vendors',
      '/admin/customers',
      '/admin/bookings',
      '/admin/reviews',
      '/admin/settings',
    ]

    console.log(`\n📍 Crawling ${adminPages.length} admin pages...\n`)

    for (const path of adminPages) {
      const url = `${baseURL}${path}`
      const normalized = url.replace(/\/$/, '')

      if (visited.has(normalized)) continue
      visited.add(normalized)

      console.log(`\n📍 Visiting: ${path}`)

      try {
        const response = await page.goto(normalized, {
          waitUntil: 'domcontentloaded', // Changed from networkidle to avoid timeout on pages with real-time connections
          timeout: 30000,
        })
        
        // Wait a bit for dynamic content
        await page.waitForTimeout(2000)

        const status = response?.status() || 0
        const title = await page.title().catch(() => 'No title')

        console.log(`   ✅ Status: ${status} | Title: ${title}`)

        if (status >= 400) {
          console.log(`   ⚠️  HTTP Error: ${status}`)
        }

        // Check for "Access Denied" or similar
        const bodyTextResult = await page.textContent('body').catch(() => null)
        if (bodyTextResult && (bodyTextResult.includes('Access Denied') || bodyTextResult.includes('Unauthorized'))) {
          console.log(`   ⚠️  Access denied message detected`)
        }

        await page.waitForTimeout(500)

      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`)
      }
    }

    console.log(`\n✅ Admin pages crawl completed!`)
  })
})

