import { test, expect } from '../fixtures/base'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { createRuntimeSanityHarness } from './helpers/navigation-runtime-sanity'
import { writeJsonArtifact, writeTextArtifact } from './helpers/navigation-traversal'
import { buildAppRouteInventory, matchVisitedPathToPattern } from './helpers/navigation-route-inventory'
import { skipIfSupabaseUnavailable } from '../helpers/supabaseAvailability'

const ARTIFACT_DIR = path.resolve(process.cwd(), 'playwright', 'navigation-artifacts')

function curlStatus(url: string) {
  // Windows-compatible curl command (use NUL instead of /dev/null)
  const isWindows = process.platform === 'win32'
  const nullFile = isWindows ? 'NUL' : '/dev/null'
  const out = execFileSync('curl', ['-sS', '-o', nullFile, '-w', '%{http_code}', url], { encoding: 'utf8' })
  return Number(out.trim())
}

function isRemoteBaseURL(baseURL: string) {
  try {
    const origin = new URL(baseURL).origin
    return !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  } catch {
    return true
  }
}

function readIntEnv(name: string) {
  const raw = process.env[name]
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

test.describe('Navigation completeness + runtime sanity (UI state machine)', () => {
  test.describe.configure({ mode: 'serial' })

  const collected = {
    visitedPathsByRole: new Map<string, string[]>(),
    failures: [] as any[],
    benignConsole: [] as any[],
  }

  const NAV_START_PATH = '/main'
  const MAX_DEPTH = 4
  const MAX_PAGES = 50

  test.afterAll(async () => {
    const inv = buildAppRouteInventory(path.resolve(process.cwd(), 'src', 'app'))
    const patterns = inv.included.map((r) => r.pattern)

    const reachablePatterns = new Set<string>()
    for (const visited of collected.visitedPathsByRole.values()) {
      for (const vp of visited) {
        const m = matchVisitedPathToPattern(vp, patterns)
        if (m) reachablePatterns.add(m)
      }
    }

    const orphans = inv.included
      .filter((r) => !reachablePatterns.has(r.pattern))
      .map((r) => ({ pattern: r.pattern, sourceFile: r.sourceFile }))

    writeJsonArtifact(ARTIFACT_DIR, 'navigation-graph.json', {
      generatedAt: new Date().toISOString(),
      visitedPathsByRole: Object.fromEntries(Array.from(collected.visitedPathsByRole.entries())),
    })
    writeJsonArtifact(ARTIFACT_DIR, 'runtime-failures.json', {
      generatedAt: new Date().toISOString(),
      failures: collected.failures,
      benignConsole: collected.benignConsole,
    })
    writeJsonArtifact(ARTIFACT_DIR, 'navigation-orphans.json', {
      generatedAt: new Date().toISOString(),
      inventory: inv.included.map((r) => ({ pattern: r.pattern, sourceFile: r.sourceFile })),
      excludedInventory: inv.excluded.map((r) => ({ pattern: r.pattern, sourceFile: r.sourceFile })),
      reachablePatterns: Array.from(reachablePatterns).sort(),
      orphans,
    })

    const summaryLines: string[] = []
    summaryLines.push('## Navigation completeness + runtime sanity summary')
    summaryLines.push('')
    summaryLines.push(`- **Generated at**: ${new Date().toISOString()}`)
    const totalVisited = Array.from(collected.visitedPathsByRole.values()).reduce((s, arr) => s + arr.length, 0)
    summaryLines.push(`- **Visited paths (total)**: ${totalVisited}`)
    summaryLines.push(`- **Runtime failures**: ${collected.failures.length}`)
    summaryLines.push(`- **Route patterns (included)**: ${inv.included.length}`)
    summaryLines.push(`- **Orphan route patterns**: ${orphans.length}`)
    summaryLines.push('')
    summaryLines.push('### Roles')
    for (const [role, visited] of collected.visitedPathsByRole.entries()) {
      summaryLines.push(`- **${role}**: visited ${visited.length} paths`)
    }
    if (collected.failures.length) {
      summaryLines.push('')
      summaryLines.push('### Failures (first 10)')
      summaryLines.push('')
      for (const f of collected.failures.slice(0, 10)) {
        summaryLines.push(`- **${f.role}** ${f.type}: ${f.message}`)
      }
    }

    writeTextArtifact(ARTIFACT_DIR, 'summary.md', summaryLines.join('\n') + '\n')
  })

  test('API sanity (curl)', async () => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000'
    const health = curlStatus(`${baseURL}/api/health`)
    expect(health).toBeGreaterThanOrEqual(200)
    expect(health).toBeLessThan(500)
  })

  test('guest traversal', async ({ page, baseURL }) => {
    test.setTimeout(10 * 60_000)
    const resolvedBaseURL = baseURL ?? process.env.BASE_URL ?? 'http://localhost:3000'
    const remote = isRemoteBaseURL(resolvedBaseURL)
    const maxActions = readIntEnv('E2E_NAV_MAX_ACTIONS') ?? (remote ? 250 : 1000)
    const includeMainContentLinks =
      process.env.E2E_NAV_INCLUDE_MAIN_CONTENT_LINKS === 'true' ? true : process.env.E2E_NAV_INCLUDE_MAIN_CONTENT_LINKS === 'false' ? false : !remote
    const allowedActionTypes = process.env.E2E_NAV_ALLOWED_ACTION_TYPES?.length
      ? (process.env.E2E_NAV_ALLOWED_ACTION_TYPES.split(',').map((s) => s.trim()).filter(Boolean) as any)
      : remote
        ? (['link', 'menuitem'] as const)
        : undefined
    const harness = createRuntimeSanityHarness(page, resolvedBaseURL)
    harness.attachToPage()
    harness.resetStep({ role: 'guest', entryPoint: NAV_START_PATH, actionId: null, fromPath: NAV_START_PATH })

    const runtimeFailures = harness.failures
    const traversal = await (async function runBfsTraversal() {
      const visited = new Set<string>()
      type QueueItem = { path: string; depth: number }
      const q: QueueItem[] = []

      const normalizePath = (fullUrl: string) => {
        try {
          const u = new URL(fullUrl, resolvedBaseURL)
          const pathname = u.pathname.replace(/\/+$/, '') || '/'
          const search = u.search ? u.search : ''
          return `${pathname}${search}`
        } catch {
          return fullUrl
        }
      }

      const isExcludedHref = (href: string) => {
        return [/^mailto:/i, /^tel:/i, /^javascript:/i, /^\/api\//i, /^#/].some((re) => re.test(href))
      }

      const enqueueIfAllowed = (p: string, d: number) => {
        if (visited.has(p)) return
        if (d > MAX_DEPTH) return
        if (visited.size >= MAX_PAGES) return
        q.push({ path: p, depth: d })
        visited.add(p)
      }

      // seed
      enqueueIfAllowed(NAV_START_PATH, 0)

      while (q.length > 0) {
        const cur = q.shift()!
        // navigate and stabilize
        await page.goto(cur.path, { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle').catch(() => {})
        // best-effort open toggles (minimal, visible only)
        const toggles = page.locator('[data-test="nav-mobile-menu"], [aria-label="Open menu"], button[aria-expanded="false"], [role="button"][aria-expanded="false"]')
        const tcount = await toggles.count().catch(() => 0)
        for (let i = 0; i < tcount; i++) {
          const el = toggles.nth(i)
          if (!(await el.isVisible().catch(() => false))) continue
          await el.click({ timeout: 1500 }).catch(() => {})
          await page.waitForTimeout(150)
        }

        // immediate invariant validation: harness will record any runtime failures as console/page events.
        // Discover links in nav/main containers and enqueue new paths immediately.
        const navCandidates = page.locator('nav, [role="navigation"], aside, main, [role="main"]')
        const anchors = navCandidates.locator('a[href]')
        const n = await anchors.count()
        for (let i = 0; i < n; i++) {
          const a = anchors.nth(i)
          if (!(await a.isVisible().catch(() => false))) continue
          const href = (await a.getAttribute('href').catch(() => null)) || ''
          if (!href) continue
          if (!href.startsWith('/')) continue // only same-origin relative
          if (isExcludedHref(href)) continue
          const np = normalizePath(href)
          enqueueIfAllowed(np, cur.depth + 1)
        }
      }

      return {
        visitedPaths: Array.from(visited).sort(),
      }
    })()

    collected.visitedPathsByRole.set('guest', traversal.visitedPaths)
    collected.failures.push(...runtimeFailures)
    collected.benignConsole.push(...harness.benignConsole)

    writeJsonArtifact(ARTIFACT_DIR, 'navigation-graph.guest.json', {
      generatedAt: new Date().toISOString(),
      role: 'guest',
      start: NAV_START_PATH,
      visitedPaths: traversal.visitedPaths,
    })
    writeJsonArtifact(ARTIFACT_DIR, 'runtime-failures.guest.json', {
      generatedAt: new Date().toISOString(),
      role: 'guest',
      failures: runtimeFailures,
      benignConsole: harness.benignConsole,
    })

    // Fail hard if any runtime failures were detected.
    expect(runtimeFailures, JSON.stringify(runtimeFailures.slice(0, 5), null, 2)).toEqual([])
  })

  test('customer traversal', { tag: '@requires-supabase' }, async ({ page, baseURL, auth }) => {
    test.setTimeout(10 * 60_000)
    await skipIfSupabaseUnavailable(test.info())
    try {
      await auth.loginAsCustomer()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      test.skip(true, `Skipping customer traversal: login failed (${msg})`)
    }

    const resolvedBaseURL = baseURL ?? process.env.BASE_URL ?? 'http://localhost:3000'
    const remote = isRemoteBaseURL(resolvedBaseURL)
    const maxActions = readIntEnv('E2E_NAV_MAX_ACTIONS') ?? (remote ? 250 : 1000)
    const includeMainContentLinks =
      process.env.E2E_NAV_INCLUDE_MAIN_CONTENT_LINKS === 'true' ? true : process.env.E2E_NAV_INCLUDE_MAIN_CONTENT_LINKS === 'false' ? false : !remote
    const allowedActionTypes = process.env.E2E_NAV_ALLOWED_ACTION_TYPES?.length
      ? (process.env.E2E_NAV_ALLOWED_ACTION_TYPES.split(',').map((s) => s.trim()).filter(Boolean) as any)
      : remote
        ? (['link', 'menuitem'] as const)
        : undefined
    const harness = createRuntimeSanityHarness(page, resolvedBaseURL)
    harness.attachToPage()
    harness.resetStep({ role: 'customer', entryPoint: NAV_START_PATH, actionId: null, fromPath: NAV_START_PATH })
    const runtimeFailures = harness.failures

    const traversal = await (async function runBfsTraversal() {
      const visited = new Set<string>()
      type QueueItem = { path: string; depth: number }
      const q: QueueItem[] = []

      const normalizePath = (fullUrl: string) => {
        try {
          const u = new URL(fullUrl, resolvedBaseURL)
          const pathname = u.pathname.replace(/\/+$/, '') || '/'
          const search = u.search ? u.search : ''
          return `${pathname}${search}`
        } catch {
          return fullUrl
        }
      }

      const isExcludedHref = (href: string) => {
        return [/^mailto:/i, /^tel:/i, /^javascript:/i, /^\/api\//i, /^#/].some((re) => re.test(href))
      }

      const enqueueIfAllowed = (p: string, d: number) => {
        if (visited.has(p)) return
        if (d > MAX_DEPTH) return
        if (visited.size >= MAX_PAGES) return
        q.push({ path: p, depth: d })
        visited.add(p)
      }

      enqueueIfAllowed(NAV_START_PATH, 0)

      while (q.length > 0) {
        const cur = q.shift()!
        await page.goto(cur.path, { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle').catch(() => {})
        const toggles = page.locator('[data-test="nav-mobile-menu"], [aria-label="Open menu"], button[aria-expanded="false"], [role="button"][aria-expanded="false"]')
        const tcount = await toggles.count().catch(() => 0)
        for (let i = 0; i < tcount; i++) {
          const el = toggles.nth(i)
          if (!(await el.isVisible().catch(() => false))) continue
          await el.click({ timeout: 1500 }).catch(() => {})
          await page.waitForTimeout(150)
        }

        const navCandidates = page.locator('nav, [role="navigation"], aside, main, [role="main"]')
        const anchors = navCandidates.locator('a[href]')
        const n = await anchors.count()
        for (let i = 0; i < n; i++) {
          const a = anchors.nth(i)
          if (!(await a.isVisible().catch(() => false))) continue
          const href = (await a.getAttribute('href').catch(() => null)) || ''
          if (!href) continue
          if (!href.startsWith('/')) continue
          if (isExcludedHref(href)) continue
          const np = normalizePath(href)
          enqueueIfAllowed(np, cur.depth + 1)
        }
      }

      return { visitedPaths: Array.from(visited).sort() }
    })()

    collected.visitedPathsByRole.set('customer', traversal.visitedPaths)
    collected.failures.push(...runtimeFailures)
    collected.benignConsole.push(...harness.benignConsole)

    writeJsonArtifact(ARTIFACT_DIR, 'navigation-graph.customer.json', {
      generatedAt: new Date().toISOString(),
      role: 'customer',
      start: NAV_START_PATH,
      visitedPaths: traversal.visitedPaths,
    })
    writeJsonArtifact(ARTIFACT_DIR, 'runtime-failures.customer.json', {
      generatedAt: new Date().toISOString(),
      role: 'customer',
      failures: runtimeFailures,
      benignConsole: harness.benignConsole,
    })

    expect(runtimeFailures, JSON.stringify(runtimeFailures.slice(0, 5), null, 2)).toEqual([])
  })

  test('vendor traversal', { tag: '@requires-supabase' }, async ({ page, baseURL, auth }) => {
    test.setTimeout(10 * 60_000)
    await skipIfSupabaseUnavailable(test.info())
    try {
      await auth.loginAsVendor()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      test.skip(true, `Skipping vendor traversal: login failed (${msg})`)
    }

    const resolvedBaseURL = baseURL ?? process.env.BASE_URL ?? 'http://localhost:3000'
    const remote = isRemoteBaseURL(resolvedBaseURL)
    const maxActions = readIntEnv('E2E_NAV_MAX_ACTIONS') ?? (remote ? 250 : 1000)
    const includeMainContentLinks =
      process.env.E2E_NAV_INCLUDE_MAIN_CONTENT_LINKS === 'true' ? true : process.env.E2E_NAV_INCLUDE_MAIN_CONTENT_LINKS === 'false' ? false : !remote
    const allowedActionTypes = process.env.E2E_NAV_ALLOWED_ACTION_TYPES?.length
      ? (process.env.E2E_NAV_ALLOWED_ACTION_TYPES.split(',').map((s) => s.trim()).filter(Boolean) as any)
      : remote
        ? (['link', 'menuitem'] as const)
        : undefined
    const harness = createRuntimeSanityHarness(page, resolvedBaseURL)
    harness.attachToPage()
    harness.resetStep({ role: 'vendor', entryPoint: NAV_START_PATH, actionId: null, fromPath: NAV_START_PATH })
    const runtimeFailures = harness.failures

    const traversal = await (async function runBfsTraversal() {
      const visited = new Set<string>()
      type QueueItem = { path: string; depth: number }
      const q: QueueItem[] = []

      const normalizePath = (fullUrl: string) => {
        try {
          const u = new URL(fullUrl, resolvedBaseURL)
          const pathname = u.pathname.replace(/\/+$/, '') || '/'
          const search = u.search ? u.search : ''
          return `${pathname}${search}`
        } catch {
          return fullUrl
        }
      }

      const isExcludedHref = (href: string) => {
        return [/^mailto:/i, /^tel:/i, /^javascript:/i, /^\/api\//i, /^#/].some((re) => re.test(href))
      }

      const enqueueIfAllowed = (p: string, d: number) => {
        if (visited.has(p)) return
        if (d > MAX_DEPTH) return
        if (visited.size >= MAX_PAGES) return
        q.push({ path: p, depth: d })
        visited.add(p)
      }

      enqueueIfAllowed(NAV_START_PATH, 0)

      while (q.length > 0) {
        const cur = q.shift()!
        await page.goto(cur.path, { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle').catch(() => {})
        const toggles = page.locator('[data-test="nav-mobile-menu"], [aria-label="Open menu"], button[aria-expanded="false"], [role="button"][aria-expanded="false"]')
        const tcount = await toggles.count().catch(() => 0)
        for (let i = 0; i < tcount; i++) {
          const el = toggles.nth(i)
          if (!(await el.isVisible().catch(() => false))) continue
          await el.click({ timeout: 1500 }).catch(() => {})
          await page.waitForTimeout(150)
        }

        const navCandidates = page.locator('nav, [role="navigation"], aside, main, [role="main"]')
        const anchors = navCandidates.locator('a[href]')
        const n = await anchors.count()
        for (let i = 0; i < n; i++) {
          const a = anchors.nth(i)
          if (!(await a.isVisible().catch(() => false))) continue
          const href = (await a.getAttribute('href').catch(() => null)) || ''
          if (!href) continue
          if (!href.startsWith('/')) continue
          if (isExcludedHref(href)) continue
          const np = normalizePath(href)
          enqueueIfAllowed(np, cur.depth + 1)
        }
      }

      return { visitedPaths: Array.from(visited).sort() }
    })()

    collected.visitedPathsByRole.set('vendor', traversal.visitedPaths)
    collected.failures.push(...runtimeFailures)
    collected.benignConsole.push(...harness.benignConsole)

    writeJsonArtifact(ARTIFACT_DIR, 'navigation-graph.vendor.json', {
      generatedAt: new Date().toISOString(),
      role: 'vendor',
      start: NAV_START_PATH,
      visitedPaths: traversal.visitedPaths,
    })
    writeJsonArtifact(ARTIFACT_DIR, 'runtime-failures.vendor.json', {
      generatedAt: new Date().toISOString(),
      role: 'vendor',
      failures: runtimeFailures,
      benignConsole: harness.benignConsole,
    })

    expect(runtimeFailures, JSON.stringify(runtimeFailures.slice(0, 5), null, 2)).toEqual([])
  })

  test('admin traversal (admin shell only)', { tag: '@requires-supabase' }, async ({ page, baseURL, auth }) => {
    test.setTimeout(10 * 60_000)
    await skipIfSupabaseUnavailable(test.info())
    try {
      await auth.loginAsAdmin()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      test.skip(true, `Skipping admin traversal: login failed (${msg})`)
    }

    const resolvedBaseURL = baseURL ?? process.env.BASE_URL ?? 'http://localhost:3000'
    const remote = isRemoteBaseURL(resolvedBaseURL)
    const maxActions = readIntEnv('E2E_NAV_MAX_ACTIONS') ?? (remote ? 250 : 1000)
    const allowedActionTypes = process.env.E2E_NAV_ALLOWED_ACTION_TYPES?.length
      ? (process.env.E2E_NAV_ALLOWED_ACTION_TYPES.split(',').map((s) => s.trim()).filter(Boolean) as any)
      : remote
        ? (['link', 'menuitem'] as const)
        : undefined
    const harness = createRuntimeSanityHarness(page, resolvedBaseURL)
    harness.attachToPage()
    harness.resetStep({ role: 'admin', entryPoint: NAV_START_PATH, actionId: null, fromPath: NAV_START_PATH })
    const runtimeFailures = harness.failures

    const traversal = await (async function runBfsTraversal() {
      const visited = new Set<string>()
      type QueueItem = { path: string; depth: number }
      const q: QueueItem[] = []

      const normalizePath = (fullUrl: string) => {
        try {
          const u = new URL(fullUrl, resolvedBaseURL)
          const pathname = u.pathname.replace(/\/+$/, '') || '/'
          const search = u.search ? u.search : ''
          return `${pathname}${search}`
        } catch {
          return fullUrl
        }
      }

      const isExcludedHref = (href: string) => {
        return [/^mailto:/i, /^tel:/i, /^javascript:/i, /^\/api\//i, /^#/].some((re) => re.test(href))
      }

      const enqueueIfAllowed = (p: string, d: number) => {
        if (visited.has(p)) return
        if (d > MAX_DEPTH) return
        if (visited.size >= MAX_PAGES) return
        q.push({ path: p, depth: d })
        visited.add(p)
      }

      enqueueIfAllowed(NAV_START_PATH, 0)

      while (q.length > 0) {
        const cur = q.shift()!
        await page.goto(cur.path, { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle').catch(() => {})
        const toggles = page.locator('[data-test="nav-mobile-menu"], [aria-label="Open menu"], button[aria-expanded="false"], [role="button"][aria-expanded="false"]')
        const tcount = await toggles.count().catch(() => 0)
        for (let i = 0; i < tcount; i++) {
          const el = toggles.nth(i)
          if (!(await el.isVisible().catch(() => false))) continue
          await el.click({ timeout: 1500 }).catch(() => {})
          await page.waitForTimeout(150)
        }

        const navCandidates = page.locator('nav, [role="navigation"], aside, main, [role="main"]')
        const anchors = navCandidates.locator('a[href]')
        const n = await anchors.count()
        for (let i = 0; i < n; i++) {
          const a = anchors.nth(i)
          if (!(await a.isVisible().catch(() => false))) continue
          const href = (await a.getAttribute('href').catch(() => null)) || ''
          if (!href) continue
          if (!href.startsWith('/')) continue
          if (isExcludedHref(href)) continue
          const np = normalizePath(href)
          enqueueIfAllowed(np, cur.depth + 1)
        }
      }

      return { visitedPaths: Array.from(visited).sort() }
    })()

    collected.visitedPathsByRole.set('admin', traversal.visitedPaths)
    collected.failures.push(...runtimeFailures)
    collected.benignConsole.push(...harness.benignConsole)

    writeJsonArtifact(ARTIFACT_DIR, 'navigation-graph.admin.json', {
      generatedAt: new Date().toISOString(),
      role: 'admin',
      start: NAV_START_PATH,
      visitedPaths: traversal.visitedPaths,
    })
    writeJsonArtifact(ARTIFACT_DIR, 'runtime-failures.admin.json', {
      generatedAt: new Date().toISOString(),
      role: 'admin',
      failures: runtimeFailures,
      benignConsole: harness.benignConsole,
    })

    expect(runtimeFailures, JSON.stringify(runtimeFailures.slice(0, 5), null, 2)).toEqual([])
  })
})

