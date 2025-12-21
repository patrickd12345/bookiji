#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const run = (cmd, args) => {
  const res = spawnSync(cmd, args, { stdio: 'inherit' })
  if (res.status !== 0) {
    process.exit(res.status ?? 1)
  }
}

run('pnpm', ['recovery:verify:db', ...process.argv.slice(2)])
run('pnpm', ['recovery:verify:storage', ...process.argv.slice(2)])
