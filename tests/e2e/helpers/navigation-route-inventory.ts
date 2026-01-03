import fs from 'node:fs'
import path from 'node:path'

export type RoutePattern = {
  pattern: string // e.g. "/admin/simcity/cockpit/proposals/[proposalId]"
  kind: 'page'
  sourceFile: string
}

const EXCLUDE_DIR_NAMES = new Set([
  'api', // API routes, not UI pages
])

const EXCLUDE_ROUTE_PREFIXES = [
  '/auth/callback',
  '/auth/verify',
  '/e2e', // internal test-only surfaces
]

function isRouteGroupDir(name: string) {
  return name.startsWith('(') && name.endsWith(')')
}

function shouldExcludePattern(pattern: string) {
  return EXCLUDE_ROUTE_PREFIXES.some((p) => pattern === p || pattern.startsWith(`${p}/`))
}

export function buildAppRouteInventory(appDirAbs: string): { all: RoutePattern[]; included: RoutePattern[]; excluded: RoutePattern[] } {
  const all: RoutePattern[] = []

  const walk = (dirAbs: string, segments: string[]) => {
    const entries = fs.readdirSync(dirAbs, { withFileTypes: true })

    // A Next.js route exists if there's a page.tsx in this directory.
    const pageFile = entries.find((e) => e.isFile() && e.name === 'page.tsx')
    if (pageFile) {
      const pattern = `/${segments.join('/')}`.replace(/\/+$/, '') || '/'
      all.push({
        pattern,
        kind: 'page',
        sourceFile: path.join(dirAbs, 'page.tsx'),
      })
    }

    for (const ent of entries) {
      if (!ent.isDirectory()) continue
      if (EXCLUDE_DIR_NAMES.has(ent.name)) continue

      // Ignore Next route groups in the path (they don't appear in the URL).
      if (isRouteGroupDir(ent.name)) {
        walk(path.join(dirAbs, ent.name), segments)
        continue
      }

      walk(path.join(dirAbs, ent.name), [...segments, ent.name])
    }
  }

  walk(appDirAbs, [])

  // Deduplicate patterns (can occur via route groups).
  const byPattern = new Map<string, RoutePattern>()
  for (const r of all) {
    if (!byPattern.has(r.pattern)) byPattern.set(r.pattern, r)
  }

  const deduped = Array.from(byPattern.values()).sort((a, b) => a.pattern.localeCompare(b.pattern))
  const excluded = deduped.filter((r) => shouldExcludePattern(r.pattern))
  const included = deduped.filter((r) => !shouldExcludePattern(r.pattern))
  return { all: deduped, included, excluded }
}

export function matchVisitedPathToPattern(visitedPath: string, patterns: string[]) {
  const v = visitedPath.split('?')[0]
  const vSeg = v.split('/').filter(Boolean)

  // Prefer the most specific match (more segments, fewer dynamic brackets).
  let best: { pattern: string; score: number } | null = null

  for (const p of patterns) {
    const pSeg = p.split('/').filter(Boolean)
    if (pSeg.length !== vSeg.length) continue
    let ok = true
    let dynCount = 0
    for (let i = 0; i < pSeg.length; i++) {
      const ps = pSeg[i]
      const vs = vSeg[i]
      const isDyn = ps.startsWith('[') && ps.endsWith(']')
      if (isDyn) {
        dynCount++
        if (!vs) ok = false
        continue
      }
      if (ps !== vs) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const score = pSeg.length * 10 - dynCount // more segments + fewer dynamics is better
    if (!best || score > best.score) best = { pattern: p, score }
  }

  return best?.pattern ?? null
}

