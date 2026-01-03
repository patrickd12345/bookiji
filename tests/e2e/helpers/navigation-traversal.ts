import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import type { Page, Locator } from '@playwright/test'
import type { RuntimeFailure } from './navigation-runtime-sanity'

export type RoleName = 'guest' | 'customer' | 'vendor' | 'admin'

export type NavigationActionEdge = {
  role: RoleName
  entryPoint: string
  fromPath: string
  actionId: string
  actionLabel: string
  actionType: 'link' | 'button' | 'menuitem' | 'select'
  actionMeta: Record<string, unknown>
  toPath: string
  toUrl: string
}

export type TraversalArtifacts = {
  edges: NavigationActionEdge[]
  visitedPaths: string[]
  executedActionIds: string[]
  excludedActions: Array<{ role: RoleName; entryPoint: string; fromPath: string; label: string; reason: string }>
}

type StepHooks = {
  resetStep: (ctx: { role: string; entryPoint: string; actionId: string | null; fromPath: string | null }) => void
  markNavigationTarget: (toPath: string | null) => void
}

type TraversalOptions = {
  role: RoleName
  entryPoints: string[] // pathnames, not full URLs
  maxActions?: number // safety cap (should not be used to "find pages", only to prevent infinite loops)
  stabilizationTimeoutMs?: number
  // If true, include visible internal links in main content, not only nav containers.
  includeMainContentLinks?: boolean
  // Optional: restrict traversal to a subset of action types (useful for remote/prod runs).
  allowedActionTypes?: Array<NavigationActionEdge['actionType']>
}

const DEFAULT_EXCLUDE_TEXT = [
  /sign\s*out/i,
  /log\s*out/i,
  /logout/i,
  /delete/i,
  /remove/i,
  /destroy/i,
  /\brefund\b/i,
  /\bcharge\b/i,
  /\bpay\b/i,
  /\bpurchase\b/i,
  /\bsubscribe\b/i,
  /\bcancel booking\b/i,
  /\bconfirm booking\b/i,
]

const DEFAULT_EXCLUDE_HREF = [
  /^mailto:/i,
  /^tel:/i,
  /^javascript:/i,
  /^\/api\//i,
  /^#/,
]

function normalizePathFromUrl(fullUrl: string, baseURL: string) {
  const u = new URL(fullUrl, baseURL)
  const pathname = u.pathname.replace(/\/+$/, '') || '/'
  const search = u.search ? u.search : ''
  // Keep search for determinism when navigation is query-driven (e.g. tabs),
  // but strip tracking-like keys is out-of-scope; tests should reflect real UI state.
  return `${pathname}${search}`
}

function sha1(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex')
}

async function tryClickOpenToggles(page: Page) {
  // Open common nav revealers: hamburger, drawers, dropdown triggers.
  // We only click *visible* toggles with aria-expanded false or "Open menu" labels.
  const candidates = page.locator(
    [
      '[data-test="nav-mobile-menu"]',
      '[aria-label="Open menu"]',
      '[aria-label="Close menu"]',
      'button[aria-expanded="false"]',
      '[role="button"][aria-expanded="false"]',
    ].join(', ')
  )
  const count = await candidates.count()
  for (let i = 0; i < count; i++) {
    const el = candidates.nth(i)
    if (!(await el.isVisible().catch(() => false))) continue
    // Best effort: click once, ignore failures.
    await el.click({ timeout: 1500 }).catch(() => {})
    await page.waitForTimeout(150)
  }
}

async function waitForStabilize(page: Page, timeoutMs: number) {
  // "Stabilize" = no URL changes + network idle-ish + readyState not 'loading'.
  const startUrl = page.url()
  const started = Date.now()
  let lastUrl = startUrl
  let stableSince = Date.now()

  while (Date.now() - started < timeoutMs) {
    const currentUrl = page.url()
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl
      stableSince = Date.now()
    }

    const readyState = await page.evaluate(() => document.readyState).catch(() => 'unknown')
    if (readyState !== 'loading') {
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {})
      await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {})
    }

    // Consider stable if URL unchanged for 750ms and readyState is not loading.
    if (Date.now() - stableSince > 750 && readyState !== 'loading') {
      await page.waitForTimeout(100)
      return
    }

    await page.waitForTimeout(100)
  }

  throw new Error(`Page did not stabilize within ${timeoutMs}ms (last URL: ${lastUrl})`)
}

