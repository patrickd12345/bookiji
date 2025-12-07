#!/usr/bin/env tsx
/**
 * Update Test History
 * 
 * Tracks test execution statistics to enable flaky test detection and CI self-healing.
 * Called after Playwright test runs to update persistent test history.
 */

import * as fs from 'fs'
import * as path from 'path'

interface TestStats {
  runs: number
  failures: number
  flakyFailures: number
  avgDurationMs: number
  lastFailureAt?: string
  lastPassedAt?: string
  lastRunAt: string
}

interface TestHistory {
  [testPath: string]: TestStats
}

/**
 * Load existing test history
 */
function loadTestHistory(): TestHistory {
  const historyPath = path.join(process.cwd(), 'ci-history', 'tests.json')
  
  if (!fs.existsSync(historyPath)) {
    return {}
  }

  try {
    return JSON.parse(fs.readFileSync(historyPath, 'utf-8'))
  } catch (error) {
    console.warn('⚠️  Failed to parse test history:', error)
    return {}
  }
}

/**
 * Save test history
 */
function saveTestHistory(history: TestHistory) {
  const historyDir = path.join(process.cwd(), 'ci-history')
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true })
  }

  const historyPath = path.join(historyDir, 'tests.json')
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2))
  console.log(`✅ Test history saved to: ${historyPath}`)
}

/**
 * Parse Playwright JSON report
 */
function parsePlaywrightReport(): Array<{
  testPath: string
  passed: boolean
  duration: number
}> {
  const reportPath = path.join(process.cwd(), 'playwright-report', 'results.json')
  
  if (!fs.existsSync(reportPath)) {
    console.warn('⚠️  Playwright report not found:', reportPath)
    return []
  }

  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
    const results: Array<{ testPath: string; passed: boolean; duration: number }> = []

    // Parse Playwright results.json structure
    if (report.suites) {
      for (const suite of report.suites) {
        for (const spec of suite.specs || []) {
          const testPath = spec.file || spec.title || 'unknown'
          
          for (const test of spec.tests || []) {
            const outcome = test.outcome || 'unknown'
            const passed = outcome === 'expected'
            const duration = test.results?.[0]?.duration || 0

            results.push({
              testPath,
              passed,
              duration: Math.round(duration),
            })
          }
        }
      }
    }

    return results
  } catch (error) {
    console.warn('⚠️  Failed to parse Playwright report:', error)
    return []
  }
}

/**
 * Update exponential moving average
 */
function updateEMA(current: number, newValue: number, alpha: number = 0.3): number {
  return current === 0 ? newValue : alpha * newValue + (1 - alpha) * current
}

/**
 * Update test history from Playwright results
 */
function updateTestHistory() {
  console.log('📊 Updating test history...')

  const history = loadTestHistory()
  const results = parsePlaywrightReport()

  if (results.length === 0) {
    console.log('ℹ️  No test results found. Skipping history update.')
    return
  }

  console.log(`📝 Processing ${results.length} test results`)

  // Group results by test path
  const testGroups = new Map<string, Array<{ passed: boolean; duration: number }>>()
  
  for (const result of results) {
    if (!testGroups.has(result.testPath)) {
      testGroups.set(result.testPath, [])
    }
    testGroups.get(result.testPath)!.push({
      passed: result.passed,
      duration: result.duration,
    })
  }

  // Update history for each test
  for (const [testPath, testResults] of testGroups.entries()) {
    const stats = history[testPath] || {
      runs: 0,
      failures: 0,
      flakyFailures: 0,
      avgDurationMs: 0,
      lastRunAt: new Date().toISOString(),
    }

    // Update runs
    stats.runs += testResults.length

    // Check for failures
    const hasFailure = testResults.some(r => !r.passed)
    const hasPass = testResults.some(r => r.passed)

    if (hasFailure) {
      stats.failures += 1
      stats.lastFailureAt = new Date().toISOString()

      // Detect flaky: failed now but passed recently
      if (hasPass || stats.lastPassedAt) {
        const lastPassed = stats.lastPassedAt ? new Date(stats.lastPassedAt) : null
        const now = new Date()
        
        // If passed within last 24 hours, consider it flaky
        if (lastPassed && (now.getTime() - lastPassed.getTime()) < 24 * 60 * 60 * 1000) {
          stats.flakyFailures += 1
          console.log(`⚠️  Flaky failure detected: ${testPath}`)
        }
      }
    }

    if (hasPass) {
      stats.lastPassedAt = new Date().toISOString()
    }

    // Update average duration (exponential moving average)
    const avgDuration = testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length
    stats.avgDurationMs = Math.round(updateEMA(stats.avgDurationMs, avgDuration))
    stats.lastRunAt = new Date().toISOString()

    history[testPath] = stats
  }

  saveTestHistory(history)

  console.log(`✅ Updated history for ${testGroups.size} test files`)
}

/**
 * Main execution
 */
if (require.main === module) {
  try {
    updateTestHistory()
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to update test history:', error)
    process.exit(0) // Don't fail CI
  }
}

export { updateTestHistory, loadTestHistory, type TestHistory, type TestStats }
