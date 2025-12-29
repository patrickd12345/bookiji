#!/usr/bin/env tsx
import fs from 'fs'
import path from 'path'

const INDEX_PATH = path.join(process.cwd(), 'docs', 'index.md')
const JARVIS_DIR = path.join(process.cwd(), 'docs', 'jarvis')

if (!fs.existsSync(INDEX_PATH)) {
  console.error('docs/index.md not found')
  process.exit(1)
}

const indexContent = fs.readFileSync(INDEX_PATH, 'utf8')
const mdLinkRegex = /\[[^\]]+\]\(([^)#]+\.md)/g
const codeLinkRegex = /`([^`]+\.md)`/g

const counts = new Map<string, number>()
const duplicates: string[] = []

function recordLink(raw: string) {
  const withoutFragment = raw.split('#')[0]
  const normalized = path.normalize(withoutFragment.replace(/^\.\//, '')).replace(/\\/g, '/')
  const previous = counts.get(normalized) ?? 0
  counts.set(normalized, previous + 1)
  if (previous === 1) {
    duplicates.push(normalized)
  }
}

for (const line of indexContent.split(/\r?\n/)) {
  let mdMatch: RegExpExecArray | null
  let codeMatch: RegExpExecArray | null

  while ((mdMatch = mdLinkRegex.exec(line))) {
    recordLink(mdMatch[1])
  }

  while ((codeMatch = codeLinkRegex.exec(line))) {
    recordLink(codeMatch[1])
  }
}

const missingPhases: string[] = []
if (fs.existsSync(JARVIS_DIR)) {
  const phaseFiles = fs
    .readdirSync(JARVIS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^phase\d-.*\.md$/i.test(entry.name))

  for (const phase of phaseFiles) {
    const relativePath = path.join('docs', 'jarvis', phase.name).replace(/\\/g, '/')
    const altRelativePath = path.join('jarvis', phase.name).replace(/\\/g, '/')
    if (!counts.has(relativePath) && !counts.has(altRelativePath)) {
      missingPhases.push(relativePath)
    }
  }
}

if (duplicates.length || missingPhases.length) {
  console.error('🚨 docs/index.md lint failed')
  if (duplicates.length) {
    console.error('Duplicate entries detected:')
    for (const dup of duplicates) {
      console.error(`  - ${dup}`)
    }
  }
  if (missingPhases.length) {
    console.error('Missing Jarvis phase links:')
    for (const missing of missingPhases) {
      console.error(`  - ${missing}`)
    }
  }
  process.exit(1)
}

console.log('docs/index.md lint passed')
