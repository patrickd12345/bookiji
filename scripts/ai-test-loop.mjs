#!/usr/bin/env node
// scripts/ai-test-loop.mjs
// Iteratively run Vitest and, on failures, ask an LLM ("Coding-Agent") for a git patch.
// Apply the patch, then rerun until green or until MAX_ITERATIONS is reached.

import { execSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'

// Load standard .env then override with .env.local if present
loadEnv()
loadEnv({ path: '.env.local', override: false })

// Optional OpenAI integration
let openai
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
if (OPENAI_API_KEY) {
  try {
    // Lazy import to avoid hard dep if user doesn\'t set key
    const { OpenAI } = await import('openai')
    openai = new OpenAI({ apiKey: OPENAI_API_KEY })
  } catch {
    // eslint-disable-next-line no-console
    console.warn('⚠️  openai package not available – falling back to manual mode')
  }
}

const MAX_ITERATIONS = parseInt(process.env.AI_TEST_MAX_ITERATIONS || '5', 10)
const TEST_CMD = ['pnpm', ['test', '--', '--reporter', 'json']]

function runTests() {
  // Spawn synchronously so we can capture full stdout JSON
  const result = spawnSync(TEST_CMD[0], TEST_CMD[1], { encoding: 'utf8' })
  const { stdout, stderr, status } = result
  if (stderr) process.stderr.write(stderr)
  return { status, stdout }
}

function parseVitestJson(stdout) {
  try {
    // Vitest prints one JSON per line – last line contains summary
    const lines = stdout.trim().split(/\n+/)
    const last = JSON.parse(lines[lines.length - 1])
    // Vitest json reporter returns fields similar to Jest (numFailedTests)
    const failed =
      last.summary?.failures ??
      last.numFailedTests ??
      last.numFailedTestSuites ??
      0
    const total =
      last.summary?.tests ??
      last.numTotalTests ??
      0

    return {
      failed,
      snapshotFailed: last.summary?.snapshot?.failed || 0,
      total,
      raw: last,
      lines
    }
  } catch (e) {
    return { failed: Infinity, total: 0, raw: null, lines: [] }
  }
}

async function callCodingAgent(errorLines) {
  if (!openai) {
    console.log('\n❓ OPENAI_API_KEY not set or openai pkg missing – manual intervention required.')
    return null
  }

  const systemPrompt = `You are Bookiji Coding-Agent.\n` +
    `You receive failing vitest output and must respond with a unified git diff that fixes the failure.\n` +
    `Only output the diff. Do not wrap it in markdown backticks.`

  const userPrompt = [
    'Vitest failure output:\n',
    errorLines.slice(-50).join('\n') // send last 50 lines for brevity
  ].join('')

  const chatCompletion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  })

  const diff = chatCompletion.choices[0].message.content.trim()
  return diff
}

function applyPatch(diff) {
  const patchProcess = spawnSync('git', ['apply', '--cached', '-'], {
    input: diff,
    encoding: 'utf8'
  })
  if (patchProcess.status !== 0) {
    console.error('\n❌ Failed to apply patch returned by Coding-Agent')
    process.exit(patchProcess.status || 1)
  }
  // commit the change automatically
  spawnSync('git', ['commit', '-am', 'chore(ai): automated test fix'], { stdio: 'inherit' })
}

async function main() {
  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    console.log(`\n🔁  AI-Test iteration ${i}/${MAX_ITERATIONS}`)

    const { status, stdout } = runTests()
    const summary = parseVitestJson(stdout)

    if (summary.failed === 0 && status === 0) {
      console.log('\n✅  All tests passed!')
      return
    }

    console.log(`\n❌  ${summary.failed} failing test(s) out of ${summary.total}.`)

    const diff = await callCodingAgent(summary.lines)
    if (!diff) {
      console.log('\n🚪 Exiting loop – no diff returned.')
      process.exit(1)
    }

    applyPatch(diff)
  }

  console.error(`\n💥 Reached max iterations (${MAX_ITERATIONS}) with failures still present.`)
  process.exit(1)
}

main().catch(err => {
  console.error('Fatal error in ai-test loop:', err)
  process.exit(1)
}) 