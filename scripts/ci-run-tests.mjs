#!/usr/bin/env node
import { spawn } from 'node:child_process'

const p = spawn('pnpm', ['vitest', 'run'], { stdio: 'inherit', shell: true })
p.on('exit', code => process.exit(code ?? 1))


