#!/usr/bin/env tsx
/**
 * Documentation <-> Code Integrity Analyzer (Phase 13)
 *
 * Enforces explicit feature manifests between docs and code. Only mechanical
 * signals are used—no inference. Any divergence fails with exit code 1.
 */

import fs from 'fs'
import path from 'path'

const DOC_PATHS = ['README.md', 'BOOKIJI_FEATURES_FOR_GPT.md']
const DOC_ROOTS = ['docs', 'reference']
const CODE_ROOTS = ['src']
const FEATURE_REGEX = /id:\s*([\w.-]+)\s+status:\s*(shipped|partial|stub|not_implemented)/gi
const CODE_FEATURE_REGEX = /@feature\s+([\w.-]+)|FEATURE_ID\s*=\s*"([\w.-]+)"/g
const WAIVER_PATH = 'docs/integrity-waivers.txt'
const REPORT_PATH = 'docs/integrity-report.json'

interface FeatureDocEntry {
  id: string
  status: 'shipped' | 'partial' | 'stub' | 'not_implemented'
  files: string[]
}

interface FeatureCodeEntry {
  id: string
  files: string[]
}

interface IntegrityIssue {
  level: 'fail' | 'warn'
  id: string
  message: string
}

interface IntegrityReport {
  summary: {
    total: number
    failures: number
    warnings: number
    scanned: {
      docs: number
      code: number
    }
    timestamp: string
  }
  issues: IntegrityIssue[]
  docFeatures: FeatureDocEntry[]
  codeFeatures: FeatureCodeEntry[]
  waivers: string[]
}

function toPosix(p: string) {
  return p.split(path.sep).join('/')
}

function collectDocFiles(root: string): string[] {
  const files: string[] = []

  for (const docPath of DOC_PATHS) {
    const resolved = path.join(root, docPath)
    if (fs.existsSync(resolved)) files.push(resolved)
  }

  for (const docRoot of DOC_ROOTS) {
    const base = path.join(root, docRoot)
    if (!fs.existsSync(base)) continue
    const stack = [base]
    while (stack.length) {
      const current = stack.pop()!
      const entries = fs.readdirSync(current, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(current, entry.name)
        if (entry.isDirectory()) {
          stack.push(full)
        } else if (entry.isFile() && full.endsWith('.md')) {
          files.push(full)
        }
      }
    }
  }

  return files
}

function parseDocFeatures(root: string): FeatureDocEntry[] {
  const docFiles = collectDocFiles(root)
  const entries: FeatureDocEntry[] = []

  for (const file of docFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    const matches = [...content.matchAll(FEATURE_REGEX)]
    for (const match of matches) {
      const id = match[1]
      const status = match[2] as FeatureDocEntry['status']
      const existing = entries.find((entry) => entry.id === id && entry.status === status)
      if (existing) {
        existing.files.push(toPosix(path.relative(root, file)))
      } else {
        entries.push({ id, status, files: [toPosix(path.relative(root, file))] })
      }
    }
  }

  return entries
}

function parseCodeFeatures(root: string): FeatureCodeEntry[] {
  const entries: Record<string, Set<string>> = {}

  for (const codeRoot of CODE_ROOTS) {
    const base = path.join(root, codeRoot)
    if (!fs.existsSync(base)) continue
    const stack = [base]
    while (stack.length) {
      const current = stack.pop()!
      const stat = fs.statSync(current)
      if (stat.isDirectory()) {
        const children = fs.readdirSync(current)
        for (const child of children) {
          stack.push(path.join(current, child))
        }
      } else if (stat.isFile() && (current.endsWith('.ts') || current.endsWith('.tsx'))) {
        const content = fs.readFileSync(current, 'utf-8')
        for (const match of content.matchAll(CODE_FEATURE_REGEX)) {
          const id = match[1] || match[2]
          if (!id) continue
          if (!entries[id]) entries[id] = new Set()
          entries[id].add(toPosix(path.relative(root, current)))
        }
      }
    }
  }

  return Object.entries(entries).map(([id, files]) => ({ id, files: [...files].sort() }))
}

function loadWaivers(root: string): Record<string, { reason: string; expiration: string }> {
  const waivers: Record<string, { reason: string; expiration: string }> = {}
  const waiverFile = path.join(root, WAIVER_PATH)
  if (!fs.existsSync(waiverFile)) return waivers

  const lines = fs
    .readFileSync(waiverFile, 'utf-8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const today = new Date()

  for (const line of lines) {
    const [id, reason, expiration] = line.split('|').map((part) => part.trim())
    if (!id || !reason || !expiration) continue

    const expiresAt = new Date(expiration)
    if (Number.isNaN(expiresAt.getTime()) || expiresAt < today) {
      continue
    }

    waivers[id] = { reason, expiration }
  }

  return waivers
}

function evaluateIntegrity(docFeatures: FeatureDocEntry[], codeFeatures: FeatureCodeEntry[], waivers: Record<string, { reason: string; expiration: string }>): IntegrityIssue[] {
  const issues: IntegrityIssue[] = []
  const codeMap = new Map(codeFeatures.map((entry) => [entry.id, entry.files]))
  const docMap = new Map(docFeatures.map((entry) => [entry.id, entry.status]))

  for (const doc of docFeatures) {
    const waived = waivers[doc.id]
    const hasCode = codeMap.has(doc.id)
    if (waived) continue

    if (doc.status === 'not_implemented' && hasCode) {
      issues.push({ level: 'fail', id: doc.id, message: 'Documented as not implemented but code exists' })
      continue
    }

    if (['stub', 'partial', 'shipped'].includes(doc.status) && !hasCode) {
      issues.push({ level: 'fail', id: doc.id, message: 'Doc feature lacks code evidence' })
      continue
    }

    if (doc.status === 'partial' && hasCode) {
      issues.push({ level: 'warn', id: doc.id, message: 'Doc marks partial but code present; verify status' })
    }
  }

  for (const code of codeFeatures) {
    if (waivers[code.id]) continue
    if (!docMap.has(code.id)) {
      issues.push({ level: 'fail', id: code.id, message: 'Code feature is undocumented' })
    }
  }

  return issues
}

function writeReport(root: string, report: IntegrityReport) {
  const outputPath = path.join(root, REPORT_PATH)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))
  console.log(`Report written to ${toPosix(path.relative(root, outputPath))}`)
}

function main() {
  const root = process.cwd()
  const docFeatures = parseDocFeatures(root)
  const codeFeatures = parseCodeFeatures(root)
  const waivers = loadWaivers(root)
  const issues = evaluateIntegrity(docFeatures, codeFeatures, waivers)

  const failures = issues.filter((issue) => issue.level === 'fail').length
  const warnings = issues.filter((issue) => issue.level === 'warn').length

  const report: IntegrityReport = {
    summary: {
      total: issues.length,
      failures,
      warnings,
      scanned: { docs: docFeatures.length, code: codeFeatures.length },
      timestamp: new Date().toISOString(),
    },
    issues,
    docFeatures,
    codeFeatures,
    waivers: Object.keys(waivers),
  }

  writeReport(root, report)
  console.log(JSON.stringify(report, null, 2))

  if (failures > 0) {
    process.exit(1)
  }
}

main()
