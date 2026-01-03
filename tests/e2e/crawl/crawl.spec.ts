import { test as baseTest, expect } from '../../fixtures/base'
import type { Page, ConsoleMessage, Response } from '@playwright/test'
import { loginAsRole } from './helpers/loginHelper'
import { URL } from 'url'
import * as fs from 'fs'
import * as path from 'path'

// Environment configuration
// Recommended defaults:
// - Depth 2: Covers most user-accessible pages (homepage → category → detail pages)
// - 200 pages: Safety limit to prevent runaway crawls
// 
// For different scenarios:
// - CI/CD: Depth 2, 200 pages (fast, catches most issues)
// - Pre-release: Depth 3, 500 pages (thorough verification)
// - Local dev: Depth 1, 50 pages (quick smoke test)
// - Full crawl: Depth -1, Pages 0 (unlimited - use with caution)

const CRAWL_MAX_PAGES = process.env.CRAWL_MAX_PAGES 
  ? parseInt(process.env.CRAWL_MAX_PAGES, 10) 
  : 200 // Default safety limit

// Depth limit: how many link hops from seed URLs
// 0 = only seeds, 1 = seeds + direct links, 2 = up to 2 hops, etc.
// Set to -1 for unlimited depth
const CRAWL_MAX_DEPTH = process.env.CRAWL_MAX_DEPTH 
  ? parseInt(process.env.CRAWL_MAX_DEPTH, 10) 
  : 2 // Default: depth 2 (covers most user-accessible pages)
const CRAWL_PAGE_TIMEOUT_MS = parseInt(process.env.CRAWL_PAGE_TIMEOUT_MS || '15000', 10)
const CRAWL_SEEDS = process.env.CRAWL_SEEDS
  ? process.env.CRAWL_SEEDS.split(',').map(s => s.trim()).filter(Boolean)
  : ['/']
const CRAWL_ROLE = process.env.CRAWL_ROLE as 'admin' | 'vendor' | 'customer' | undefined
const CRAWL_CONCURRENCY = parseInt(process.env.CRAWL_CONCURRENCY || '1', 10)
const CRAWL_REDIRECT_THRESHOLD = parseInt(process.env.CRAWL_REDIRECT_THRESHOLD || '10', 10)
// Resume/checkpoint: load visited URLs from a previous crawl to continue from where it left off
const CRAWL_RESUME_FROM = process.env.CRAWL_RESUME_FROM // Path to JSON file with previous crawl state
const CRAWL_SAVE_CHECKPOINT = process.env.CRAWL_SAVE_CHECKPOINT !== 'false' // Save checkpoint after crawl (default: true)

// Artifact directory
const ARTIFACT_DIR = path.join(process.cwd(), 'test-results', 'crawl')

// Ensure artifact directory exists
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
}

// Checkpoint file path
const CHECKPOINT_FILE = path.join(ARTIFACT_DIR, 'crawl-checkpoint.json')

// Checkpoint state interface
interface CrawlCheckpoint {
  visited: string[]
  urlDepths: Record<string, number>
  timestamp: string
  totalPages: number
  seeds: string[]
  role?: string
}

// Types
interface PageIncident {
  type: 'pageerror' | 'console.error' | 'http.4xx' | 'http.5xx' | '404' | 'redirect.loop' | 'redirect.excessive'
  message: string
  url?: string
  status?: number
}

interface VisitedPage {
  url: string
  status: number
  title: string
  incidents: PageIncident[]
  redirectChain: string[]
  duration: number
  linksFound: number
  screenshotPath?: string
  htmlPath?: string
}

interface CrawlReport {
  summary: {
    totalPages: number
    totalIncidents: number
    pagesWithIncidents: number
    startTime: string
    endTime: string
    duration: number
    maxPages: number | 'unlimited'
    maxDepth: number | 'unlimited'
    pageTimeout: number
    role?: string
  }
  pages: VisitedPage[]
  incidentsByType: Record<string, number>
}

