#!/usr/bin/env tsx
import fs from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { getRuntimeMode } from '../../src/env/runtimeMode'
import { loadEnvFile } from '../../src/env/loadEnv'

// Load exactly one env file according to runtime mode
// For E2E scripts, default to e2e mode if not explicitly set
if (!process.env.RUNTIME_MODE && !process.env.DOTENV_CONFIG_PATH) {
  process.env.RUNTIME_MODE = 'e2e'
}
const mode = getRuntimeMode()
const { parsed: currentEnv } = loadEnvFile(mode)

const rl = createInterface({ input, output })

function sanitize(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, '')
}

function mask(value: string): string {
  if (value.length <= 8) return '*'.repeat(value.length)
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

function upsertEnv(lines: string[], key: string, value: string): string[] {
  const pattern = new RegExp(`^${key}=.*$`)
  let updated = false

  const next = lines.map(line => {
    if (pattern.test(line)) {
      updated = true
      return `${key}=${value}`
    }
    return line
  })

  if (!updated) {
    next.push(`${key}=${value}`)
  }

  return next
}

async function ask(question: string, fallback?: string): Promise<string> {
  const prompt = fallback ? `${question} (${fallback}): ` : `${question}: `
  const answer = await rl.question(prompt)
  if (answer.trim() === '' && fallback) return fallback
  return sanitize(answer)
}

async function main() {
  console.log('Remote Supabase configuration for E2E runs\n')

  const supabaseUrl = await ask('Supabase project URL', currentEnv.SUPABASE_URL || currentEnv.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = await ask('Supabase secret key', currentEnv.SUPABASE_SECRET_KEY)
  const publishableKey = await ask('Supabase publishable key', currentEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  const baseUrl = await ask('E2E base URL', currentEnv.E2E_BASE_URL || 'http://localhost:3000')

  rl.close()

  const lines = envContents.split(/\r?\n/)
  let updatedLines = [...lines]

  const updates: [string, string][] = [
    ['SUPABASE_URL', supabaseUrl],
    ['NEXT_PUBLIC_SUPABASE_URL', supabaseUrl],
    ['SUPABASE_SECRET_KEY', serviceRoleKey],
    ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', publishableKey],
    ['E2E_ALLOW_REMOTE_SUPABASE', 'true'],
    ['E2E_BASE_URL', baseUrl]
  ]

  for (const [key, value] of updates) {
    updatedLines = upsertEnv(updatedLines, key, value)
  }

  if (updates.some(([key]) => !lines.some(line => line.startsWith(key)))) {
    updatedLines.push('')
  }

  fs.writeFileSync(envPath, updatedLines.join('\n'))

  console.log('\n✅ .env.e2e updated for remote Supabase use:')
  console.log(` - SUPABASE_URL: ${supabaseUrl}`)
  console.log(` - SUPABASE_SECRET_KEY: ${mask(serviceRoleKey)}`)
  console.log(` - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${mask(publishableKey)}`)
  console.log(` - E2E_ALLOW_REMOTE_SUPABASE: true`)
  console.log('\nYou can now run:\n  pnpm e2e:check\n  pnpm e2e:seed\n  pnpm e2e')
}

main().catch(error => {
  console.error('❌ Failed to configure remote Supabase:', error)
  process.exit(1)
})