async function visibleText(locator: Locator) {
  const aria = await locator.getAttribute('aria-label').catch(() => null)
  if (aria && aria.trim()) return aria.trim()
  const title = await locator.getAttribute('title').catch(() => null)
  if (title && title.trim()) return title.trim()
  const txt = (await locator.innerText().catch(() => '')).trim()
  return txt.replace(/\s+/g, ' ').slice(0, 140) || '(no-text)'
}

async function getActionType(locator: Locator): Promise<NavigationActionEdge['actionType']> {
  const tag = (await locator.evaluate((el) => (el as HTMLElement).tagName.toLowerCase()).catch(() => '')) as string
  if (tag === 'a') return 'link'
  const role = await locator.getAttribute('role').catch(() => null)
  if (role === 'menuitem') return 'menuitem'
  if (tag === 'select') return 'select'
  return 'button'
}

async function getHref(locator: Locator) {
  const tag = await locator.evaluate((el) => (el as HTMLElement).tagName.toLowerCase()).catch(() => '')
  if (tag !== 'a') return null
  const href = await locator.getAttribute('href').catch(() => null)
  return href
}

function isExcludedHref(href: string) {
  return DEFAULT_EXCLUDE_HREF.some((re) => re.test(href))
}

function isExcludedLabel(label: string) {
  return DEFAULT_EXCLUDE_TEXT.some((re) => re.test(label))
}

function isSameOriginHref(href: string) {
  // We only accept same-origin *relative* navigation here.
  return href.startsWith('/')
}

function isProbablyNavContainer(el: Locator) {
  // Kept for future extension; currently container selection is by selectors.
  void el
  return true
}

async function collectCandidateActionLocators(page: Page, includeMainContentLinks: boolean) {
  // Navigation containers first.
  const navContainers = page.locator('nav, [role="navigation"], aside')

  const navLinks = navContainers.locator('a[href]')
  const navMenuitems = navContainers.locator('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]')
  const navButtons = navContainers.locator('button, [role="button"]')

  const candidates: Locator[] = []
  const pushAll = async (l: Locator) => {
    const n = await l.count()
    for (let i = 0; i < n; i++) candidates.push(l.nth(i))
  }

  await pushAll(navLinks)
  await pushAll(navMenuitems)
  await pushAll(navButtons)

  // Optionally include main content internal links (still UI-driven, but broader than nav).
  if (includeMainContentLinks) {
    const mainLinks = page.locator('main a[href], [role="main"] a[href]')
    await pushAll(mainLinks)
  }

  return candidates
}

async function materializeActions(
  page: Page,
  role: RoleName,
  entryPoint: string,
  fromPath: string,
  includeMainContentLinks: boolean,
  allowedActionTypes?: Array<NavigationActionEdge['actionType']>
) {
  await tryClickOpenToggles(page)

  const candidates = await collectCandidateActionLocators(page, includeMainContentLinks)
  const actions: Array<{
    actionId: string
    label: string
    type: NavigationActionEdge['actionType']
    locator: Locator
    meta: Record<string, unknown>
    excludedReason: string | null
  }> = []

  for (const locator of candidates) {
    if (!(await locator.isVisible().catch(() => false))) continue
    if (!(await locator.isEnabled().catch(() => true))) continue

    const label = await visibleText(locator)
    const type = await getActionType(locator)

    if (allowedActionTypes && !allowedActionTypes.includes(type)) {
      actions.push({
        actionId: `excluded:${sha1(`${role}:${fromPath}:${type}:${label}`)}`,
        label,
        type,
        locator,
        meta: { label, type },
        excludedReason: 'action-type-excluded',
      })
      continue
    }

    if (isExcludedLabel(label)) {
      actions.push({
        actionId: `excluded:${sha1(`${role}:${fromPath}:${label}`)}`,
        label,
        type,
        locator,
        meta: { label },
        excludedReason: 'destructive-or-auth-action',
      })
      continue
    }

    const href = await getHref(locator)
    if (href) {
      if (isExcludedHref(href) || !isSameOriginHref(href)) {
        actions.push({
          actionId: `excluded:${sha1(`${role}:${fromPath}:${label}:${href}`)}`,
          label,
          type: 'link',
          locator,
          meta: { href, label },
          excludedReason: 'external-or-non-page-link',
        })
        continue
      }
    }

    // Exclude role switcher(s) because traversal is role-scoped.
    const testId = (await locator.getAttribute('data-testid').catch(() => null)) || ''
    if (testId.startsWith('role-switcher')) {
      actions.push({
        actionId: `excluded:${sha1(`${role}:${fromPath}:${testId}`)}`,
        label: testId,
        type,
        locator,
        meta: { dataTestId: testId },
        excludedReason: 'role-switcher-crosses-role-scope',
      })
      continue
    }

    const stableKey = `${role}:${entryPoint}:${fromPath}:${type}:${label}:${href ?? ''}`
    const actionId = sha1(stableKey)

    actions.push({
      actionId,
      label,
      type,
      locator,
      meta: {
        href: href ?? undefined,
        dataTest: (await locator.getAttribute('data-test').catch(() => null)) ?? undefined,
        dataTestId: testId || undefined,
        ariaLabel: (await locator.getAttribute('aria-label').catch(() => null)) ?? undefined,
      },
      excludedReason: null,
    })
  }

  // Deterministic ordering: by actionId.
  actions.sort((a, b) => a.actionId.localeCompare(b.actionId))
  return actions
}

