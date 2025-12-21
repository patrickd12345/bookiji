import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { withDefaultStorageDryRun } from './args.mjs'

function fail(message) {
  console.error(message)
  process.exit(1)
}

if (process.env.RECOVERY_ENV !== '1') {
  fail('RECOVERY_ENV=1 is required.')
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const scriptPath = path.join(__dirname, '..', 'import_storage.ps1')
const scriptPathBash = path.join(__dirname, '..', 'import_storage.sh')

const args = withDefaultStorageDryRun(process.argv.slice(2), process.platform)

const isWin = process.platform === 'win32'
const command = isWin ? 'powershell' : 'bash'
const cmdArgs = isWin
  ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args]
  : [scriptPathBash, ...args]

const child = spawn(command, cmdArgs, { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 1))
