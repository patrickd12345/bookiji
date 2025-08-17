import { promises as fs } from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'

async function getAllFiles(dir: string, extRegex = /\.(ts|tsx)$/): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip node_modules and test directories themselves
      if (entry.name === 'node_modules' || entry.name === 'tests') continue
      files.push(...await getAllFiles(fullPath, extRegex))
    } else if (extRegex.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

// Sanity check to make sure no deprecated marketplace references sneak in
// This protects against future "Picasso commits" adding the route back.

test('codebase sanity – no deprecated marketplace route', async () => {
  const projectRoot = path.join(__dirname, '..', 'src')
  const files = await getAllFiles(projectRoot)
  const offenders: string[] = []

  for (const file of files) {
    const text = await fs.readFile(file, 'utf8')
    if (text.includes('/marketplace')) {
      offenders.push(path.relative(projectRoot, file))
    }
  }

  expect(offenders).toEqual([])
}) 