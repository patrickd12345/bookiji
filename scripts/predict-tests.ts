#!/usr/bin/env tsx
/**
 * Predictive Test Selection & Sharding
 * 
 * Analyzes PR changes and suggests which tests to run and optimal shard count.
 * Uses heuristics + optional OpenAI refinement.
 */

import * as fs from 'fs'
import * as path from 'path'

interface TestPlan {
  risk: 'low' | 'medium' | 'high'
  tests: string[]
  shardCount: number
}

interface GitHubEvent {
  pull_request?: {
    number: number
    head: {
      ref: string
      sha: string
    }
  }
}

/**
 * Load test mapping from config
 */
function loadTestMap(): Record<string, string[]> {
  const mapPath = path.join(process.cwd(), 'tests', 'config', 'test-map.json')
  
  if (!fs.existsSync(mapPath)) {
    console.warn('⚠️  test-map.json not found. Using empty mapping.')
    return {}
  }

  try {
    return JSON.parse(fs.readFileSync(mapPath, 'utf-8'))
  } catch (error) {
    console.warn('⚠️  Failed to parse test-map.json:', error)
    return {}
  }
}

/**
 * Get changed files from GitHub event
 */
function getChangedFiles(): string[] {
  const eventPath = process.env.GITHUB_EVENT_PATH
  
  if (!eventPath || !fs.existsSync(eventPath)) {
    console.warn('⚠️  GITHUB_EVENT_PATH not found. Cannot detect changed files.')
    return []
  }

  try {
    const event: GitHubEvent = JSON.parse(fs.readFileSync(eventPath, 'utf-8'))
    
    // For PR events, we'd need to fetch the diff from GitHub API
    // For now, we'll use a simple heuristic based on common patterns
    // In a real implementation, you'd use: @actions/github to fetch PR files
    
    // Stub: return empty array and rely on path-based heuristics
    return []
  } catch (error) {
    console.warn('⚠️  Failed to parse GitHub event:', error)
    return []
  }

  // Alternative: use git diff if available
  try {
    const { execSync } = require('child_process')
    const baseRef = process.env.GITHUB_BASE_REF || 'main'
    const headRef = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || 'HEAD'
    
    const diff = execSync(`git diff --name-only origin/${baseRef}...${headRef}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    })
    
    return diff.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Map file paths to features
 */
function mapFilesToFeatures(files: string[]): string[] {
  const features: Set<string> = new Set()
  const testMap = loadTestMap()

  for (const file of files) {
    // Map by path patterns
    if (file.includes('/auth/') || file.includes('/login') || file.includes('/register')) {
      features.add('auth')
    }
    if (file.includes('/booking') || file.includes('/book/')) {
      features.add('booking')
    }
    if (file.includes('/payment') || file.includes('/stripe') || file.includes('/credits')) {
      features.add('payments')
    }
    if (file.includes('/admin/')) {
      features.add('admin')
    }
    if (file.includes('/vendor/') || file.includes('/provider')) {
      features.add('vendor')
    }
    if (file.includes('/email') || file.includes('/notifications')) {
      features.add('email')
    }
    if (file.includes('/api/')) {
      // API changes might affect multiple areas
      features.add('booking')
      features.add('payments')
    }
  }

  return Array.from(features)
}

/**
 * Determine risk level
 */
function assessRisk(files: string[], features: string[]): 'low' | 'medium' | 'high' {
  // Low risk: only docs, config, or non-critical files
  const lowRiskPatterns = [
    /\.md$/,
    /\.json$/,
    /\.yml$/,
    /\.yaml$/,
    /^docs\//,
    /^\.github\//,
    /^scripts\//,
    /^tests\//,
  ]

  const allLowRisk = files.every(f => 
    lowRiskPatterns.some(pattern => pattern.test(f))
  )

  if (allLowRisk && files.length > 0) {
    return 'low'
  }

  // High risk: core business logic, payments, auth, migrations
  const highRiskPatterns = [
    /\/api\/(payments|bookings|auth)/,
    /\/lib\/(stripe|booking|auth)/,
    /migrations\/.*\.sql$/,
    /\.env/,
  ]

  const hasHighRisk = files.some(f => 
    highRiskPatterns.some(pattern => pattern.test(f))
  )

  if (hasHighRisk || features.includes('payments') || features.includes('auth')) {
    return 'high'
  }

  return 'medium'
}

/**
 * Load quarantined tests
 */
function loadQuarantinedTests(): Set<string> {
  const quarantinePath = path.join(process.cwd(), 'ci-history', 'quarantined-tests.json')
  
  if (!fs.existsSync(quarantinePath)) {
    return new Set()
  }

  try {
    const quarantined = JSON.parse(fs.readFileSync(quarantinePath, 'utf-8'))
    return new Set(Object.keys(quarantined))
  } catch (error) {
    console.warn('⚠️  Failed to load quarantined tests:', error)
    return new Set()
  }
}

/**
 * Select tests based on features
 */
function selectTests(features: string[]): string[] {
  const testMap = loadTestMap()
  const quarantined = loadQuarantinedTests()
  const selected: Set<string> = new Set()

  for (const feature of features) {
    const tests = testMap[feature] || []
    for (const test of tests) {
      // Skip quarantined tests unless explicitly requested
      if (!quarantined.has(test)) {
        selected.add(test)
      } else {
        console.log(`⏭️  Skipping quarantined test: ${test}`)
      }
    }
  }

  return Array.from(selected)
}

/**
 * Determine shard count
 */
function determineShardCount(risk: string, testCount: number): number {
  if (risk === 'low') {
    return 1
  }

  if (risk === 'high' || testCount > 5) {
    return 4
  }

  if (testCount > 2) {
    return 2
  }

  return 1
}

/**
 * Optional OpenAI refinement
 */
async function refineWithAI(plan: TestPlan, files: string[]): Promise<TestPlan> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.log('ℹ️  OPENAI_API_KEY not set. Using heuristic plan.')
    return plan
  }

  try {
    // In a real implementation, you'd call OpenAI API here
    // For now, we'll just return the heuristic plan
    console.log('ℹ️  OpenAI refinement not implemented yet. Using heuristic plan.')
    return plan
  } catch (error) {
    console.warn('⚠️  OpenAI refinement failed:', error)
    return plan
  }
}

/**
 * Generate test plan
 */
async function generatePlan(): Promise<TestPlan> {
  console.log('🔮 Generating predictive test plan...')

  const changedFiles = getChangedFiles()
  console.log(`📝 Detected ${changedFiles.length} changed files`)

  const features = mapFilesToFeatures(changedFiles)
  console.log(`🎯 Detected features: ${features.join(', ') || 'none'}`)

  const risk = assessRisk(changedFiles, features)
  console.log(`⚠️  Risk level: ${risk.toUpperCase()}`)

  const tests = selectTests(features)
  console.log(`🧪 Selected ${tests.length} test files`)

  const shardCount = determineShardCount(risk, tests.length)
  console.log(`📊 Recommended shard count: ${shardCount}`)

  let plan: TestPlan = {
    risk,
    tests,
    shardCount,
  }

  // Optional AI refinement
  if (process.env.OPENAI_API_KEY) {
    plan = await refineWithAI(plan, changedFiles)
  }

  return plan
}

/**
 * Write plan to file
 */
function writePlan(plan: TestPlan) {
  const planPath = path.join(process.cwd(), 'ci-plan.json')
  
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2))
  console.log(`✅ Test plan written to: ${planPath}`)
  
  // Human-readable summary
  console.log('\n📋 Test Plan Summary:')
  console.log(`   Risk: ${plan.risk.toUpperCase()}`)
  console.log(`   Tests: ${plan.tests.length > 0 ? plan.tests.join(', ') : 'all tests'}`)
  console.log(`   Shards: ${plan.shardCount}`)
}

/**
 * Main execution
 */
async function main() {
  try {
    const plan = await generatePlan()
    writePlan(plan)
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to generate test plan:', error)
    
    // Write default plan on error
    const defaultPlan: TestPlan = {
      risk: 'medium',
      tests: [],
      shardCount: 2,
    }
    
    try {
      writePlan(defaultPlan)
    } catch {
      // Ignore
    }
    
    process.exit(0) // Don't block CI
  }
}

if (require.main === module) {
  main()
}

export { generatePlan, type TestPlan }
