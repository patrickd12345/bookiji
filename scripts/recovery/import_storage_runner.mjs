#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const script = process.platform === 'win32'
  ? path.join(__dirname, 'import_storage.ps1')
  : path.join(__dirname, 'import_storage.sh')

const cmd = process.platform === 'win32' ? 'powershell.exe' : 'bash'
const args = process.platform === 'win32'
  ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, ...process.argv.slice(2)]
  : [script, ...process.argv.slice(2)]

const res = spawnSync(cmd, args, { stdio: 'inherit' })
process.exit(res.status ?? 1)
