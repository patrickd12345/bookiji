#!/usr/bin/env tsx
import 'dotenv/config'
import { Client } from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { createRunContext, logLine } from './_lib/log.js'
import { ensureRecoveryEnv, ensureRecoveryVars } from './_lib/guard.js'

type Manifest = {
  version?: number
  tables?: Record<string, number>
}

type Options = {
  manifest?: string
}

async function main() {
  ensureRecoveryEnv()
  const { databaseUrl, projectRef } = ensureRecoveryVars()
  const opts = parseArgs(process.argv.slice(2))
  const ctx = createRunContext('verify-db')
  logLine(ctx, `Recovery verify DB for project ${projectRef}`)

  const manifest = opts.manifest ? readManifest(opts.manifest) : undefined

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  const counts = await fetchTableCounts(client)
  const fkInvalid = await fetchInvalidFks(client)
  const safeQueryResults = await runSafeQueries(client)
  await client.end()

  const manifestDiff = manifest ? compareManifest(counts, manifest) : undefined

  const result = {
    projectRef,
    counts,
    fkInvalid,
    manifestDiff,
    safeQueryResults
  }

  const outFile = path.join(ctx.dir, 'verify_db.json')
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2))
  logLine(ctx, `JSON results: ${outFile}`)
  printHumanSummary(result, manifest ? opts.manifest : undefined)
}

function parseArgs(args: string[]): Options {
  const opts: Options = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--manifest' && args[i + 1]) {
      opts.manifest = args[i + 1]
      i++
    }
  }
  return opts
}

function readManifest(file: string): Manifest {
  const raw = fs.readFileSync(file, 'utf-8')
  return JSON.parse(raw)
}

async function fetchTableCounts(client: Client): Promise<Record<string, number>> {
  const { rows } = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name not like 'pg_%'
      and table_name not like 'supabase_%'
    order by table_name
  `)
  const counts: Record<string, number> = {}
  for (const row of rows) {
    const table = row.table_name as string
    const res = await client.query(`select count(*)::bigint as c from public."${table}"`)
    counts[table] = Number(res.rows[0].c)
  }
  return counts
}

async function fetchInvalidFks(client: Client): Promise<string[]> {
  const { rows } = await client.query(`
    select conname
    from pg_constraint
    where contype = 'f' and not convalidated
  `)
  return rows.map(r => r.conname as string)
}

function compareManifest(counts: Record<string, number>, manifest: Manifest) {
  const expected = manifest.tables ?? {}
  const diffs: { table: string; expected: number; actual: number }[] = []
  const missing: string[] = []
  const extra: string[] = []

  for (const [table, count] of Object.entries(expected)) {
    if (!(table in counts)) {
      missing.push(table)
    } else if (counts[table] !== count) {
      diffs.push({ table, expected: count, actual: counts[table] })
    }
  }
  for (const table of Object.keys(counts)) {
    if (!(table in expected)) {
      extra.push(table)
    }
  }
  return { diffs, missing, extra }
}

async function runSafeQueries(client: Client) {
  const queries = [
    { name: 'version', sql: 'select version()' },
    { name: 'public_table_count', sql: "select count(*) as table_count from information_schema.tables where table_schema = 'public'" },
    { name: 'policy_count', sql: 'select count(*) as policy_count from pg_policies' }
  ]
  const results: Record<string, { ok: boolean; rows?: unknown; error?: string }> = {}
  for (const q of queries) {
    try {
      const res = await client.query(q.sql)
      results[q.name] = { ok: true, rows: res.rows }
    } catch (err) {
      results[q.name] = { ok: false, error: (err as Error).message }
    }
  }
  return results
}

function printHumanSummary(result: {
  projectRef: string
  counts: Record<string, number>
  fkInvalid: string[]
  manifestDiff?: { diffs: unknown; missing: string[]; extra: string[] }
  safeQueryResults: Record<string, { ok: boolean; error?: string }>
}, manifestPath?: string) {
  console.log('--- Recovery DB verification ---')
  console.log(`Project: ${result.projectRef}`)
  console.log(`Tables: ${Object.keys(result.counts).length} (counts written to JSON)`)
  if (result.fkInvalid.length === 0) {
    console.log('Invalid FKs: none')
  } else {
    console.log(`Invalid FKs: ${result.fkInvalid.join(', ')}`)
  }
  if (manifestPath && result.manifestDiff) {
    const { diffs, missing, extra } = result.manifestDiff
    if ((diffs as { table: string }[]).length === 0 && missing.length === 0 && extra.length === 0) {
      console.log(`Manifest (${manifestPath}): OK`)
    } else {
      console.log(`Manifest (${manifestPath}): diffs=${(diffs as []).length}, missing=${missing.length}, extra=${extra.length}`)
    }
  }
  const failingSafe = Object.entries(result.safeQueryResults).filter(([, v]) => !v.ok)
  if (failingSafe.length === 0) {
    console.log('Safe queries: OK')
  } else {
    console.log(`Safe queries failed: ${failingSafe.map(([k, v]) => `${k} (${v.error})`).join('; ')}`)
  }
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
