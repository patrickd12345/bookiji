import type { Page, ConsoleMessage, Response } from '@playwright/test'

export type RuntimeFailureType =
  | 'pageerror'
  | 'console-error'
  | 'react-hydration'
  | 'http-5xx'
  | 'redirect-loop'
  | 'stabilization-timeout'

export type RuntimeFailure = {
  role: string
  entryPoint: string
  actionId: string | null
  fromPath: string | null
  toPath: string | null
  url: string
  type: RuntimeFailureType
  message: string
  stack?: string
  at: string
  meta?: Record<string, unknown>
}

export type RuntimeSanityHarness = {
  failures: RuntimeFailure[]
  benignConsole: { at: string; url: string; type: string; text: string; reason: string }[]
  attachToPage: () => void
  resetStep: (ctx: { role: string; entryPoint: string; actionId: string | null; fromPath: string | null }) => void
  markNavigationTarget: (toPath: string | null) => void
}

type StepCtx = {
  role: string
  entryPoint: string
  actionId: string | null
  fromPath: string | null
  toPath: string | null
}

const DEFAULT_BENIGN_CONSOLE_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  // Common non-fatal auth/session chatter (page still renders fine).
  { re: /JWT.*(expired|invalid)/i, reason: 'auth-jwt-warning' },
  { re: /(No session|missing session|auth session missing)/i, reason: 'auth-session-warning' },
  { re: /(Invalid login credentials)/i, reason: 'auth-invalid-credentials (non-test login screen noise)' },
  // Expected in role-protected areas when running as guest (browser logs 401/403 resource loads).
  { re: /Failed to load resource: the server responded with a status of (401|403)/i, reason: 'auth-protected-resource' },
  { re: /net::ERR_ABORTED.*(401|403)/i, reason: 'auth-protected-resource' },

  // Next dev overlay / HMR / source maps.
  { re: /Failed to load source map/i, reason: 'sourcemap-noise' },

  // Cosmetic resource misses in dev.
  { re: /favicon\.ico.*(404|Not Found)/i, reason: 'favicon-404' },
  { re: /manifest\.json.*(404|Not Found)/i, reason: 'manifest-404' },
]

const HYDRATION_PATTERNS: RegExp[] = [
  /Hydration failed/i,
  /Text content does not match server-rendered HTML/i,
  /Warning: An error occurred during hydration/i,
]

function nowIso() {
  return new Date().toISOString()
}

function isSameOrigin(url: string, baseURL: string) {
  try {
    return new URL(url).origin === new URL(baseURL).origin
  } catch {
    return false
  }
}

function classifyConsole(msg: ConsoleMessage) {
  const text = msg.text()
  const isHydration = HYDRATION_PATTERNS.some((re) => re.test(text))
  if (isHydration) return { severity: 'critical' as const, type: 'react-hydration' as const, reason: 'hydration' }

  for (const { re, reason } of DEFAULT_BENIGN_CONSOLE_PATTERNS) {
    if (re.test(text)) return { severity: 'benign' as const, reason }
  }

  // Treat console.error as critical by default; warnings/logs are ignored unless hydration-like.
  if (msg.type() === 'error') return { severity: 'critical' as const, type: 'console-error' as const, reason: 'console-error' }
  return { severity: 'ignore' as const, reason: 'non-error-console' }
}

export function createRuntimeSanityHarness(page: Page, baseURL: string): RuntimeSanityHarness {
  const failures: RuntimeFailure[] = []
  const benignConsole: { at: string; url: string; type: string; text: string; reason: string }[] = []
  let step: StepCtx = { role: 'unknown', entryPoint: 'unknown', actionId: null, fromPath: null, toPath: null }

  const recordFailure = (partial: Omit<RuntimeFailure, 'at' | 'role' | 'entryPoint' | 'actionId' | 'fromPath' | 'toPath'>) => {
    failures.push({
      role: step.role,
      entryPoint: step.entryPoint,
      actionId: step.actionId,
      fromPath: step.fromPath,
      toPath: step.toPath,
      at: nowIso(),
      ...partial,
    })
  }

  const onConsole = (msg: ConsoleMessage) => {
    const c = classifyConsole(msg)
    if (c.severity === 'benign') {
      benignConsole.push({ at: nowIso(), url: page.url(), type: msg.type(), text: msg.text(), reason: c.reason })
      return
    }
    if (c.severity === 'ignore') return

    recordFailure({
      url: page.url(),
      type: c.type,
      message: msg.text(),
      meta: { consoleType: msg.type() },
    })
  }

  const onPageError = (err: Error) => {
    recordFailure({
      url: page.url(),
      type: 'pageerror',
      message: err.message,
      stack: err.stack,
    })
  }

  const onResponse = (res: Response) => {
    const status = res.status()
    if (status < 500) return
    const url = res.url()
    if (!isSameOrigin(url, baseURL)) return
    recordFailure({
      url,
      type: 'http-5xx',
      message: `HTTP ${status} for ${url}`,
      meta: { status },
    })
  }

  return {
    failures,
    benignConsole,
    attachToPage: () => {
      page.on('console', onConsole)
      page.on('pageerror', onPageError)
      page.on('response', onResponse)
    },
    resetStep: (ctx) => {
      step = { ...step, ...ctx, toPath: null }
    },
    markNavigationTarget: (toPath) => {
      step = { ...step, toPath }
    },
  }
}

