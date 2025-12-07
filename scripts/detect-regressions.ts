#!/usr/bin/env tsx
/**
 * Detect Regressions
 * 
 * Analyzes recent CI metrics to detect performance and reliability regressions.
 * Identifies suspect commits and provides rollback recommendations.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { CIMetrics } from './export-ci-metrics.js'
import type { SLOSummary } from './export-slo.js'

interface RegressionMetric {
  current: number
  baseline: number
  percentChange: number
}

interface RegressionReport {
  status: 'ok' | 'degraded'
  metrics: {
    bookingP95?: RegressionMetric
    errorRate?: RegressionMetric
    lighthouseScore?: RegressionMetric
    testPassRate?: RegressionMetric
  }
  suspectCommits: string[]
  recommendation: 'rollback' | 'monitor' | 'investigate'
  timestamp: string
}

/**
 * Load recent CI metrics
 */
function loadRecentMetrics(limit: number = 20): CIMetrics[] {
  const metricsDir = path.join(process.cwd(), 'ci-metrics')
  
  if (!fs.existsSync(metricsDir)) {
    return []
  }

  try {
    const files = fs.readdirSync(metricsDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit)

    const metrics: CIMetrics[] = []

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(metricsDir, file), 'utf-8')
        const metric: CIMetrics = JSON.parse(content)
        metrics.push(metric)
      } catch {
        // Skip invalid files
      }
    }

    return metrics
  } catch {
    return []
  }
}

/**
 * Load SLO summary
 */
function loadSLOSummary(): SLOSummary | null {
  const sloPath = path.join(process.cwd(), 'slo', 'slo-summary.json')
  
  if (!fs.existsSync(sloPath)) {
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(sloPath, 'utf-8'))
  } catch {
    return null
  }
}

/**
 * Calculate median
 */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/**
 * Detect regressions in metrics
 */
