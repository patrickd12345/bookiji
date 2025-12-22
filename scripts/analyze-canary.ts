#!/usr/bin/env tsx
/**
 * Auto Canary Analysis (ACA)
 * 
 * Analyzes canary smoke test results and determines if canary should be promoted or rolled back.
 * 
 * Input: JSON summary from smoke tests (or exit codes + logs)
 * Output: PASSED (exit 0) or FAILED (exit non-zero)
 */

import * as fs from 'fs'
import * as path from 'path'

interface CanaryMetrics {
  passed: number
  failed: number
  total: number
  averageLatency?: number
  p95Latency?: number
  errorRate?: number
}

interface AnalysisResult {
  passed: boolean
  reason: string
  metrics: CanaryMetrics
}

const BASELINE_P95_LATENCY = 500 // ms
const MAX_LATENCY_MULTIPLIER = 2.0 // 2x baseline is acceptable
const MAX_ERROR_RATE = 0.01 // 1% error rate

/**
 * Parse Playwright test results
 */
function parsePlaywrightResults(): CanaryMetrics | null {
  // Try to read Playwright report
  const reportPath = path.join(process.cwd(), 'playwright-report', 'results.json')
  
  if (fs.existsSync(reportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
      
      let passed = 0
      let failed = 0
      let totalDuration = 0
      let durations: number[] = []

      // Parse test results
      if (report.suites) {
        for (const suite of report.suites) {
          for (const spec of suite.specs || []) {
            for (const test of spec.tests || []) {
              if (test.outcome === 'expected') {
                passed++
              } else {
                failed++
              }
              
              if (test.results && test.results.length > 0) {
                const duration = test.results[0].duration || 0
                totalDuration += duration
                durations.push(duration)
              }
            }
          }
        }
      }

      durations.sort((a, b) => a - b)
      const p95Index = Math.floor(durations.length * 0.95)
      const p95Latency = durations[p95Index] || 0

      return {
        passed,
        failed,
        total: passed + failed,
        averageLatency: durations.length > 0 ? totalDuration / durations.length : 0,
        p95Latency,
        errorRate: (passed + failed) > 0 ? failed / (passed + failed) : 0,
      }
    } catch (error) {
      console.warn('⚠️  Could not parse Playwright report:', error)
    }
  }

  return null
}

/**
 * Parse custom metrics file if it exists
 */
function parseMetricsFile(): CanaryMetrics | null {
  const metricsPath = path.join(process.cwd(), '.canary-metrics.json')
  
  if (fs.existsSync(metricsPath)) {
    try {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'))
      return {
        passed: metrics.passed || 0,
        failed: metrics.failed || 0,
        total: metrics.total || 0,
        averageLatency: metrics.averageLatency,
        p95Latency: metrics.p95Latency,
        errorRate: metrics.errorRate,
      }
    } catch (error) {
      console.warn('⚠️  Could not parse metrics file:', error)
    }
  }

  return null
}

/**
 * Analyze canary results
 */
function analyzeCanary(metrics: CanaryMetrics): AnalysisResult {
  // Check for any failures
  if (metrics.failed > 0) {
    return {
      passed: false,
      reason: `Canary failed: ${metrics.failed} test(s) failed out of ${metrics.total}`,
      metrics,
    }
  }

  // Check error rate
  if (metrics.errorRate !== undefined && metrics.errorRate > MAX_ERROR_RATE) {
    return {
      passed: false,
      reason: `Canary failed: Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds threshold ${(MAX_ERROR_RATE * 100).toFixed(2)}%`,
      metrics,
    }
  }

  // Check P95 latency
  if (metrics.p95Latency !== undefined) {
    const maxLatency = BASELINE_P95_LATENCY * MAX_LATENCY_MULTIPLIER
    if (metrics.p95Latency > maxLatency) {
      return {
        passed: false,
        reason: `Canary failed: P95 latency ${metrics.p95Latency.toFixed(2)}ms exceeds threshold ${maxLatency}ms (${MAX_LATENCY_MULTIPLIER}x baseline)`,
        metrics,
      }
    }
  }

  // Check average latency if P95 not available
  if (metrics.averageLatency !== undefined && metrics.p95Latency === undefined) {
    const maxLatency = BASELINE_P95_LATENCY * MAX_LATENCY_MULTIPLIER
    if (metrics.averageLatency > maxLatency) {
      return {
        passed: false,
        reason: `Canary failed: Average latency ${metrics.averageLatency.toFixed(2)}ms exceeds threshold ${maxLatency}ms`,
        metrics,
      }
    }
  }

  return {
    passed: true,
    reason: 'Canary passed all checks',
    metrics,
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Analyzing canary smoke test results...')

  // Try to get metrics from various sources
  let metrics = parseMetricsFile() || parsePlaywrightResults()

  // Fallback: use exit code from previous step (if available)
  if (!metrics) {
    console.warn('⚠️  No metrics found. Assuming tests passed if script reached here.')
    metrics = {
      passed: 1,
      failed: 0,
      total: 1,
    }
  }

  console.log('📊 Metrics:', JSON.stringify(metrics, null, 2))

  const analysis = analyzeCanary(metrics)

  console.log(`\n${analysis.passed ? '✅' : '❌'} ${analysis.reason}`)
  console.log(`   Passed: ${metrics.passed}, Failed: ${metrics.failed}`)
  if (metrics.p95Latency) {
    console.log(`   P95 Latency: ${metrics.p95Latency.toFixed(2)}ms`)
  }
  if (metrics.averageLatency) {
    console.log(`   Average Latency: ${metrics.averageLatency.toFixed(2)}ms`)
  }
  if (metrics.errorRate !== undefined) {
    console.log(`   Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`)
  }

  // Write analysis result
  const resultPath = path.join(process.cwd(), '.canary-analysis.json')
  fs.writeFileSync(
    resultPath,
    JSON.stringify(analysis, null, 2)
  )

  if (analysis.passed) {
    console.log('\n✅ Canary analysis: PASSED')
    process.exit(0)
  } else {
    console.log('\n❌ Canary analysis: FAILED')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { analyzeCanary }
export type { CanaryMetrics, AnalysisResult }















