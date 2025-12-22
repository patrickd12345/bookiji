import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function runOptional(command, args) {
  spawnSync(command, args, { stdio: 'ignore', shell: true })
}

function resolveSupabaseCli() {
  if (process.env.SUPABASE_CLI_PATH && fs.existsSync(process.env.SUPABASE_CLI_PATH)) {
    return process.env.SUPABASE_CLI_PATH
  }

  const result = spawnSync('where.exe', ['supabase'], { encoding: 'utf8', shell: false })
  const lines = String(result.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const nonLocal = lines.find((p) => !p.toLowerCase().includes(`node_modules${path.sep}.bin`))
  return nonLocal || 'supabase'
}

const supabaseCli = resolveSupabaseCli()

function runSupabase(args) {
  const result = spawnSync(supabaseCli, args, { stdio: 'inherit', shell: false })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function runSupabaseOptional(args) {
  spawnSync(supabaseCli, args, { stdio: 'ignore', shell: false })
}

function listLines(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', shell: true })
  if (result.status !== 0) return []
  return String(result.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function cleanupSupabaseProject(projectId) {
  const label = `com.supabase.cli.project=${projectId}`
  const containerIds = listLines('docker', ['ps', '-aq', '--filter', `label=${label}`])
  if (containerIds.length > 0) {
    spawnSync('docker', ['rm', '-f', ...containerIds], { stdio: 'ignore', shell: false })
  }

  const volumeNames = listLines('docker', ['volume', 'ls', '-q', '--filter', `label=${label}`])
  if (volumeNames.length > 0) {
    spawnSync('docker', ['volume', 'rm', ...volumeNames], { stdio: 'ignore', shell: false })
  }
}

function runSqlFile(containerName, sqlPath) {
  const resolved = path.resolve(process.cwd(), sqlPath)
  if (!fs.existsSync(resolved)) return
  const sql = fs.readFileSync(resolved, 'utf8')
  const result = spawnSync('docker', ['exec', '-i', containerName, 'psql', '-U', 'postgres', '-d', 'postgres'], {
    input: sql,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: false,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function canConnectDocker() {
  const result = spawnSync('docker', ['version'], { stdio: 'ignore', shell: true })
  return result.status === 0
}

if (!canConnectDocker()) {
  console.error(
    [
      'Docker is not reachable.',
      'Start Docker Desktop (or your Docker daemon) and re-run `pnpm supabase:start`.',
      'If you are on Windows, ensure the current Docker context is running (e.g. `docker context ls`).',
    ].join('\n')
  )
  process.exit(1)
}

const workdir = 'supabase/e2e'
const projectId = 'bookiji_e2e'
const dbContainer = `supabase_db_${projectId}`

// Ensure a clean, deterministic E2E stack.
runSupabaseOptional(['stop', '--project-id', projectId, '--workdir', workdir, '--no-backup'])
cleanupSupabaseProject(projectId)

runSupabase(['start', '--workdir', workdir])
runSupabase(['db', 'reset', '--workdir', workdir, '--local', '--yes'])

runSqlFile(dbContainer, 'supabase/e2e/compat.sql')

console.log('Local Supabase ready: http://localhost:54321')
console.log('E2E env defaults live in `.env.e2e`.')