function detectRegressions(metrics: CIMetrics[]): RegressionReport {
  if (metrics.length < 5) {
    return {
      status: 'ok',
      metrics: {},
      suspectCommits: [],
      recommendation: 'monitor',
      timestamp: new Date().toISOString(),
    }
  }

  // Split into baseline (older) and current (recent)
  const baselineCount = Math.min(10, Math.floor(metrics.length / 2))
  const baseline = metrics.slice(baselineCount)
  const current = metrics.slice(0, baselineCount)

  const report: RegressionReport = {
    status: 'ok',
    metrics: {},
    suspectCommits: [],
    recommendation: 'monitor',
    timestamp: new Date().toISOString(),
  }

  // Analyze booking P95 latency
  const baselineLatencies = baseline
    .map(m => m.metrics.e2eDuration || m.metrics.loadTestP95Latency)
    .filter((v): v is number => v !== undefined)
  
  const currentLatencies = current
    .map(m => m.metrics.e2eDuration || m.metrics.loadTestP95Latency)
    .filter((v): v is number => v !== undefined)

  if (baselineLatencies.length > 0 && currentLatencies.length > 0) {
    const baselineP95 = median(baselineLatencies)
    const currentP95 = median(currentLatencies)
    const percentChange = ((currentP95 - baselineP95) / baselineP95) * 100

    if (percentChange > 30) {
      report.metrics.bookingP95 = {
        current: Math.round(currentP95),
        baseline: Math.round(baselineP95),
        percentChange: Math.round(percentChange * 100) / 100,
      }
    }
  }

  // Analyze error rate
  const baselineErrors = baseline
    .map(m => {
      const total = m.metrics.testTotal || 0
      const failed = m.metrics.testFailed || 0
      return total > 0 ? failed / total : 0
    })
    .filter(v => v > 0)

  const currentErrors = current
    .map(m => {
      const total = m.metrics.testTotal || 0
      const failed = m.metrics.testFailed || 0
      return total > 0 ? failed / total : 0
    })
    .filter(v => v > 0)

  if (baselineErrors.length > 0 && currentErrors.length > 0) {
    const baselineErrorRate = median(baselineErrors)
    const currentErrorRate = median(currentErrors)

    if (currentErrorRate > 0.05 || currentErrorRate > baselineErrorRate * 2) {
      report.metrics.errorRate = {
        current: Math.round(currentErrorRate * 10000) / 100,
        baseline: Math.round(baselineErrorRate * 10000) / 100,
        percentChange: Math.round(((currentErrorRate - baselineErrorRate) / baselineErrorRate) * 100 * 100) / 100,
      }
    }
  }

  // Analyze Lighthouse score
  const baselineLighthouse = baseline
    .map(m => m.metrics.lighthouseScore)
    .filter((v): v is number => v !== undefined)

  const currentLighthouse = current
    .map(m => m.metrics.lighthouseScore)
    .filter((v): v is number => v !== undefined)

  if (baselineLighthouse.length > 0 && currentLighthouse.length > 0) {
    const baselineScore = median(baselineLighthouse)
    const currentScore = median(currentLighthouse)
    const percentChange = ((currentScore - baselineScore) / baselineScore) * 100

    if (percentChange < -10) {
      report.metrics.lighthouseScore = {
        current: Math.round(currentScore),
        baseline: Math.round(baselineScore),
        percentChange: Math.round(percentChange * 100) / 100,
      }
    }
  }

  // Analyze test pass rate
  const baselinePassRates = baseline.map(m => {
    const total = m.metrics.testTotal || 0
    const passed = m.metrics.testPassed || 0
    return total > 0 ? passed / total : 1
  })

  const currentPassRates = current.map(m => {
    const total = m.metrics.testTotal || 0
    const passed = m.metrics.testPassed || 0
    return total > 0 ? passed / total : 1
  })

  if (baselinePassRates.length > 0 && currentPassRates.length > 0) {
    const baselinePassRate = median(baselinePassRates)
    const currentPassRate = median(currentPassRates)
    const percentChange = ((currentPassRate - baselinePassRate) / baselinePassRate) * 100

    if (percentChange < -10) {
      report.metrics.testPassRate = {
        current: Math.round(currentPassRate * 10000) / 100,
        baseline: Math.round(baselinePassRate * 10000) / 100,
        percentChange: Math.round(percentChange * 100) / 100,
      }
    }
  }

  // Check SLO compliance
  const sloSummary = loadSLOSummary()
  if (sloSummary && !sloSummary.compliance.overall) {
    report.status = 'degraded'
  }

  // Determine overall status
  const hasRegressions = Object.keys(report.metrics).length > 0
  if (hasRegressions) {
    report.status = 'degraded'
  }

  // Identify suspect commits (last 3 runs with regressions)
  if (hasRegressions) {
    const suspectCommits = new Set<string>()
    for (let i = 0; i < Math.min(3, current.length); i++) {
      if (current[i]) {
        suspectCommits.add(current[i].commitSha)
      }
    }
    report.suspectCommits = Array.from(suspectCommits)
  }

  // Determine recommendation
  if (report.status === 'degraded') {
    const hasSevereRegression = 
      (report.metrics.bookingP95 && report.metrics.bookingP95.percentChange > 50) ||
      (report.metrics.errorRate && report.metrics.errorRate.current > 0.1)

    if (hasSevereRegression) {
      report.recommendation = 'rollback'
    } else {
      report.recommendation = 'investigate'
    }
  }

  return report
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Detecting regressions...')

  const metrics = loadRecentMetrics(20)
  console.log(`📊 Loaded ${metrics.length} recent metrics`)

  if (metrics.length < 5) {
    console.log('ℹ️  Insufficient data for regression detection (need at least 5 metrics)')
    const report: RegressionReport = {
      status: 'ok',
      metrics: {},
      suspectCommits: [],
      recommendation: 'monitor',
      timestamp: new Date().toISOString(),
    }
    saveReport(report)
    return
  }

  const report = detectRegressions(metrics)

  saveReport(report)

  console.log(`\n📊 Regression Report:`)
  console.log(`   Status: ${report.status.toUpperCase()}`)
  console.log(`   Recommendation: ${report.recommendation.toUpperCase()}`)
  if (report.suspectCommits.length > 0) {
    console.log(`   Suspect Commits: ${report.suspectCommits.map(s => s.substring(0, 7)).join(', ')}`)
  }
  if (Object.keys(report.metrics).length > 0) {
    console.log(`   Regressions detected in: ${Object.keys(report.metrics).join(', ')}`)
  } else {
    console.log(`   ✅ No regressions detected`)
  }
}

/**
 * Save regression report
 */
function saveReport(report: RegressionReport) {
  const regressionsDir = path.join(process.cwd(), 'regressions')
  if (!fs.existsSync(regressionsDir)) {
    fs.mkdirSync(regressionsDir, { recursive: true })
  }

  const reportPath = path.join(regressionsDir, 'regression-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`✅ Regression report saved to: ${reportPath}`)
}

if (require.main === module) {
  try {
    main()
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to detect regressions:', error)
    process.exit(0) // Don't fail CI
  }
}

export { detectRegressions, type RegressionReport }
