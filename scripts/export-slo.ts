#!/usr/bin/env tsx
/**
 * Export SLO/SLA Metrics
 * 
 * Aggregates CI metrics to compute SLO compliance and generates dashboard-ready JSON.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { CIMetrics } from './export-ci-metrics'

interface SLOSummary {
  timestamp: string
  period: string
  targets: {
    bookingLatencyMs: number
    uptime: number
  }
  metrics: {
    passRate: number
    failRate: number
    bookingP50Latency?: number
    bookingP95Latency?: number
    uptimeApprox: number
    totalRuns: number
    successfulRuns: number
    failedRuns: number
  }
  compliance: {
    bookingLatency: boolean
    uptime: boolean
    overall: boolean
  }
}

interface SLOTimeseries {
  timestamp: string
  runs: Array<{
    timestamp: string
    commitSha: string
    passRate: number
    bookingP95Latency?: number
    passed: boolean
  }>
}

/**
 * Load recent CI metrics
 */
function loadRecentMetrics(limit: number = 50): CIMetrics[] {
  const metricsDir = path.join(process.cwd(), 'ci-metrics')
  
  if (!fs.existsSync(metricsDir)) {
    console.warn('⚠️  ci-metrics directory not found')
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
      } catch (error) {
        console.warn(`⚠️  Failed to parse ${file}:`, error)
      }
    }

    return metrics
  } catch (error) {
    console.warn('⚠️  Failed to load metrics:', error)
    return []
  }
}

/**
 * Compute SLO summary
 */
function computeSLOSummary(metrics: CIMetrics[]): SLOSummary {
  const targetLatency = parseInt(process.env.SLO_TARGET_BOOKING_LATENCY_MS || '500', 10)
  const targetUptime = parseFloat(process.env.SLO_TARGET_UPTIME || '99.9')

  if (metrics.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      period: 'insufficient_data',
      targets: {
        bookingLatencyMs: targetLatency,
        uptime: targetUptime,
      },
      metrics: {
        passRate: 0,
        failRate: 0,
        uptimeApprox: 0,
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
      },
      compliance: {
        bookingLatency: false,
        uptime: false,
        overall: false,
      },
    }
  }

  // Aggregate metrics
  let totalTests = 0
  let passedTests = 0
  let failedTests = 0
  const latencies: number[] = []
  let successfulRuns = 0
  let failedRuns = 0

  for (const metric of metrics) {
    const passed = metric.metrics.testPassed || 0
    const failed = metric.metrics.testFailed || 0
    const total = metric.metrics.testTotal || 0

    totalTests += total
    passedTests += passed
    failedTests += failed

    if (metric.metrics.e2eDuration) {
      latencies.push(metric.metrics.e2eDuration)
    }

    if (failed === 0 && total > 0) {
      successfulRuns++
    } else if (failed > 0) {
      failedRuns++
    }
  }

  const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0
  const failRate = totalTests > 0 ? (failedTests / totalTests) * 100 : 0

  // Calculate percentiles
  const sortedLatencies = [...latencies].sort((a, b) => a - b)
  const p50Index = Math.floor(sortedLatencies.length * 0.5)
  const p95Index = Math.floor(sortedLatencies.length * 0.95)
  const p50Latency = sortedLatencies[p50Index] || undefined
  const p95Latency = sortedLatencies[p95Index] || undefined

  // Approximate uptime from successful runs
  const uptimeApprox = metrics.length > 0
    ? (successfulRuns / metrics.length) * 100
    : 0

  // Check compliance
  const latencyCompliant = p95Latency ? p95Latency <= targetLatency : false
  const uptimeCompliant = uptimeApprox >= targetUptime
  const overallCompliant = latencyCompliant && uptimeCompliant

  return {
    timestamp: new Date().toISOString(),
    period: `${metrics.length} runs`,
    targets: {
      bookingLatencyMs: targetLatency,
      uptime: targetUptime,
    },
    metrics: {
      passRate: Math.round(passRate * 100) / 100,
      failRate: Math.round(failRate * 100) / 100,
      bookingP50Latency: p50Latency ? Math.round(p50Latency) : undefined,
      bookingP95Latency: p95Latency ? Math.round(p95Latency) : undefined,
      uptimeApprox: Math.round(uptimeApprox * 100) / 100,
      totalRuns: metrics.length,
      successfulRuns,
      failedRuns,
    },
    compliance: {
      bookingLatency: latencyCompliant,
      uptime: uptimeCompliant,
      overall: overallCompliant,
    },
  }
}

/**
 * Generate timeseries
 */
function generateTimeseries(metrics: CIMetrics[]): SLOTimeseries {
  const runs = metrics.map(metric => {
    const total = metric.metrics.testTotal || 0
    const passed = metric.metrics.testPassed || 0
    const passRate = total > 0 ? (passed / total) * 100 : 0

    return {
      timestamp: metric.timestamp,
      commitSha: metric.commitSha.substring(0, 7),
      passRate: Math.round(passRate * 100) / 100,
      bookingP95Latency: metric.metrics.e2eDuration
        ? Math.round(metric.metrics.e2eDuration)
        : undefined,
      passed: (metric.metrics.testFailed || 0) === 0 && total > 0,
    }
  })

  return {
    timestamp: new Date().toISOString(),
    runs,
  }
}

/**
 * Export SLO metrics
 */
function exportSLO() {
  console.log('📊 Exporting SLO metrics...')

  const metrics = loadRecentMetrics(100)
  console.log(`📈 Loaded ${metrics.length} recent metric files`)

  const summary = computeSLOSummary(metrics)
  const timeseries = generateTimeseries(metrics)

  // Create output directory
  const outputDir = path.join(process.cwd(), 'slo')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Write summary
  const summaryPath = path.join(outputDir, 'slo-summary.json')
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
  console.log(`✅ SLO summary written to: ${summaryPath}`)

  // Write timeseries
  const timeseriesPath = path.join(outputDir, 'slo-timeseries.json')
  fs.writeFileSync(timeseriesPath, JSON.stringify(timeseries, null, 2))
  console.log(`✅ SLO timeseries written to: ${timeseriesPath}`)

  // Print summary
  console.log('\n📊 SLO Summary:')
  console.log(`   Period: ${summary.period}`)
  console.log(`   Pass Rate: ${summary.metrics.passRate}%`)
  console.log(`   Fail Rate: ${summary.metrics.failRate}%`)
  if (summary.metrics.bookingP95Latency) {
    console.log(`   Booking P95 Latency: ${summary.metrics.bookingP95Latency}ms`)
  }
  console.log(`   Uptime (approx): ${summary.metrics.uptimeApprox}%`)
  console.log(`   Compliance:`)
  console.log(`     - Booking Latency: ${summary.compliance.bookingLatency ? '✅' : '❌'}`)
  console.log(`     - Uptime: ${summary.compliance.uptime ? '✅' : '❌'}`)
  console.log(`     - Overall: ${summary.compliance.overall ? '✅' : '❌'}`)

  return { summary, timeseries }
}

/**
 * Main execution
 */
if (require.main === module) {
  try {
    exportSLO()
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to export SLO metrics:', error)
    process.exit(0) // Don't fail CI
  }
}

export { exportSLO, type SLOSummary, type SLOTimeseries }
