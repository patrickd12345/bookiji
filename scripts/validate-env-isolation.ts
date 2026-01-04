#!/usr/bin/env tsx
/**
 * CI helper: validate environment isolation rules.
 * - No .env.local present in repo root
 * - No implicit dotenv.config() without explicit path
 * - DOTENV_CONFIG_PATH is used in package.json scripts for e2e/navigation/dev/prod/staging
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

const root = process.cwd()

// 1. Ensure .env.local is not present
const envLocalPath = path.resolve(root, '.env.local')
if (fs.existsSync(envLocalPath)) {
  console.error('FAIL: .env.local exists in repo root - this file is banned. Remove it.')
  process.exit(1)
}

// 2. Scan for implicit dotenv.config() usages
const walk = (dir: string): string[] => {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue
      out.push(...walk(full))
    } else {
      out.push(full)
    }
  }
  return out
}

const files = walk(root).filter((f) => /\.(js|ts|mjs|tsx)$/.test(f))
const implicit: string[] = []
for (const f of files) {
  try {
    const c = fs.readFileSync(f, 'utf8')
    // detect any dotenv.config(...) usage (with or without args)
    if (/dotenv\.config\s*\(/.test(c)) implicit.push(f)
  } catch {
    // ignore
  }
}

if (implicit.length) {
  console.error('FAIL: Found implicit dotenv.config() calls (must use loadEnvFile/getRuntimeMode):')
  for (const f of implicit) console.error('  - ' + path.relative(root, f))
  process.exit(1)
}

// 3. Check package.json scripts for DOTENV_CONFIG_PATH usage for key scripts
const pkg = JSON.parse(fs.readFileSync(path.resolve(root, 'package.json'), 'utf8'))
const required = ['dev:start', 'staging:start', 'prod:start', 'e2e:seed', 'e2e:navigation']
const missing: string[] = []
for (const k of required) {
  const v = pkg.scripts?.[k]
  if (!v || !/DOTENV_CONFIG_PATH=/.test(v)) missing.push(k)
}
if (missing.length) {
  console.error('FAIL: package.json scripts missing DOTENV_CONFIG_PATH for:', missing.join(', '))
  process.exit(1)
}

console.log('OK: Environment isolation checks passed')
process.exit(0)

