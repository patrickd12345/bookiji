#!/usr/bin/env tsx
/**
 * CI helper: validate environment isolation rules.
 * - No .env.local present in repo root
 * - No dotenv usage unless file has @env-allow-legacy-dotenv marker
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

// 2. Scan for dotenv usage (config() or import 'dotenv/config')
const walk = (dir: string): string[] => {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Ignore common build/dependency directories
      if (['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) continue
      out.push(...walk(full))
    } else {
      out.push(full)
    }
  }
  return out
}

const files = walk(root).filter((f) => /\.(js|ts|mjs|tsx)$/.test(f))
const violations: string[] = []
const exempted: string[] = []

for (const f of files) {
  try {
    // Skip the loader itself - it legitimately uses dotenv
    if (f.includes('src/env/loadEnv.ts') || f.includes('src\\env\\loadEnv.ts')) continue
    // Skip the validator itself
    if (f.includes('validate-env-isolation.ts')) continue
    
    const c = fs.readFileSync(f, 'utf8')
    
    // Check if file has exemption marker (must be at the very top, first 5 lines)
    const firstLines = c.split('\n').slice(0, 5).join('\n')
    const hasExemption = /\/\/\s*@env-allow-legacy-dotenv/.test(firstLines)
    
    // Detect dotenv usage (comprehensive patterns)
    const hasDotenvConfig = /dotenv\.config\s*\(/.test(c)
    const hasDotenvImportConfig = /import\s+['"]dotenv\/config['"]/.test(c)
    const hasDotenvRequireConfig = /require\s*\(\s*['"]dotenv\/config['"]\s*\)/.test(c)
    const hasDotenvImport = /import\s+.*\s+from\s+['"]dotenv['"]/.test(c)
    const hasDotenvRequire = /require\s*\(\s*['"]dotenv['"]\s*\)/.test(c)
    
    if (hasDotenvConfig || hasDotenvImportConfig || hasDotenvRequireConfig || hasDotenvImport || hasDotenvRequire) {
      if (hasExemption) {
        exempted.push(f)
      } else {
        violations.push(f)
      }
    }
  } catch {
    // ignore read errors
  }
}

if (violations.length) {
  console.error('FAIL: Found dotenv usage without @env-allow-legacy-dotenv marker:')
  for (const f of violations) console.error('  - ' + path.relative(root, f))
  console.error('\nTo exempt a manual script, add this as the FIRST LINE:')
  console.error('  // @env-allow-legacy-dotenv')
  process.exit(1)
}

if (exempted.length > 0) {
  console.log(`OK: ${exempted.length} file(s) exempted with @env-allow-legacy-dotenv marker`)
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
if (exempted.length > 0) {
  console.log(`   (${exempted.length} file(s) exempted with @env-allow-legacy-dotenv marker)`)
}
process.exit(0)