async function safeClickAndWaitForRouteChange(page: Page, locator: Locator, baseURL: string, timeoutMs: number) {
  const before = page.url()

  // Try a regular click first.
  await locator.click({ timeout: 5000 }).catch(async () => {
    // Fall back: sometimes an element is covered; force is safer than skipping.
    await locator.click({ timeout: 5000, force: true })
  })

  // Wait for URL to change or at least for navigation to settle.
  const started = Date.now()
  let changes = 0
  let last = before

  while (Date.now() - started < timeoutMs) {
    const u = page.url()
    if (u !== last) {
      changes++
      last = u
    }
    if (changes > 10) {
      const err = new Error(`Possible redirect loop detected (>${changes} URL changes within ${timeoutMs}ms). Last: ${u}`)
      ;(err as any).__redirectLoop = true
      throw err
    }
    if (u !== before) break
    await page.waitForTimeout(100)
  }

  // Always stabilize after click.
  await waitForStabilize(page, timeoutMs).catch((e) => {
    const err = e instanceof Error ? e : new Error(String(e))
    ;(err as any).__stabilizationTimeout = true
    throw err
  })

  const afterUrl = page.url()
  const toPath = normalizePathFromUrl(afterUrl, baseURL)
  const fromPath = normalizePathFromUrl(before, baseURL)
  return { fromPath, toPath, toUrl: afterUrl }
}

