#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const results = []
const fixes = []

function addResult(name, ok, detail = '') {
  results.push({ name, ok, detail })
}

function addFix(message) {
  fixes.push(message)
}

function hasCommand(command) {
  if (process.platform === 'win32') {
    const res = spawnSync('where.exe', [command], { stdio: 'ignore' })
    return res.status === 0
  }
  const res = spawnSync('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' })
  return res.status === 0
}

function gitCheckIgnore(targetPath) {
  if (!fs.existsSync(path.join(root, '.git'))) return null
  if (!hasCommand('git')) return null
  const res = spawnSync('git', ['check-ignore', '-q', targetPath], { stdio: 'ignore' })
  return res.status === 0
}

function readGitignore() {
  const gitignorePath = path.join(root, '.gitignore')
  if (!fs.existsSync(gitignorePath)) return []
  return fs.readFileSync(gitignorePath, 'utf8').split(/\r?\n/)
}

function hasGitignoreLine(lines, value) {
  return lines.some((line) => line.trim() === value)
}

const gitignoreLines = readGitignore()

const recoveryEnvOk = process.env.RECOVERY_ENV === '1'
addResult('RECOVERY_ENV=1 required', recoveryEnvOk, recoveryEnvOk ? '' : 'Set RECOVERY_ENV=1 before running recovery commands.')
if (!recoveryEnvOk) {
  addFix('export RECOVERY_ENV=1')
  addFix('$env:RECOVERY_ENV="1"')
}

const envRecoveryPath = path.join(root, '.env.recovery')
const envRecoveryExists = fs.existsSync(envRecoveryPath)
addResult('.env.recovery present', envRecoveryExists, envRecoveryExists ? '' : 'Create .env.recovery from .env.recovery.example.')
if (!envRecoveryExists) {
  addFix('cp .env.recovery.example .env.recovery')
}

const envIgnored = gitCheckIgnore('.env.recovery')
if (envIgnored === null) {
  const hasEnvIgnore = hasGitignoreLine(gitignoreLines, '.env*')
  const hasEnvException = hasGitignoreLine(gitignoreLines, '!.env.recovery.example')
  addResult('.env.recovery ignored by git', hasEnvIgnore && hasEnvException, 'Expected .env* ignore and .env.recovery.example exception.')
  if (!(hasEnvIgnore && hasEnvException)) {
    addFix('Add these lines to .gitignore:')
    addFix('.env*')
    addFix('!.env.recovery.example')
  }
} else {
  addResult('.env.recovery ignored by git', envIgnored, 'Add .env.recovery to .gitignore.')
  if (!envIgnored) {
    addFix('Add these lines to .gitignore:')
    addFix('.env*')
    addFix('!.env.recovery.example')
  }
}

const logsIgnored = gitCheckIgnore('recovery-logs/')
if (logsIgnored === null) {
  addResult('recovery-logs/ ignored by git', hasGitignoreLine(gitignoreLines, '/recovery-logs/'), 'Add /recovery-logs/ to .gitignore.')
  if (!hasGitignoreLine(gitignoreLines, '/recovery-logs/')) {
    addFix('Add this line to .gitignore:')
    addFix('/recovery-logs/')
  }
} else {
  addResult('recovery-logs/ ignored by git', logsIgnored, 'Add /recovery-logs/ to .gitignore.')
  if (!logsIgnored) {
    addFix('Add this line to .gitignore:')
    addFix('/recovery-logs/')
  }
}

const artifactsIgnored = gitCheckIgnore('recovery-artifacts/')
if (artifactsIgnored === null) {
  addResult('recovery-artifacts/ ignored by git', hasGitignoreLine(gitignoreLines, '/recovery-artifacts/'), 'Add /recovery-artifacts/ to .gitignore.')
  if (!hasGitignoreLine(gitignoreLines, '/recovery-artifacts/')) {
    addFix('Add this line to .gitignore:')
    addFix('/recovery-artifacts/')
  }
} else {
  addResult('recovery-artifacts/ ignored by git', artifactsIgnored, 'Add /recovery-artifacts/ to .gitignore.')
  if (!artifactsIgnored) {
    addFix('Add this line to .gitignore:')
    addFix('/recovery-artifacts/')
  }
}

for (const tool of ['psql', 'pg_restore', 'supabase']) {
  const ok = hasCommand(tool)
  addResult(`${tool} available`, ok, ok ? '' : `Install ${tool} and ensure it is on PATH.`)
  if (!ok && tool === 'psql') {
    addFix('Install PostgreSQL client tools:')
    addFix('macOS (Homebrew): brew install libpq && brew link --force libpq')
    addFix('Ubuntu/Debian: sudo apt-get install postgresql-client')
    addFix('Windows (winget): winget install PostgreSQL.PostgreSQL')
  }
}

const failed = results.filter((r) => !r.ok)

console.log('Recovery doctor:')
for (const result of results) {
  const prefix = result.ok ? 'OK ' : 'FAIL'
  const detail = result.ok || !result.detail ? '' : ` - ${result.detail}`
  console.log(`${prefix} ${result.name}${detail}`)
}

if (failed.length > 0) {
  console.error(`\nRecovery doctor found ${failed.length} issue(s).`)
  if (fixes.length > 0) {
    console.error('\nSuggested fixes:')
    for (const fix of fixes) {
      console.error(`- ${fix}`)
    }
  }
  process.exit(1)
}

console.log('\nRecovery doctor passed.')
