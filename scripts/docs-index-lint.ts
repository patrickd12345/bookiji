#!/usr/bin/env tsx
import fs from 'fs'
import path from 'path'

const INDEX_PATH = path.join(process.cwd(), 'index.md')
const JARVIS_DIR = path.join(process.cwd(), 'docs', 'jarvis')

if (!fs.existsSync(INDEX_PATH)) {
  console.error('index.md not found at repo root')
  process.exit(1)
}

const indexContent = fs.readFileSync(INDEX_PATH, 'utf8')
const entryRegex = /`([^`]+\.md)`/g
const counts = new Map<string, number>()
const duplicates: string[] = []

for (const line of indexContent.split(/\r?\n/)) {
  let match: RegExpExecArray | null
  while ((match = entryRegex.exec(line))) {
    const target = match[1]
    const previous = counts.get(target) ?? 0
    counts.set(target, previous + 1)
    if (previous === 1) {
      duplicates.push(target)
    }
  }
}

const missingPhases: string[] = []
if (fs.existsSync(JARVIS_DIR)) {
  const phaseFiles = fs
    .readdirSync(JARVIS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^phase\d-.*\.md$/i.test(entry.name))
    .map((entry) => `docs/jarvis/${entry.name}`)

  for (const phasePath of phaseFiles) {
    if (!counts.has(phasePath)) {
      missingPhases.push(phasePath)
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
