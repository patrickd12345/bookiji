#!/usr/bin/env tsx
/**
 * Documentation <-> Code Integrity Analyzer
 *
 * Scans docs/reference/README files against source code and tests to find
 * mismatches. Favors false positives over misses and uses deterministic rules
 * (regex/substring) only—no inferred semantics.
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

type DocModel = {
  phases: string[]
  modules: string[]
  guarantees: string[]
  nonFeatures: string[]
}

type CodeModel = {
  modules: string[]
  policies: string[]
  enforcedGuarantees: string[]
  phases: string[]
  files?: string[]
}

type TestModel = {
  testedGuarantees: string[]
  files?: string[]
}

type RawIntegrityReport = {
  undocumented_code: string[]
  unimplemented_docs: string[]
  untested_guarantees: string[]
  obsolete_references: string[]
  ambiguous_claims: string[]
}

type BaselineDelta = {
  path: string
  new_issues: string[]
  resolved_issues: string[]
  baseline_issue_count: number
}

type IntegrityReport = RawIntegrityReport & {
  summary?: {
    total_violations: number
    strict_mode: boolean
    changed_only: boolean
    base_ref?: string
    scanned: {
      docs: number
      code: number
      tests: number
    }
    timestamp: string
    issues_by_type: Record<string, number>
  }
  baseline?: BaselineDelta
}

type DocScanResult = {
  model: DocModel
  references: string[]
  files: string[]
}

type CliOptions = {
  output?: string
  strict: boolean
  changedOnly: boolean
  baseRef?: string
  baseline?: string
  help?: boolean
}

const DOC_DIRS = ['docs', 'reference']
const DOC_EXTS = new Set(['.md', '.json'])
const CODE_DIR = 'src'
const TEST_DIR = 'tests'

const GUARANTEE_REGEX = /\b(must|cannot|never|always|forbidden|guaranteed)\b/i
const NON_FEATURE_REGEX = /\b(does not|cannot|never|no longer|not supported|will not|forbidden)\b/i
const PHASE_REGEX = /phase\s+\d+(?:\.\d+)?/gi
const POLICY_NAME_REGEX = /\b([A-Za-z0-9_]*(?:Guard|guard|Validator|validator|Policy|policy|verify|Verify|enforce|Enforce|ensure|Ensure))\b/g
const ENFORCEMENT_LINE_REGEX = /\b(must|ensure|enforce|guarantee|require|forbid)\b/i
const TEST_DESC_REGEX = /\b(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g
const EXPECT_MATCHER_REGEX = /expect\([^)]*\)\.(\w+)/g
const DOC_PATH_REGEX = /\b(?:src|tests|docs|reference)\/[A-Za-z0-9_.\-\/]+/g

const toPosix = (p: string) => p.split(path.sep).join('/')
const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim()
const uniqSorted = (items: Iterable<string>) => Array.from(new Set(items)).filter(Boolean).sort()

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    strict: false,
    changedOnly: false,
  }

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    switch (arg) {
      case '--output':
      case '-o':
        options.output = argv[i + 1]
        i += 1
        break
      case '--strict':
        options.strict = true
        break
      case '--changed-only':
        options.changedOnly = true
        break
      case '--base-ref':
        options.baseRef = argv[i + 1]
        i += 1
        break
      case '--baseline':
        options.baseline = argv[i + 1]
        i += 1
        break
      case '--help':
      case '-h':
        options.help = true
        break
      default:
        break
    }
  }

  return options
}

function printHelp(): void {
  console.log(`Usage: tsx scripts/docCodeIntegrity.ts [options]

Options:
  --output, -o <path>     Write JSON report to path (in addition to stdout)
  --strict                Enable strict mode (release builds)
  --changed-only          Limit scan to changed files (PRs)
  --base-ref <ref|sha>    Base ref/sha for changed-only diff (defaults to origin/<current-branch>)
  --baseline <path>       Path to golden baseline to diff against
  --help, -h              Show this help`)
}

function resolveChangedPaths(projectRoot: string, baseRef?: string): Set<string> | undefined {
  const cwd = projectRoot
  const resolvedBase =
    baseRef ||
    process.env.DOC_INTEGRITY_BASE_REF ||
    process.env.GITHUB_BASE_REF ||
    (() => {
      try {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf-8' }).trim()
        return `origin/${branch}`
      } catch {
        return undefined
      }
    })()

  const diffTarget = resolvedBase ? `${resolvedBase}...HEAD` : 'HEAD~1...HEAD'

  try {
    const output = execSync(`git diff --name-only ${diffTarget}`, { cwd, encoding: 'utf-8', stdio: 'pipe' })
    const paths = output
      .split(/\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => toPosix(p))
    return paths.length ? new Set(paths) : undefined
  } catch (error) {
    console.warn(
      'Warning: unable to resolve changed files; proceeding with full scan.',
      (error as Error).message || error
    )
    return undefined
  }
}

async function walkDir(root: string, filter: (fullPath: string) => boolean): Promise<string[]> {
  const results: string[] = []

  async function walk(current: string): Promise<void> {
    const entries = await fs.promises.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (filter(fullPath)) {
        results.push(fullPath)
      }
    }
  }

  if (fs.existsSync(root)) {
    await walk(root)
  }

  return results
}

function shouldInclude(relativePath: string, changedPaths?: Set<string>): boolean {
  if (!changedPaths) return true
  return changedPaths.has(toPosix(relativePath))
}

async function collectDocFiles(projectRoot: string, changedPaths?: Set<string>): Promise<string[]> {
  const files: string[] = []

  for (const dir of DOC_DIRS) {
    const absDir = path.join(projectRoot, dir)
    const collected = await walkDir(absDir, (fullPath) => DOC_EXTS.has(path.extname(fullPath).toLowerCase()))
    files.push(...collected)
  }

  const rootEntries = fs.existsSync(projectRoot) ? await fs.promises.readdir(projectRoot) : []
  for (const entry of rootEntries) {
    if (/^README/i.test(entry)) {
      const fullPath = path.join(projectRoot, entry)
      if (fs.statSync(fullPath).isFile()) {
        files.push(fullPath)
      }
    }
  }

  const filtered = changedPaths
    ? files.filter((file) => shouldInclude(toPosix(path.relative(projectRoot, file)), changedPaths))
    : files

  return filtered
}

async function buildDocModel(projectRoot: string, changedPaths?: Set<string>): Promise<DocScanResult> {
  const files = await collectDocFiles(projectRoot, changedPaths)

  const phases = new Set<string>()
  const modules = new Set<string>()
  const guarantees = new Set<string>()
  const nonFeatures = new Set<string>()
  const references = new Set<string>()

  for (const file of files) {
    const content = await fs.promises.readFile(file, 'utf-8')
    for (const match of content.matchAll(PHASE_REGEX)) {
      phases.add(normalizeText(match[0]))
    }

    const lines = content.split(/\r?\n/)
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue

      const moduleName = extractModuleFromLine(line)
      if (moduleName) {
        modules.add(moduleName)
      }

      if (GUARANTEE_REGEX.test(line)) {
        guarantees.add(normalizeText(line))
      }

      if (NON_FEATURE_REGEX.test(line)) {
        nonFeatures.add(normalizeText(line))
      }

      for (const ref of line.matchAll(DOC_PATH_REGEX)) {
        references.add(toPosix(ref[0]))
      }
    }
  }

  return {
    model: {
      phases: uniqSorted(phases),
      modules: uniqSorted(modules),
      guarantees: uniqSorted(guarantees),
      nonFeatures: uniqSorted(nonFeatures),
    },
    references: uniqSorted(references),
    files: files.map((file) => toPosix(path.relative(projectRoot, file))),
  }
}

async function buildCodeModel(projectRoot: string, changedPaths?: Set<string>): Promise<CodeModel> {
  const codeRoot = path.join(projectRoot, CODE_DIR)
  const files = await walkDir(codeRoot, (fullPath) => {
    const ext = path.extname(fullPath).toLowerCase()
    return ext === '.ts' || ext === '.tsx'
  })

  const filteredFiles = changedPaths
    ? files.filter((file) => shouldInclude(toPosix(path.relative(projectRoot, file)), changedPaths))
    : files

  const modules = new Set<string>()
  const policies = new Set<string>()
  const enforcedGuarantees = new Set<string>()
  const phases = new Set<string>()

  for (const file of filteredFiles) {
    const relPath = toPosix(path.relative(codeRoot, file))
    const moduleId = relPath.replace(/\.[^.]+$/, '')
    modules.add(moduleId)

    const topLevel = moduleId.split('/')[0]
    if (topLevel) {
      modules.add(topLevel)
    }

    const content = await fs.promises.readFile(file, 'utf-8')

    for (const match of content.matchAll(POLICY_NAME_REGEX)) {
      policies.add(match[1])
    }

    const lines = content.split(/\r?\n/)
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue

      if (ENFORCEMENT_LINE_REGEX.test(line)) {
        enforcedGuarantees.add(normalizeText(line))
      }
      for (const match of line.matchAll(PHASE_REGEX)) {
        phases.add(normalizeText(match[0]))
      }
    }
  }

  return {
    modules: uniqSorted(modules),
    policies: uniqSorted(policies),
    enforcedGuarantees: uniqSorted(enforcedGuarantees),
    phases: uniqSorted(phases),
    files: filteredFiles.map((file) => toPosix(path.relative(projectRoot, file))),
  }
}

async function buildTestModel(projectRoot: string, changedPaths?: Set<string>): Promise<TestModel> {
  const testRoot = path.join(projectRoot, TEST_DIR)
  const files = await walkDir(testRoot, (fullPath) => ['.ts', '.tsx'].includes(path.extname(fullPath).toLowerCase()))

  const filteredFiles = changedPaths
    ? files.filter((file) => shouldInclude(toPosix(path.relative(projectRoot, file)), changedPaths))
    : files

  const testedGuarantees = new Set<string>()

  for (const file of filteredFiles) {
    const content = await fs.promises.readFile(file, 'utf-8')

    for (const match of content.matchAll(TEST_DESC_REGEX)) {
      testedGuarantees.add(normalizeText(match[1]))
    }

    for (const match of content.matchAll(EXPECT_MATCHER_REGEX)) {
      testedGuarantees.add(`matcher:${match[1]}`)
    }
  }

  return {
    testedGuarantees: uniqSorted(testedGuarantees),
    files: filteredFiles.map((file) => toPosix(path.relative(projectRoot, file))),
  }
}

function extractModuleFromLine(line: string): string | null {
  const labeled = line.match(
    /^(?:[-*]\s+|\d+\.\s+|#\s+|##\s+|###\s+)?(?:Module|Component|System|Service|Engine|Layer|API|Suite)\s*[:\-]\s*(.+)$/i
  )
  if (labeled) {
    return normalizeText(labeled[1])
  }

  const heading = line.match(/^(#+\s+)(.+)$/)
  if (heading) {
    const candidate = normalizeText(heading[2])
    if (candidate && candidate.length <= 120 && !/[.?!]$/.test(candidate)) {
      return candidate
    }
  }

  const bullet = line.match(/^(?:[-*]\s+|\d+\.\s+)(.+)$/)
  if (bullet) {
    const candidate = normalizeText(bullet[1])
    if (candidate && candidate.length <= 120 && !/[.?!]$/.test(candidate)) {
      return candidate
    }
  }

  return null
}

function compareModels(
  doc: DocModel,
  code: CodeModel,
  tests: TestModel,
  docReferences: string[],
  projectRoot: string
): RawIntegrityReport {
  const unimplementedDocs: string[] = []
  const undocumentedCode: string[] = []
  const untestedGuarantees: string[] = []
  const obsoleteReferences: string[] = []
  const ambiguousClaims: string[] = []

  const codeGuarantees = code.enforcedGuarantees.map((g) => g.toLowerCase())
  const codeGuaranteeSet = new Set(codeGuarantees)
  const codeModules = code.modules.map((m) => m.toLowerCase())
  const codeModuleSet = new Set(codeModules)
  const codePhases = new Set(code.phases.map((p) => p.toLowerCase()))

  for (const guarantee of doc.guarantees) {
    const normalized = guarantee.toLowerCase()
    const matched = Array.from(codeGuaranteeSet).some((g) => g.includes(normalized) || normalized.includes(g))
    if (!matched) {
      unimplementedDocs.push(`Guarantee not enforced in code: ${guarantee}`)
    }
    const wordCount = guarantee.split(/\s+/).length
    if (wordCount < 5) {
      ambiguousClaims.push(`Guarantee too vague/short: ${guarantee}`)
    }
  }

  for (const moduleName of doc.modules) {
    if (!codeModuleSet.has(moduleName.toLowerCase())) {
      unimplementedDocs.push(`Module documented but not found in code: ${moduleName}`)
    }
  }

  for (const phase of doc.phases) {
    if (!codePhases.has(phase.toLowerCase())) {
      unimplementedDocs.push(`Phase documented but not present in code: ${phase}`)
    }
  }

  const docModulesSet = new Set(doc.modules.map((m) => m.toLowerCase()))
  const docGuaranteesSet = new Set(doc.guarantees.map((g) => g.toLowerCase()))

  for (const codeModule of code.modules) {
    if (!docModulesSet.has(codeModule.toLowerCase())) {
      undocumentedCode.push(`Code module undocumented: ${codeModule}`)
    }
  }

  for (const policy of code.policies) {
    if (![...docGuaranteesSet].some((g) => g.includes(policy.toLowerCase()))) {
      undocumentedCode.push(`Policy/guard not documented: ${policy}`)
    }
  }

  const testGuaranteesSet = new Set(tests.testedGuarantees.map((t) => t.toLowerCase()))
  for (const guarantee of doc.guarantees) {
    const normalized = guarantee.toLowerCase()
    const covered = Array.from(testGuaranteesSet).some((t) => t.includes(normalized) || normalized.includes(t))
    if (!covered) {
      untestedGuarantees.push(`Guarantee lacks tests: ${guarantee}`)
    }
  }

  for (const ref of docReferences) {
    const candidate = path.join(projectRoot, ref)
    if (!fs.existsSync(candidate)) {
      obsoleteReferences.push(`Path referenced in docs missing: ${ref}`)
    }
  }

  return {
    undocumented_code: uniqSorted(undocumentedCode),
    unimplemented_docs: uniqSorted(unimplementedDocs),
    untested_guarantees: uniqSorted(untestedGuarantees),
    obsolete_references: uniqSorted(obsoleteReferences),
    ambiguous_claims: uniqSorted(ambiguousClaims),
  }
}

function buildSummary(
  report: RawIntegrityReport,
  doc: DocScanResult,
  code: CodeModel,
  tests: TestModel,
  options: CliOptions
): IntegrityReport['summary'] {
  const totalViolations =
    report.undocumented_code.length +
    report.unimplemented_docs.length +
    report.untested_guarantees.length +
    report.obsolete_references.length +
    report.ambiguous_claims.length

  return {
    total_violations: totalViolations,
    strict_mode: options.strict,
    changed_only: options.changedOnly,
    base_ref: options.baseRef,
    scanned: {
      docs: doc.files.length,
      code: code.files?.length || 0,
      tests: tests.files?.length || 0,
    },
    timestamp: new Date().toISOString(),
    issues_by_type: {
      undocumented_code: report.undocumented_code.length,
      unimplemented_docs: report.unimplemented_docs.length,
      untested_guarantees: report.untested_guarantees.length,
      obsolete_references: report.obsolete_references.length,
      ambiguous_claims: report.ambiguous_claims.length,
    },
  }
}

function compareWithBaseline(
  current: RawIntegrityReport,
  baselinePath: string,
  projectRoot: string
): BaselineDelta | undefined {
  const resolvedBaseline = path.isAbsolute(baselinePath) ? baselinePath : path.join(projectRoot, baselinePath)
  if (!fs.existsSync(resolvedBaseline)) {
    return undefined
  }

  try {
    const baseline = JSON.parse(fs.readFileSync(resolvedBaseline, 'utf-8')) as RawIntegrityReport
    const flatten = (report: RawIntegrityReport) => [
      ...report.undocumented_code.map((item) => `undocumented_code:${item}`),
      ...report.unimplemented_docs.map((item) => `unimplemented_docs:${item}`),
      ...report.untested_guarantees.map((item) => `untested_guarantees:${item}`),
      ...report.obsolete_references.map((item) => `obsolete_references:${item}`),
      ...report.ambiguous_claims.map((item) => `ambiguous_claims:${item}`),
    ]

    const baselineIssues = new Set(flatten(baseline))
    const currentIssues = new Set(flatten(current))

    const newIssues = [...currentIssues].filter((item) => !baselineIssues.has(item))
    const resolvedIssues = [...baselineIssues].filter((item) => !currentIssues.has(item))

    return {
      path: toPosix(path.relative(projectRoot, resolvedBaseline)),
      new_issues: newIssues,
      resolved_issues: resolvedIssues,
      baseline_issue_count: baselineIssues.size,
    }
  } catch (error) {
    console.warn('Warning: unable to read baseline file, skipping comparison.', (error as Error).message || error)
    return undefined
  }
}

function printSummary(report: IntegrityReport, doc: DocModel, code: CodeModel, tests: TestModel) {
  const summary = report.summary
  const status = summary && summary.total_violations === 0 ? 'CLEAN' : 'VIOLATIONS'
  console.log(`\nHuman-readable summary (${status}):`)
  if (summary) {
    console.log(
      `- Mode: strict=${summary.strict_mode} changed_only=${summary.changed_only} base=${summary.base_ref ?? 'n/a'}`
    )
    console.log(
      `- Scanned files: docs=${summary.scanned.docs} code=${summary.scanned.code} tests=${summary.scanned.tests}`
    )
  }
  console.log(`- Doc guarantees: ${doc.guarantees.length}`)
  console.log(`- Code enforced guarantees: ${code.enforcedGuarantees.length}`)
  console.log(`- Policies detected: ${code.policies.length}`)
  console.log(`- Test guarantees: ${tests.testedGuarantees.length}`)

  const printCategory = (label: string, items: string[]) => {
    if (items.length === 0) return
    const sample = items.slice(0, 8)
    console.log(`- ${label} (${items.length}):`)
    for (const item of sample) {
      console.log(`  - ${item}`)
    }
    if (items.length > sample.length) {
      console.log(`  ...and ${items.length - sample.length} more`)
    }
  }

  printCategory('Unimplemented docs', report.unimplemented_docs)
  printCategory('Undocumented code', report.undocumented_code)
  printCategory('Untested guarantees', report.untested_guarantees)
  printCategory('Obsolete references', report.obsolete_references)
  printCategory('Ambiguous guarantees', report.ambiguous_claims)

  if (report.baseline) {
    console.log(
      `- Baseline ${report.baseline.path}: +${report.baseline.new_issues.length} new, -${report.baseline.resolved_issues.length} resolved (prev ${report.baseline.baseline_issue_count})`
    )
  }
}

async function writeReport(outputPath: string, report: IntegrityReport, projectRoot: string): Promise<void> {
  const resolved = path.isAbsolute(outputPath) ? outputPath : path.join(projectRoot, outputPath)
  await fs.promises.mkdir(path.dirname(resolved), { recursive: true })
  await fs.promises.writeFile(resolved, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`Report written to ${toPosix(path.relative(projectRoot, resolved))}`)
}

async function main() {
  const options = parseArgs(process.argv)

  if (options.help) {
    printHelp()
    return
  }

  const projectRoot = process.cwd()
  const changedPaths = options.changedOnly ? resolveChangedPaths(projectRoot, options.baseRef) : undefined
  if (options.changedOnly && !changedPaths) {
    console.warn('Changed-only requested but could not resolve diff; scanning full repository.')
  }

  const docResult = await buildDocModel(projectRoot, changedPaths)
  const codeModel = await buildCodeModel(projectRoot, changedPaths)
  const testModel = await buildTestModel(projectRoot, changedPaths)

  const rawReport = compareModels(docResult.model, codeModel, testModel, docResult.references, projectRoot)
  const report: IntegrityReport = {
    ...rawReport,
    summary: buildSummary(rawReport, docResult, codeModel, testModel, options),
  }

  if (options.baseline) {
    const delta = compareWithBaseline(rawReport, options.baseline, projectRoot)
    if (delta) {
      report.baseline = delta
    }
  }

  if (options.output) {
    await writeReport(options.output, report, projectRoot)
  }

  console.log(JSON.stringify(report, null, 2))
  printSummary(report, docResult.model, codeModel, testModel)

  const hasViolations =
    rawReport.undocumented_code.length > 0 ||
    rawReport.unimplemented_docs.length > 0 ||
    rawReport.untested_guarantees.length > 0 ||
    rawReport.obsolete_references.length > 0 ||
    rawReport.ambiguous_claims.length > 0

  process.exit(hasViolations ? 1 : 0)
}

main().catch((error) => {
  console.error('Fatal error running doc-code integrity analyzer:', error)
  process.exit(1)
})

export type {
  DocModel,
  CodeModel,
  TestModel,
  IntegrityReport,
};
export {
  buildDocModel,
  buildCodeModel,
  buildTestModel,
  compareModels,
}
