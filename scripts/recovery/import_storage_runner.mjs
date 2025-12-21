#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { withDefaultStorageDryRun } from './_lib/args.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const script = process.platform === 'win32'
  ? path.join(__dirname, 'import_storage.ps1')
  : path.join(__dirname, 'import_storage.sh')

const cmd = process.platform === 'win32' ? 'powershell.exe' : 'bash'
const userArgs = process.argv.slice(2)
const finalArgs = withDefaultStorageDryRun(userArgs, process.platform)
const args = process.platform === 'win32'
  ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, ...finalArgs]
  : [script, ...finalArgs]

const res = spawnSync(cmd, args, { stdio: 'inherit' })
process.exit(res.status ?? 1)
