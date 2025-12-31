#!/usr/bin/env node
import { spawn } from 'node:child_process'

process.env.NODE_OPTIONS = process.env.NODE_OPTIONS ?? '--max-old-space-size=8192'
process.env.CI_SKIP_HEAVY_COMPONENT_TESTS = process.env.CI_SKIP_HEAVY_COMPONENT_TESTS ?? 'true'
const p = spawn('pnpm', ['vitest', 'run'], { stdio: 'inherit', shell: true })
p.on('exit', code => process.exit(code ?? 1))