export async function runNavigationTraversal(
  page: Page,
  baseURL: string,
  opts: TraversalOptions,
  runtimeFailures: RuntimeFailure[],
  stepHooks?: StepHooks
): Promise<TraversalArtifacts> {
  const edges: NavigationActionEdge[] = []
  const excludedActions: TraversalArtifacts['excludedActions'] = []

  const visitedPaths = new Set<string>()
  const executedActionIds = new Set<string>()

  const maxActions = opts.maxActions ?? 1000
  const stabilizationTimeoutMs = opts.stabilizationTimeoutMs ?? 20_000
  const includeMainContentLinks = opts.includeMainContentLinks ?? true

  // Worklist: actions discovered but not executed.
  const queue: Array<{
    entryPoint: string
    fromUrl: string
    fromPath: string
    actionId: string
    label: string
    type: NavigationActionEdge['actionType']
    locator: Locator
    meta: Record<string, unknown>
  }> = []

  const enqueueFromCurrentPage = async (entryPoint: string) => {
    const fromPath = normalizePathFromUrl(page.url(), baseURL)
    visitedPaths.add(fromPath)

    const actions = await materializeActions(page, opts.role, entryPoint, fromPath, includeMainContentLinks, opts.allowedActionTypes)
    for (const a of actions) {
      if (a.excludedReason) {
        excludedActions.push({ role: opts.role, entryPoint, fromPath, label: a.label, reason: a.excludedReason })
        continue
      }
      if (executedActionIds.has(a.actionId)) continue
      // Avoid duplicating in-queue actions.
      if (queue.some((q) => q.actionId === a.actionId)) continue
      queue.push({
        entryPoint,
        fromUrl: page.url(),
        fromPath,
        actionId: a.actionId,
        label: a.label,
        type: a.type,
        locator: a.locator,
        meta: a.meta,
      })
    }
  }

  // Prime queue by visiting each entry point and collecting actions.
  for (const ep of opts.entryPoints) {
    await page.goto(ep, { waitUntil: 'domcontentloaded' })
    await waitForStabilize(page, stabilizationTimeoutMs)
    await enqueueFromCurrentPage(ep)
  }

  while (queue.length > 0) {
    if (executedActionIds.size >= maxActions) break // safety only

    const next = queue.shift()!
    if (executedActionIds.has(next.actionId)) continue

    // Return to the originating shell/layout state by navigating back to fromPath.
    // (goBack can be flaky for SPAs; direct goto is deterministic.)
    await page.goto(next.fromPath, { waitUntil: 'domcontentloaded' })
    await waitForStabilize(page, stabilizationTimeoutMs)

    // Re-materialize the same action on this page (locators can go stale).
    const currentFromPath = normalizePathFromUrl(page.url(), baseURL)
    const actions = await materializeActions(page, opts.role, next.entryPoint, currentFromPath, includeMainContentLinks, opts.allowedActionTypes)
    const found = actions.find((a) => a.actionId === next.actionId && !a.excludedReason)
    if (!found) {
      // Treat as a runtime failure: navigation action not reachable under intended UI state.
      runtimeFailures.push({
        role: opts.role,
        entryPoint: next.entryPoint,
        actionId: next.actionId,
        fromPath: currentFromPath,
        toPath: null,
        url: page.url(),
        type: 'stabilization-timeout',
        message: `Navigation action disappeared before execution: ${next.label}`,
        at: new Date().toISOString(),
        meta: { label: next.label },
      })
      executedActionIds.add(next.actionId)
      continue
    }

    // Execute action
    executedActionIds.add(next.actionId)
    stepHooks?.resetStep({ role: opts.role, entryPoint: next.entryPoint, actionId: next.actionId, fromPath: currentFromPath })

    try {
      const { toPath, toUrl } = await safeClickAndWaitForRouteChange(page, found.locator, baseURL, stabilizationTimeoutMs)
      stepHooks?.markNavigationTarget(toPath)
      visitedPaths.add(toPath)

      edges.push({
        role: opts.role,
        entryPoint: next.entryPoint,
        fromPath: currentFromPath,
        actionId: next.actionId,
        actionLabel: next.label,
        actionType: next.type,
        actionMeta: next.meta,
        toPath,
        toUrl,
      })

      // Discover more actions in the new state.
      await enqueueFromCurrentPage(next.entryPoint)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      const isRedirectLoop = Boolean((err as any).__redirectLoop)
      const isStabilizationTimeout = Boolean((err as any).__stabilizationTimeout)

      stepHooks?.markNavigationTarget(null)
      runtimeFailures.push({
        role: opts.role,
        entryPoint: next.entryPoint,
        actionId: next.actionId,
        fromPath: currentFromPath,
        toPath: null,
        url: page.url(),
        type: isRedirectLoop ? 'redirect-loop' : isStabilizationTimeout ? 'stabilization-timeout' : 'pageerror',
        message: err.message,
        stack: err.stack,
        at: new Date().toISOString(),
        meta: { label: next.label },
      })
    }
  }

  return {
    edges,
    visitedPaths: Array.from(visitedPaths).sort(),
    executedActionIds: Array.from(executedActionIds).sort(),
    excludedActions,
  }
}

export function writeJsonArtifact(outDir: string, filename: string, data: unknown) {
  fs.mkdirSync(outDir, { recursive: true })
  const p = path.join(outDir, filename)
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8')
}

export function writeTextArtifact(outDir: string, filename: string, text: string) {
  fs.mkdirSync(outDir, { recursive: true })
  const p = path.join(outDir, filename)
  fs.writeFileSync(p, text, 'utf8')
}