// URL normalization
function normalizeURL(url: string, baseURL: string): string {
  try {
    const parsed = new URL(url, baseURL)
    // Remove hash
    parsed.hash = ''
    // Sort query params for consistency
    parsed.searchParams.sort()
    // Remove trailing slash (except for root)
    const pathname = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/$/, '')
    parsed.pathname = pathname
    return parsed.toString()
  } catch {
    return url
  }
}

// Sanitize URL for filesystem
function sanitizeURLForFilesystem(url: string): string {
  try {
    const parsed = new URL(url)
    let sanitized = parsed.pathname
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '_')
    if (parsed.search) {
      sanitized += parsed.search.replace(/[^a-zA-Z0-9-]/g, '_')
    }
    return sanitized || 'root'
  } catch {
    return url.replace(/[^a-zA-Z0-9-]/g, '_')
  }
}

// Check if URL should be crawled
function shouldCrawl(url: string, baseURL: string, visited: Set<string>): boolean {
  const normalized = normalizeURL(url, baseURL)
  
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

  // Skip excluded patterns
  if (
    normalized.includes('/_next/') ||
    normalized.includes('/api/') ||
    normalized.startsWith('mailto:') ||
    normalized.startsWith('tel:') ||
    normalized.startsWith('javascript:') ||
    normalized.includes('#') && normalized.split('#')[0] === baseURL
  ) {
    return false
  }

  // Skip if already visited
  if (visited.has(normalized)) {
    return false
  }

  return true
}

