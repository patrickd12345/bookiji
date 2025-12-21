import fs from 'node:fs'
import path from 'node:path'

export type RunContext = {
  runId: string
  dir: string
  logFile: string
}

export function createRunContext(operation: string): RunContext {
  const baseDir = path.join(process.cwd(), 'recovery-logs')
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true })
  }

  const runId = process.env.RECOVERY_RUN_ID || `${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}_${operation}`
  const dir = path.join(baseDir, runId)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  const logFile = path.join(dir, 'run.log')
  return { runId, dir, logFile }
}

export function logLine(ctx: RunContext, message: string): void {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${message}`
  console.log(line)
  fs.appendFileSync(ctx.logFile, `${line}\n`)
}
