#!/usr/bin/env node
// scripts/ai-test-loop.mjs
// Iteratively run Vitest and, on failures, ask local Ollama for a git patch.
// Apply the patch, then rerun until green or until MAX_ITERATIONS is reached.

import { spawnSync, execSync } from 'node:child_process'
import process from 'node:process'
import { config as loadEnv } from 'dotenv'

// Load standard .env then override with .env.local if present
loadEnv()
loadEnv({ path: '.env.local', override: false })

// Local Ollama integration
let ollamaService
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || process.env.NEXT_PUBLIC_LLM_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'codellama'

// Simple Ollama client for the script
class SimpleOllamaClient {
  constructor(endpoint, model) {
    this.endpoint = endpoint
    this.model = model
  }

  async generate(prompt) {
    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.1, // Low temperature for code generation
            top_p: 0.9,
            max_tokens: 2000,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.response
    } catch (error) {
      console.error('Ollama service error:', error)
      return null
    }
  }

  async isAvailable() {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`)
      return response.ok
    } catch {
      return false
    }
  }
}

const MAX_ITERATIONS = parseInt(process.env.AI_TEST_MAX_ITERATIONS || '5', 10)

function runTests() {
  console.log('🧪 Running tests')
  
  try {
    // Use execSync to capture output
    const stdout = execSync('pnpm test -- --reporter json', { 
      encoding: 'utf8',
      cwd: process.cwd()
    })
    
    console.log('📤 Test command stdout length:', stdout?.length || 0)
    return { status: 0, stdout: stdout || '' }
  } catch (error) {
    console.log('📤 Test command failed with status:', error.status)
    console.log('📤 Test command stdout length:', error.stdout?.length || 0)
    console.log('📤 Test command stderr length:', error.stderr?.length || 0)
    
    // Return the stdout even if tests failed
    return { status: error.status || 1, stdout: error.stdout || '' }
  }
}

function parseVitestJson(stdout) {
  try {
    console.log('🔍 Parsing test output')
    console.log('Output length:', stdout.length)
    console.log('First 200 chars:', stdout.substring(0, 200))
    
    // Extract the JSON part from the command output
    const lines = stdout.trim().split(/\n+/)
    console.log('Number of lines:', lines.length)
    
    let lastValidJson = null
    
    // Look for the JSON line (it should be the last line that starts with {)
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim()
      if (!line) continue
      
      // Skip command output lines
      if (line.startsWith('>') || line.startsWith('RUN') || line.startsWith('✓') || line.startsWith('❯') || line.startsWith('⎯')) {
        continue
      }
      
      // Try to parse as JSON
      if (line.startsWith('{')) {
        try {
          const parsed = JSON.parse(line)
          if (parsed && (parsed.numTotalTests || parsed.summary)) {
            lastValidJson = parsed
            console.log('✅ Found valid JSON at line', i)
            break
          }
        } catch {
          continue
        }
      }
    }
    
    if (!lastValidJson) {
      console.log('❌ Could not parse test results')
      console.log('Last few lines:', lines.slice(-5))
      return { failed: Infinity, total: 0, raw: null, lines: [], failingTests: [] }
    }
    
    // Extract test results from the parsed JSON
    const failed = lastValidJson.numFailedTests || lastValidJson.summary?.failures || 0
    const total = lastValidJson.numTotalTests || lastValidJson.summary?.tests || 0
    
    console.log(`📊 Test results: ${failed} failed, ${total} total`)
    
    // Extract failing test details
    const failingTests = []
    if (lastValidJson.testResults) {
      lastValidJson.testResults.forEach(suite => {
        if (suite.status === 'failed') {
          suite.assertionResults?.forEach(test => {
            if (test.status === 'failed') {
              failingTests.push({
                file: suite.name,
                test: test.fullName,
                error: test.failureMessages?.[0] || 'Unknown error'
              })
            }
          })
        }
      })
    }

    console.log(`🔍 Found ${failingTests.length} failing tests`)

    return {
      failed,
      total,
      raw: lastValidJson,
      lines: lines,
      failingTests
    }
  } catch (error) {
    console.error('Error parsing test results:', error)
    return { failed: Infinity, total: 0, raw: null, lines: [], failingTests: [] }
  }
}

async function callOllamaCodingAgent(testResults) {
  if (!ollamaService) {
    console.log('\n❓ Ollama not available – manual intervention required.')
    return null
  }

  // Handle case where test parsing failed
  if (!testResults.failingTests || testResults.failingTests.length === 0) {
    console.log('\n❌ No failing tests found or test parsing failed')
    return null
  }

  const systemPrompt = `You are a coding assistant that fixes failing tests.

IMPORTANT: Respond ONLY with a valid git diff. No explanations, no markdown formatting, no additional text.

Analyze the failing tests and generate a minimal git diff that fixes the issues.
Focus on the most critical failures first.

The diff should:
1. Fix the actual test failures
2. Be minimal and targeted  
3. Follow the existing code style
4. Include proper error handling where needed

Format: Start with "---" and end with the diff content only.`

  // Create a focused summary of failing tests
  const failingSummary = testResults.failingTests.map(test => 
    `FAIL: ${test.test}\nFile: ${test.file}\nError: ${test.error}`
  ).join('\n\n')

  const userPrompt = `Fix these failing tests by generating a git diff:

${failingSummary}

Generate a git diff that addresses these specific test failures.`

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

  const response = await ollamaService.generate(fullPrompt)
  
  if (!response) return null
  
  // Clean up the response to extract just the diff
  let diff = response.trim()
  
  // Remove markdown code blocks if present
  diff = diff.replace(/```diff\s*/g, '').replace(/```\s*$/g, '')
  
  // Remove explanations after the diff
  const diffEnd = diff.indexOf('\n\n')
  if (diffEnd > 0) {
    diff = diff.substring(0, diffEnd)
  }
  
  // Ensure it starts with a valid diff marker
  if (!diff.startsWith('---')) {
    console.log('❌ Invalid diff format generated by Ollama')
    console.log('Response:', response.substring(0, 200) + '…')
    return null
  }
  
  return diff
}

function applyPatch(diff) {
  const patchProcess = spawnSync('git', ['apply', '--cached', '-'], {
    input: diff,
    encoding: 'utf8'
  })
  if (patchProcess.status !== 0) {
    console.error('\n❌ Failed to apply patch returned by Ollama Coding-Agent')
    console.error('Patch content:', diff)
    process.exit(patchProcess.status || 1)
  }
  // commit the change automatically
  spawnSync('git', ['commit', '-am', 'chore(ai): automated test fix via Ollama'], { stdio: 'inherit' })
}

async function main() {
  // Initialize Ollama service
  ollamaService = new SimpleOllamaClient(OLLAMA_ENDPOINT, OLLAMA_MODEL)
  
  // Check if Ollama is available
  const ollamaAvailable = await ollamaService.isAvailable()
  if (!ollamaAvailable) {
    console.log('\n❌ Ollama not available at', OLLAMA_ENDPOINT)
    console.log('Please start Ollama with: ollama serve')
    process.exit(1)
  }

  console.log(`\n🤖 Using local Ollama at ${OLLAMA_ENDPOINT} with model ${OLLAMA_MODEL}`)

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    console.log(`\n🔁  AI-Test iteration ${i}/${MAX_ITERATIONS}`)

    const { status, stdout } = runTests()
    const summary = parseVitestJson(stdout)

    if (summary.failed === 0 && status === 0) {
      console.log('\n✅  All tests passed!')
      return
    }

    console.log(`\n❌  ${summary.failed} failing test(s) out of ${summary.total}.`)

    console.log('\n🤖 Calling Ollama for fixes')
    const diff = await callOllamaCodingAgent(summary)
    if (!diff) {
      console.log('\n🚪 Exiting loop – no diff returned.')
      process.exit(1)
    }

    console.log('\n📝 Generated patch, applying')
    applyPatch(diff)
  }

  console.error(`\n💥 Reached max iterations (${MAX_ITERATIONS}) with failures still present.`)
  process.exit(1)
}

main().catch(err => {
  console.error('Fatal error in ai-test loop:', err)
  process.exit(1)
}) 