import { test, expect } from '../fixtures/base'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { createRuntimeSanityHarness } from './helpers/navigation-runtime-sanity'
import { runNavigationTraversal, writeJsonArtifact, writeTextArtifact } from './helpers/navigation-traversal'
import { buildAppRouteInventory, matchVisitedPathToPattern } from './helpers/navigation-route-inventory'
import { skipIfSupabaseUnavailable } from '../helpers/supabaseAvailability'

const ARTIFACT_DIR = path.resolve(process.cwd(), 'playwright', 'navigation-artifacts')

function curlStatus(url: string) {
  const out = execFileSync('curl', ['-sS', '-o', '/dev/null', '-w', '%{http_code}', url], { encoding: 'utf8' })
  return Number(out.trim())
}

test.describe('Navigation completeness + runtime sanity (UI state machine)', () => {
  test.describe.configure({ mode: 'serial' })

  const collected = {
    edges: [] as any[],
    visitedPathsByRole: new Map<string, string[]>(),
    excludedActions: [] as any[],
    failures: [] as any[],
    benignConsole: [] as any[],
  }

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
      edges: collected.edges,
      excludedActions: collected.excludedActions,
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
    summaryLines.push(`- **Edges recorded**: ${collected.edges.length}`)
    summaryLines.push(`- **Runtime failures**: ${collected.failures.length}`)
    summaryLines.push(`- **Route patterns (included)**: ${inv.included.length}`)
    summaryLines.push(`- **Orphan route patterns**: ${orphans.length}`)
    summaryLines.push('')
    summaryLines.push('### Roles')
    for (const [role, visited] of collected.visitedPathsByRole.entries()) {
      const roleEdges = collected.edges.filter((e) => e.role === role).length
      summaryLines.push(`- **${role}**: visited ${visited.length} paths, recorded ${roleEdges} edges`)
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
    const harness = createRuntimeSanityHarness(page, baseURL)
    harness.attachToPage()
    harness.resetStep({ role: 'guest', entryPoint: '/', actionId: null, fromPath: '/' })

    const runtimeFailures = harness.failures
    const traversal = await runNavigationTraversal(
      page,
      baseURL,
      {
        role: 'guest',
        entryPoints: ['/', '/main'],
        includeMainContentLinks: true,
        stabilizationTimeoutMs: 20_000,
      },
      runtimeFailures
      , harness
    )

    collected.edges.push(...traversal.edges)
    collected.excludedActions.push(...traversal.excludedActions)
    collected.visitedPathsByRole.set('guest', traversal.visitedPaths)
    collected.failures.push(...runtimeFailures)
    collected.benignConsole.push(...harness.benignConsole)

    writeJsonArtifact(ARTIFACT_DIR, 'navigation-graph.guest.json', {
      generatedAt: new Date().toISOString(),
      role: 'guest',
      entryPoints: ['/', '/main'],
      edges: traversal.edges,
      excludedActions: traversal.excludedActions,
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
    await skipIfSupabaseUnavailable(test.info())
    await auth.loginAsCustomer()

    const harness = createRuntimeSanityHarness(page, baseURL)
    harness.attachToPage()
    harness.resetStep({ role: 'customer', entryPoint: '/customer/dashboard', actionId: null, fromPath: '/customer/dashboard' })
    const runtimeFailures = harness.failures

    const traversal = await runNavigationTraversal(
      page,
      baseURL,
      { role: 'customer', entryPoints: ['/customer/dashboard'], includeMainContentLinks: true, stabilizationTimeoutMs: 20_000 },
      runtimeFailures,
      harness
    )

    collected.edges.push(...traversal.edges)
    collected.excludedActions.push(...traversal.excludedActions)
    collected.visitedPathsByRole.set('customer', traversal.visitedPaths)
    collected.failures.push(...runtimeFailures)
    collected.benignConsole.push(...harness.benignConsole)

    writeJsonArtifact(ARTIFACT_DIR, 'navigation-graph.customer.json', {
      generatedAt: new Date().toISOString(),
      role: 'customer',
      entryPoints: ['/customer/dashboard'],
      edges: traversal.edges,
      excludedActions: traversal.excludedActions,
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
    await skipIfSupabaseUnavailable(test.info())
    await auth.loginAsVendor()

    const harness = createRuntimeSanityHarness(page, baseURL)
    harness.attachToPage()
    harness.resetStep({ role: 'vendor', entryPoint: '/vendor/dashboard', actionId: null, fromPath: '/vendor/dashboard' })
    const runtimeFailures = harness.failures

    const traversal = await runNavigationTraversal(
      page,
      baseURL,
      { role: 'vendor', entryPoints: ['/vendor/dashboard'], includeMainContentLinks: true, stabilizationTimeoutMs: 20_000 },
      runtimeFailures,
      harness
    )

    collected.edges.push(...traversal.edges)
    collected.excludedActions.push(...traversal.excludedActions)
    collected.visitedPathsByRole.set('vendor', traversal.visitedPaths)
    collected.failures.push(...runtimeFailures)
    collected.benignConsole.push(...harness.benignConsole)

    writeJsonArtifact(ARTIFACT_DIR, 'navigation-graph.vendor.json', {
      generatedAt: new Date().toISOString(),
      role: 'vendor',
      entryPoints: ['/vendor/dashboard'],
      edges: traversal.edges,
      excludedActions: traversal.excludedActions,
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
    await skipIfSupabaseUnavailable(test.info())
    await auth.loginAsAdmin()

    const harness = createRuntimeSanityHarness(page, baseURL)
    harness.attachToPage()
    harness.resetStep({ role: 'admin', entryPoint: '/admin', actionId: null, fromPath: '/admin' })
    const runtimeFailures = harness.failures

    const traversal = await runNavigationTraversal(
      page,
      baseURL,
      { role: 'admin', entryPoints: ['/admin'], includeMainContentLinks: false, stabilizationTimeoutMs: 25_000 },
      runtimeFailures,
      harness
    )

    collected.edges.push(...traversal.edges)
    collected.excludedActions.push(...traversal.excludedActions)
    collected.visitedPathsByRole.set('admin', traversal.visitedPaths)
    collected.failures.push(...runtimeFailures)
    collected.benignConsole.push(...harness.benignConsole)

    writeJsonArtifact(ARTIFACT_DIR, 'navigation-graph.admin.json', {
      generatedAt: new Date().toISOString(),
      role: 'admin',
      entryPoints: ['/admin'],
      edges: traversal.edges,
      excludedActions: traversal.excludedActions,
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

