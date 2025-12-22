import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

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

function runSupabaseOptional(command, args) {
  spawnSync(command, args, { stdio: 'ignore', shell: false })
}

const supabaseCli = resolveSupabaseCli()

const workdir = 'supabase/e2e'
const projectId = 'bookiji_e2e'

runSupabaseOptional(supabaseCli, ['stop', '--project-id', projectId, '--workdir', workdir, '--no-backup'])
cleanupSupabaseProject(projectId)

console.log('Local Supabase stopped.')