// Extract links from page
async function extractLinks(page: Page, baseURL: string, visited: Set<string>): Promise<string[]> {
  try {
    const links = await page.$$eval('a[href]', (anchors: HTMLAnchorElement[]) =>
      anchors.map((a: HTMLAnchorElement) => a.href)
    )
    return links
      .filter((link: string) => shouldCrawl(link, baseURL, visited))
      .map((link: string) => normalizeURL(link, baseURL))
  } catch (error) {
    console.warn(`Failed to extract links: ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

// Main crawl function
async function runCrawl(
  page: Page,
  baseURL: string,
  role?: 'admin' | 'vendor' | 'customer',
  auth?: ReturnType<typeof import('../helpers/auth').authHelper>
): Promise<CrawlReport> {
  const startTime = Date.now()
  const visited = new Set<string>()
  // Queue items include URL and depth
  const queue: Array<{ url: string; depth: number }> = []
  const urlToDepth = new Map<string, number>() // Track depth for each URL
  const pages: VisitedPage[] = []
  const incidentsByType: Record<string, number> = {}

  // Load checkpoint if specified
  let checkpointLoaded = false
  if (CRAWL_RESUME_FROM) {
    try {
      const checkpointPath = path.isAbsolute(CRAWL_RESUME_FROM) 
        ? CRAWL_RESUME_FROM 
        : path.join(process.cwd(), CRAWL_RESUME_FROM)
      
      if (fs.existsSync(checkpointPath)) {
        const checkpointData = fs.readFileSync(checkpointPath, 'utf-8')
        const checkpoint: CrawlCheckpoint = JSON.parse(checkpointData)
        
        // Restore visited URLs
        for (const url of checkpoint.visited) {
          visited.add(url)
        }
        
        // Restore depth mapping
        for (const [url, depth] of Object.entries(checkpoint.urlDepths)) {
          urlToDepth.set(url, depth)
        }
        
        console.log(`📂 Loaded checkpoint: ${checkpoint.visited.length} previously visited URLs`)
        console.log(`   Timestamp: ${checkpoint.timestamp}`)
        console.log(`   Previous crawl: ${checkpoint.totalPages} pages`)
        checkpointLoaded = true
      } else {
        console.warn(`⚠️  Checkpoint file not found: ${checkpointPath}, starting fresh`)
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load checkpoint: ${error instanceof Error ? error.message : String(error)}, starting fresh`)
    }
  }

  // Initialize queue with seed URLs at depth 0 (only if not already visited)
  for (const seed of CRAWL_SEEDS) {
    const normalized = normalizeURL(seed.startsWith('http') ? seed : `${baseURL}${seed}`, baseURL)
    if (!visited.has(normalized)) {
      queue.push({ url: normalized, depth: 0 })
      urlToDepth.set(normalized, 0)
    }
  }

  // Authenticate if role is specified
  if (role) {
    try {
      // Try to use auth fixture first
      if (auth) {
        if (role === 'admin') {
          await auth.loginAsAdmin()
        } else if (role === 'vendor') {
          await auth.loginAsVendor()
        } else if (role === 'customer') {
          await auth.loginAsCustomer()
        }
      } else {
        // Fallback to login helper
        await loginAsRole(page, role)
      }
      console.log(`✅ Authenticated as ${role}`)
    } catch (error) {
      console.warn(`⚠️  Authentication failed: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(`Cannot proceed with authenticated crawl: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log(`🚀 Starting crawl from ${CRAWL_SEEDS.length} seed URL(s)`)
  if (CRAWL_MAX_PAGES === 0) {
    console.log(`⚠️  WARNING: Unlimited page crawl enabled - this may take a very long time on large sites!`)
  }
  if (CRAWL_MAX_DEPTH === -1) {
    console.log(`📋 Max pages: ${CRAWL_MAX_PAGES === 0 ? 'unlimited' : CRAWL_MAX_PAGES}, Max depth: unlimited, Timeout: ${CRAWL_PAGE_TIMEOUT_MS}ms`)
  } else {
    console.log(`📋 Max pages: ${CRAWL_MAX_PAGES === 0 ? 'unlimited' : CRAWL_MAX_PAGES}, Max depth: ${CRAWL_MAX_DEPTH}, Timeout: ${CRAWL_PAGE_TIMEOUT_MS}ms`)
  }

  // Main crawl loop
  // If CRAWL_MAX_PAGES is 0, crawl unlimited; otherwise respect the limit
  // Also respect depth limit if set
  while (queue.length > 0 && (CRAWL_MAX_PAGES === 0 || visited.size < CRAWL_MAX_PAGES)) {
    const queueItem = queue.shift()!
    const currentURL = queueItem.url
    const currentDepth = queueItem.depth
    
    if (visited.has(currentURL)) {
      continue
    }

    // Check depth limit (if set)
    if (CRAWL_MAX_DEPTH !== -1 && currentDepth > CRAWL_MAX_DEPTH) {
      continue
    }

    visited.add(currentURL)
    const pageStartTime = Date.now()
    const pageCountDisplay = CRAWL_MAX_PAGES === 0 ? `${visited.size}` : `${visited.size}/${CRAWL_MAX_PAGES}`
    const depthDisplay = CRAWL_MAX_DEPTH === -1 ? '' : ` (depth ${currentDepth}${CRAWL_MAX_DEPTH !== -1 ? `/${CRAWL_MAX_DEPTH}` : ''})`
    console.log(`\n📍 [${pageCountDisplay}${depthDisplay}] Visiting: ${currentURL}`)

    const incidents: PageIncident[] = []
    const redirectChain: string[] = []
    let finalURL = currentURL
    let status = 0
    let title = ''

    // Set up event listeners
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    const httpErrors: Array<{ url: string; status: number }> = []

    page.on('pageerror', (error: Error) => {
      pageErrors.push(error.message)
      incidents.push({
        type: 'pageerror',
        message: error.message,
        url: currentURL,
      })
    })

    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        consoleErrors.push(text)
        incidents.push({
          type: 'console.error',
          message: text,
          url: currentURL,
        })
      }
    })

    // Track responses for same-origin resources
    page.on('response', (response: Response) => {
      const responseURL = response.url()
      try {
        const responseUrlObj = new URL(responseURL)
        const baseUrlObj = new URL(baseURL)
        if (responseUrlObj.origin === baseUrlObj.origin) {
          const responseStatus = response.status()
          if (responseStatus >= 400) {
            httpErrors.push({ url: responseURL, status: responseStatus })
            incidents.push({
              type: responseStatus >= 500 ? 'http.5xx' : 'http.4xx',
              message: `HTTP ${responseStatus}`,
              url: responseURL,
              status: responseStatus,
            })
          }
        }
      } catch {
        // Ignore invalid URLs
      }
    })

    // Track redirects before navigation
    let redirectCount = 0
    const redirectListener = (resp: Response) => {
      if (resp.request().isNavigationRequest() && resp.status() >= 300 && resp.status() < 400) {
        redirectCount++
        const location = resp.headers()['location']
        if (location) {
          redirectChain.push(location)
        }
      }
    }
    page.on('response', redirectListener)

    try {
      let response = null as any

      try {
        response = await page.goto(currentURL, {
          waitUntil: 'domcontentloaded',
          timeout: CRAWL_PAGE_TIMEOUT_MS,
        })
      } catch (error: any) {
        // Check if it's a timeout or navigation error
        if (error.message?.includes('timeout') || error.message?.includes('Navigation timeout')) {
          incidents.push({
            type: 'pageerror',
            message: `Navigation timeout after ${CRAWL_PAGE_TIMEOUT_MS}ms`,
            url: currentURL,
          })
        } else {
          incidents.push({
            type: 'pageerror',
            message: error.message || 'Navigation failed',
            url: currentURL,
          })
        }
      } finally {
        // Remove redirect listener after navigation
        page.off('response', redirectListener)
      }

      // Wait a bit for dynamic content
      await page.waitForTimeout(1000)

      finalURL = page.url()
      status = response?.status() || 200
      title = await page.title().catch(() => 'No title')

      // Check for 404
      if (status === 404) {
        incidents.push({
          type: '404',
          message: 'Page not found',
          url: currentURL,
          status: 404,
        })
      }

      // Check for redirect loops and excessive redirects
      if (redirectCount > 0) {
        const finalNormalized = normalizeURL(finalURL, baseURL)
        const originalNormalized = normalizeURL(currentURL, baseURL)
        
        // Check for redirect loop (ends up at same URL after redirects)
        if (finalNormalized === originalNormalized && redirectCount > 1) {
          incidents.push({
            type: 'redirect.loop',
            message: `Redirect loop detected (${redirectCount} redirects, ended at same URL)`,
            url: currentURL,
          })
        }
        
        // Check for excessive redirects
        if (redirectCount >= CRAWL_REDIRECT_THRESHOLD) {
          incidents.push({
            type: 'redirect.excessive',
            message: `Excessive redirects (${redirectCount} >= ${CRAWL_REDIRECT_THRESHOLD})`,
            url: currentURL,
          })
        }
      }

      // Extract links
      const links = await extractLinks(page, baseURL, visited)
      const nextDepth = currentDepth + 1
      for (const link of links) {
        if (!visited.has(link)) {
          // Check if we should enqueue based on depth limit
          if (CRAWL_MAX_DEPTH === -1 || nextDepth <= CRAWL_MAX_DEPTH) {
            // Only add if not already in queue
            const alreadyQueued = queue.some(item => item.url === link)
            if (!alreadyQueued) {
              queue.push({ url: link, depth: nextDepth })
              urlToDepth.set(link, nextDepth)
            }
          }
        }
      }

      console.log(`   ✅ Status: ${status} | Title: ${title}`)
      console.log(`   🔗 Found ${links.length} new links (${queue.length} queued)`)

      if (incidents.length > 0) {
        console.log(`   ⚠️  ${incidents.length} incident(s) detected`)
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
      incidents.push({
        type: 'pageerror',
        message: error instanceof Error ? error.message : 'Unknown error',
        url: currentURL,
      })
    }

    const pageDuration = Date.now() - pageStartTime

    // Save artifacts for pages with incidents
    let screenshotPath: string | undefined
    let htmlPath: string | undefined
    if (incidents.length > 0) {
      const sanitized = sanitizeURLForFilesystem(currentURL)
      try {
        screenshotPath = path.join(ARTIFACT_DIR, `${sanitized}-fail.png`)
        await page.screenshot({ path: screenshotPath, fullPage: false })
      } catch (err) {
        console.warn(`   ⚠️  Failed to save screenshot: ${err instanceof Error ? err.message : String(err)}`)
      }

      try {
        htmlPath = path.join(ARTIFACT_DIR, `${sanitized}-fail.html`)
        const html = await page.content()
        fs.writeFileSync(htmlPath, html, 'utf-8')
      } catch (err) {
        console.warn(`   ⚠️  Failed to save HTML: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // Record page visit
    const visitedPage: VisitedPage = {
      url: finalURL,
      status,
      title,
      incidents,
      redirectChain,
      duration: pageDuration,
      linksFound: queue.length,
      screenshotPath: screenshotPath ? path.relative(process.cwd(), screenshotPath) : undefined,
      htmlPath: htmlPath ? path.relative(process.cwd(), htmlPath) : undefined,
    }

    pages.push(visitedPage)

    // Count incidents by type
    for (const incident of incidents) {
      incidentsByType[incident.type] = (incidentsByType[incident.type] || 0) + 1
    }

    // Small delay to avoid overwhelming the server
    await page.waitForTimeout(300)
  }

  const endTime = Date.now()
  const duration = endTime - startTime

  const totalIncidents = pages.reduce((sum, p) => sum + p.incidents.length, 0)
  const pagesWithIncidents = pages.filter(p => p.incidents.length > 0).length

  const report: CrawlReport = {
    summary: {
      totalPages: pages.length,
      totalIncidents,
      pagesWithIncidents,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration,
      maxPages: (CRAWL_MAX_PAGES === 0 ? 'unlimited' : CRAWL_MAX_PAGES) as number | 'unlimited',
      maxDepth: CRAWL_MAX_DEPTH === -1 ? 'unlimited' : CRAWL_MAX_DEPTH,
      pageTimeout: CRAWL_PAGE_TIMEOUT_MS,
      role: role,
    },
    pages,
    incidentsByType,
  }

  // Save checkpoint if enabled
  if (CRAWL_SAVE_CHECKPOINT) {
    try {
      const checkpoint: CrawlCheckpoint = {
        visited: Array.from(visited),
        urlDepths: Object.fromEntries(urlToDepth),
        timestamp: new Date().toISOString(),
        totalPages: pages.length,
        seeds: CRAWL_SEEDS,
        role: role,
      }
      fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2), 'utf-8')
      console.log(`💾 Checkpoint saved: ${path.relative(process.cwd(), CHECKPOINT_FILE)}`)
      console.log(`   Use CRAWL_RESUME_FROM="${CHECKPOINT_FILE}" to continue from here`)
    } catch (error) {
      console.warn(`⚠️  Failed to save checkpoint: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return report
}

// Generate JSON report
function generateJSONReport(report: CrawlReport): string {
  return JSON.stringify(report, null, 2)
}

// Generate Markdown report
function generateMarkdownReport(report: CrawlReport, baseURL: string): string {
  const { summary, pages, incidentsByType } = report
  const lines: string[] = []

  lines.push('# Systematic Crawl Report')
  lines.push('')
  lines.push(`**Generated:** ${new Date().toISOString()}`)
  lines.push(`**Role:** ${summary.role || 'guest'}`)
  lines.push('')

  // Summary
  lines.push('## Summary')
  lines.push('')
  lines.push(`- **Total Pages Visited:** ${summary.totalPages}`)
  lines.push(`- **Pages with Incidents:** ${summary.pagesWithIncidents}`)
  lines.push(`- **Total Incidents:** ${summary.totalIncidents}`)
  lines.push(`- **Duration:** ${(summary.duration / 1000).toFixed(2)}s`)
  lines.push(`- **Max Pages:** ${summary.maxPages}`)
  lines.push(`- **Max Depth:** ${summary.maxDepth}`)
  lines.push(`- **Start Time:** ${summary.startTime}`)
  lines.push(`- **End Time:** ${summary.endTime}`)
  lines.push('')

  // Incidents by type
  if (Object.keys(incidentsByType).length > 0) {
    lines.push('## Incidents by Type')
    lines.push('')
    for (const [type, count] of Object.entries(incidentsByType)) {
      lines.push(`- **${type}:** ${count}`)
    }
    lines.push('')
  }

  // Failing pages
  const failingPages = pages.filter(p => p.incidents.length > 0)
  if (failingPages.length > 0) {
    lines.push('## Failing Pages')
    lines.push('')
    for (const page of failingPages) {
      lines.push(`### ${page.url}`)
      lines.push('')
      lines.push(`- **Status:** ${page.status}`)
      lines.push(`- **Title:** ${page.title}`)
      lines.push(`- **Incidents:** ${page.incidents.length}`)
      if (page.screenshotPath) {
        lines.push(`- **Screenshot:** [${page.screenshotPath}](${page.screenshotPath})`)
      }
      if (page.htmlPath) {
        lines.push(`- **HTML Snapshot:** [${page.htmlPath}](${page.htmlPath})`)
      }
      lines.push('')
      lines.push('**Incidents:**')
      for (const incident of page.incidents) {
        lines.push(`- \`${incident.type}\`: ${incident.message}`)
      }
      lines.push('')
    }
  } else {
    lines.push('## ✅ No Incidents Detected')
    lines.push('')
    lines.push('All pages crawled successfully without errors.')
    lines.push('')
  }

  // All pages
  lines.push('## All Visited Pages')
  lines.push('')
  lines.push('| URL | Status | Title | Incidents |')
  lines.push('|-----|--------|-------|-----------|')
  for (const page of pages) {
    const statusIcon = page.status >= 500 ? '❌' : page.status >= 400 ? '⚠️' : '✅'
    lines.push(`| ${statusIcon} ${page.url} | ${page.status} | ${page.title} | ${page.incidents.length} |`)
  }

  return lines.join('\n')
}

// Save reports
function saveReports(report: CrawlReport, baseURL: string): void {
  const jsonReport = generateJSONReport(report)
  const mdReport = generateMarkdownReport(report, baseURL)

  const jsonPath = path.join(ARTIFACT_DIR, 'crawl-report.json')
  const mdPath = path.join(ARTIFACT_DIR, 'crawl-report.md')

  fs.writeFileSync(jsonPath, jsonReport, 'utf-8')
  fs.writeFileSync(mdPath, mdReport, 'utf-8')

  console.log(`\n📊 Reports saved:`)
  console.log(`   - JSON: ${path.relative(process.cwd(), jsonPath)}`)
  console.log(`   - Markdown: ${path.relative(process.cwd(), mdPath)}`)
}

// Test suite
baseTest.describe('Systematic crawl', () => {
  baseTest('guest crawl', async ({ page, baseURL }) => {
    // Set timeout: if unlimited, use 30 minutes; otherwise calculate based on max pages
    const timeout = CRAWL_MAX_PAGES === 0 
      ? 30 * 60_000 // 30 minutes for unlimited crawl
      : (CRAWL_MAX_PAGES * CRAWL_PAGE_TIMEOUT_MS) + 60_000
    baseTest.setTimeout(timeout)

    const report = await runCrawl(page, baseURL || 'http://localhost:3000')
    saveReports(report, baseURL || 'http://localhost:3000')

    // Assert no incidents
    expect(report.summary.totalIncidents).toBe(0)
  })

  baseTest('role crawl (optional)', async ({ page, baseURL, auth }) => {
    if (!CRAWL_ROLE) {
      baseTest.skip()
      return
    }

    // Set timeout: if unlimited, use 30 minutes; otherwise calculate based on max pages
    const timeout = CRAWL_MAX_PAGES === 0 
      ? 30 * 60_000 // 30 minutes for unlimited crawl
      : (CRAWL_MAX_PAGES * CRAWL_PAGE_TIMEOUT_MS) + 60_000
    baseTest.setTimeout(timeout)

    const report = await runCrawl(page, baseURL || 'http://localhost:3000', CRAWL_ROLE, auth)
    saveReports(report, baseURL || 'http://localhost:3000')

    // Assert no incidents
    expect(report.summary.totalIncidents).toBe(0)
  })
})
