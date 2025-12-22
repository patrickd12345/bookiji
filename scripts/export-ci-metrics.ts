#!/usr/bin/env tsx
/**
 * Export CI Metrics for Reliability Dashboard
 * 
 * Collects and exports CI metrics to a JSON file for dashboard ingestion.
 * Metrics include test results, performance data, and build information.
 */

import * as fs from 'fs'
import * as path from 'path'

interface CIMetrics {
  timestamp: string
  commitSha: string
  branch: string
  jobType: string
  metrics: {
    testPassed?: number
    testFailed?: number
    testTotal?: number
    e2eDuration?: number
    lighthouseScore?: number
    lighthousePerformance?: number
    lighthouseAccessibility?: number
    lighthouseBestPractices?: number
    lighthouseSEO?: number
    loadTestP95Latency?: number
    loadTestErrorRate?: number
  }
}

/**
 * Parse Playwright test results
 */
function getTestMetrics(): Partial<CIMetrics['metrics']> {
  const reportPath = path.join(process.cwd(), 'playwright-report', 'results.json')
  
  if (fs.existsSync(reportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
      
      let passed = 0
      let failed = 0
      let totalDuration = 0

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
                totalDuration += test.results[0].duration || 0
              }
            }
          }
        }
      }

      return {
        testPassed: passed,
        testFailed: failed,
        testTotal: passed + failed,
        e2eDuration: totalDuration,
      }
    } catch (error) {
      console.warn('⚠️  Could not parse Playwright report:', error)
    }
  }

  // Try to get from coverage or test output
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json')
  if (fs.existsSync(coveragePath)) {
    try {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'))
      // Coverage doesn't give us pass/fail, but we can note it exists
    } catch {
      // Ignore
    }
  }

  return {}
}

/**
 * Parse Lighthouse results
 */
function getLighthouseMetrics(): Partial<CIMetrics['metrics']> {
  const lhciPath = path.join(process.cwd(), '.lighthouseci')
  
  if (!fs.existsSync(lhciPath)) {
    return {}
  }

  try {
    // Look for latest run
    const runs = fs.readdirSync(lhciPath)
      .filter(f => f.startsWith('run-'))
      .sort()
      .reverse()

    if (runs.length === 0) {
      return {}
    }

    const latestRun = runs[0]
    const summaryPath = path.join(lhciPath, latestRun, 'summary.json')

    if (fs.existsSync(summaryPath)) {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'))
      
      // Extract scores from summary
      const scores = summary.scores || {}
      
      return {
        lighthouseScore: Math.round((scores.performance || 0) * 100),
        lighthousePerformance: Math.round((scores.performance || 0) * 100),
        lighthouseAccessibility: Math.round((scores.accessibility || 0) * 100),
        lighthouseBestPractices: Math.round((scores['best-practices'] || 0) * 100),
        lighthouseSEO: Math.round((scores.seo || 0) * 100),
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not parse Lighthouse results:', error)
  }

  return {}
}

/**
 * Parse load test results
 */
function getLoadTestMetrics(): Partial<CIMetrics['metrics']> {
  const loadtestPath = path.join(process.cwd(), 'loadtest-results.json')
  
  if (fs.existsSync(loadtestPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(loadtestPath, 'utf-8'))
      
      return {
        loadTestP95Latency: results.metrics?.http_req_duration?.values?.['p(95)'],
        loadTestErrorRate: results.metrics?.http_req_failed?.values?.rate,
      }
    } catch (error) {
      console.warn('⚠️  Could not parse load test results:', error)
    }
  }

  return {}
}

/**
 * Export CI metrics
 */
function exportCIMetrics() {
  const jobType = process.env.CI_JOB_TYPE || process.env.GITHUB_JOB || 'unknown'
  const commitSha = process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA || 'unknown'
  const branch = process.env.GITHUB_REF_NAME || process.env.CI_COMMIT_REF_NAME || 'unknown'

  console.log(`📊 Exporting CI metrics for job: ${jobType}`)

  // Collect metrics
  const testMetrics = getTestMetrics()
  const lighthouseMetrics = getLighthouseMetrics()
  const loadTestMetrics = getLoadTestMetrics()

  const metrics: CIMetrics = {
    timestamp: new Date().toISOString(),
    commitSha,
    branch,
    jobType,
    metrics: {
      ...testMetrics,
      ...lighthouseMetrics,
      ...loadTestMetrics,
    },
  }

  // Create output directory
  const outputDir = path.join(process.cwd(), 'ci-metrics')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Write metrics file
  const filename = `ci-metrics-${jobType}-${commitSha.substring(0, 7)}.json`
  const filepath = path.join(outputDir, filename)
  
  fs.writeFileSync(filepath, JSON.stringify(metrics, null, 2))
  
  console.log(`✅ Metrics exported to: ${filepath}`)
  console.log(`   Tests: ${metrics.metrics.testPassed || 0} passed, ${metrics.metrics.testFailed || 0} failed`)
  if (metrics.metrics.lighthouseScore) {
    console.log(`   Lighthouse Score: ${metrics.metrics.lighthouseScore}`)
  }
  if (metrics.metrics.loadTestP95Latency) {
    console.log(`   Load Test P95: ${metrics.metrics.loadTestP95Latency.toFixed(2)}ms`)
  }

  return filepath
}

/**
 * Main execution
 */
if (require.main === module) {
  try {
    exportCIMetrics()
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to export metrics:', error)
    // Don't fail CI
    process.exit(0)
  }
}

export { exportCIMetrics }
export type { CIMetrics }















