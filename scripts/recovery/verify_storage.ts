// @env-allow-legacy-dotenv
#!/usr/bin/env tsx
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { ensureRecoveryEnv, ensureRecoveryProjectRef } from './_lib/guard.js'
import { createRunContext, logLine } from './_lib/log.js'

type ManifestObject = { path: string; size: number; etag?: string }
type Manifest = { version?: number; bucket?: string; objects: ManifestObject[] }

type Options = {
  manifest: string
  actualRoot?: string
}

function parseArgs(argv: string[]): Options {
  let manifest: string | undefined
  let actualRoot: string | undefined
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--manifest' && argv[i + 1]) {
      manifest = argv[i + 1]; i++
    } else if (argv[i] === '--actual' && argv[i + 1]) {
      actualRoot = argv[i + 1]; i++
    }
  }
  if (!manifest) {
    throw new Error('Usage: verify_storage --manifest <path> [--actual <dir>]')
  }
  return { manifest, actualRoot }
}

function readManifest(file: string): Manifest {
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

type Summary = {
  manifestCount: number
  actualCount?: number
  manifestSize: number
  actualSize?: number
  missing: ManifestObject[]
  unexpected: ManifestObject[]
  sizeMismatch: { path: string; expected: number; actual: number }[]
  etagMismatch: { path: string; expected?: string; actual?: string }[]
}

function hashFile(file: string): string {
  const h = crypto.createHash('md5')
  h.update(fs.readFileSync(file))
  return h.digest('hex')
}

function loadActualObjects(root: string): ManifestObject[] {
  const files: ManifestObject[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else {
        const rel = path.relative(root, full).replace(/\\/g, '/')
        const stat = fs.statSync(full)
        files.push({ path: rel, size: stat.size, etag: hashFile(full) })
      }
    }
  }
  walk(root)
  return files
}

function compare(manifest: Manifest, actual: ManifestObject[] | undefined): Summary {
  const manifestMap = new Map(manifest.objects.map(o => [o.path, o]))
  const actualMap = new Map((actual ?? []).map(o => [o.path, o]))

  const missing: ManifestObject[] = []
  const unexpected: ManifestObject[] = []
  const sizeMismatch: { path: string; expected: number; actual: number }[] = []
  const etagMismatch: { path: string; expected?: string; actual?: string }[] = []

  for (const [p, obj] of manifestMap.entries()) {
    const act = actualMap.get(p)
    if (!act) {
      missing.push(obj)
    } else {
      if (obj.size !== act.size) {
        sizeMismatch.push({ path: p, expected: obj.size, actual: act.size })
      }
      if (obj.etag && act.etag && obj.etag !== act.etag) {
        etagMismatch.push({ path: p, expected: obj.etag, actual: act.etag })
      }
    }
  }
  for (const [p, obj] of actualMap.entries()) {
    if (!manifestMap.has(p)) {
      unexpected.push(obj)
    }
  }

  return {
    manifestCount: manifest.objects.length,
    actualCount: actual?.length,
    manifestSize: manifest.objects.reduce((s, o) => s + (o.size ?? 0), 0),
    actualSize: actual?.reduce((s, o) => s + (o.size ?? 0), 0),
    missing,
    unexpected,
    sizeMismatch,
    etagMismatch
  }
}

function printSummary(summary: Summary, manifestPath: string, actualRoot?: string) {
  console.log('--- Recovery storage verification ---')
  console.log(`Manifest: ${manifestPath} (${summary.manifestCount} objects, ${summary.manifestSize} bytes)`)
  if (actualRoot) {
    console.log(`Actual scan: ${actualRoot} (${summary.actualCount} objects, ${summary.actualSize} bytes)`)
  } else {
    console.log('No actual scan provided (--actual). Manifest-only validation.')
  }
  if (summary.missing.length === 0 && summary.unexpected.length === 0 && summary.sizeMismatch.length === 0 && summary.etagMismatch.length === 0) {
    console.log('Result: OK (no mismatches)')
  } else {
    console.log(`Mismatches: missing=${summary.missing.length}, unexpected=${summary.unexpected.length}, sizeMismatch=${summary.sizeMismatch.length}, etagMismatch=${summary.etagMismatch.length}`)
  }
}

async function main() {
  ensureRecoveryEnv()
  const { projectRef } = ensureRecoveryProjectRef()
  const opts = parseArgs(process.argv.slice(2))
  const ctx = createRunContext('verify-storage')
  logLine(ctx, `Recovery verify storage for project ${projectRef}`)

  const manifest = readManifest(opts.manifest)
  const actual = opts.actualRoot ? loadActualObjects(opts.actualRoot) : undefined
  const summary = compare(manifest, actual)

  const outFile = path.join(ctx.dir, 'verify_storage.json')
  fs.writeFileSync(outFile, JSON.stringify(summary, null, 2))
  logLine(ctx, `JSON results: ${outFile}`)
  printSummary(summary, opts.manifest, opts.actualRoot)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
