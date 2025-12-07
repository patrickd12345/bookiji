#!/usr/bin/env tsx
/**
 * Analyze Performance Trends
 * 
 * Analyzes Lighthouse and SLO metrics to generate human-friendly performance
 * optimization recommendations.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { CIMetrics } from './export-ci-metrics.js'
import type { SLOTimeseries } from './export-slo.js'

interface PerformanceRecommendation {
  page: string
  metric: string
  current: number
  target: number
  recommendation: string
  priority: 'high' | 'medium' | 'low'
}

interface PerformanceReport {
  timestamp: string
  recommendations: PerformanceRecommendation[]
  summary: {
    totalIssues: number
    highPriority: number
    mediumPriority: number
    lowPriority: number
  }
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

    return files
      .map(file => {
        try {
          return JSON.parse(fs.readFileSync(path.join(metricsDir, file), 'utf-8'))
        } catch {
          return null
        }
      })
      .filter((m): m is CIMetrics => m !== null)
  } catch {
    return []
  }
}

/**
 * Load SLO timeseries
 */
function loadSLOTimeseries(): SLOTimeseries | null {
  const sloPath = path.join(process.cwd(), 'slo', 'slo-timeseries.json')
  
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
 * Analyze performance trends
 */
function analyzeTrends(): PerformanceReport {
  const metrics = loadRecentMetrics(20)
  const sloTimeseries = loadSLOTimeseries()

  const recommendations: PerformanceRecommendation[] = []

  // Analyze Lighthouse metrics
  const lighthouseMetrics = metrics
    .map(m => ({
      performance: m.metrics.lighthousePerformance,
      accessibility: m.metrics.lighthouseAccessibility,
      bestPractices: m.metrics.lighthouseBestPractices,
      seo: m.metrics.lighthouseSEO,
    }))
    .filter(m => m.performance !== undefined)

  if (lighthouseMetrics.length > 0) {
    const latest = lighthouseMetrics[0]
    const avgPerformance = lighthouseMetrics.reduce((sum, m) => sum + (m.performance || 0), 0) / lighthouseMetrics.length

    // Check LCP (inferred from performance score)
    if (latest.performance && latest.performance < 70) {
      recommendations.push({
        page: 'Homepage',
        metric: 'Lighthouse Performance',
        current: latest.performance,
        target: 90,
        recommendation: 'Performance score below 70. Consider optimizing images, reducing JavaScript bundle size, and implementing code splitting.',
        priority: latest.performance < 50 ? 'high' : 'medium',
      })
    }

    // Check CLS (inferred from performance score)
    if (latest.performance && latest.performance < 80) {
      recommendations.push({
        page: 'Homepage',
        metric: 'Cumulative Layout Shift',
        current: latest.performance,
        target: 90,
        recommendation: 'Layout stability issues detected. Check for images without dimensions, dynamic content insertion, and font loading strategies.',
        priority: 'medium',
      })
    }
  }

  // Analyze booking latency from SLO
  if (sloTimeseries && sloTimeseries.runs.length > 0) {
    const recentRuns = sloTimeseries.runs.slice(0, 10)
    const latencies = recentRuns
      .map(r => r.bookingP95Latency)
      .filter((l): l is number => l !== undefined)

    if (latencies.length > 0) {
      const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length
      const latestLatency = latencies[0]

      if (latestLatency > 2000) {
        recommendations.push({
          page: 'Booking Flow',
          metric: 'P95 Latency',
          current: latestLatency,
          target: 1000,
          recommendation: `Booking P95 latency is ${latestLatency}ms. Consider optimizing API responses, database queries, and reducing third-party script blocking.`,
          priority: latestLatency > 3000 ? 'high' : 'medium',
        })
      }
    }
  }

  // Optional: OpenAI enhancement
  if (process.env.OPENAI_API_KEY && recommendations.length > 0) {
    // In a real implementation, you'd call OpenAI API here
    // For now, we'll use the heuristic recommendations
    console.log('ℹ️  OpenAI enhancement available but not implemented yet')
  }

  return {
    timestamp: new Date().toISOString(),
    recommendations,
    summary: {
      totalIssues: recommendations.length,
      highPriority: recommendations.filter(r => r.priority === 'high').length,
      mediumPriority: recommendations.filter(r => r.priority === 'medium').length,
      lowPriority: recommendations.filter(r => r.priority === 'low').length,
    },
  }
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport(report: PerformanceReport): string {
  let markdown = `# Performance Analysis Report\n\n`
  markdown += `**Generated:** ${report.timestamp}\n\n`
  markdown += `## Summary\n\n`
  markdown += `- **Total Issues:** ${report.summary.totalIssues}\n`
  markdown += `- **High Priority:** ${report.summary.highPriority}\n`
  markdown += `- **Medium Priority:** ${report.summary.mediumPriority}\n`
  markdown += `- **Low Priority:** ${report.summary.lowPriority}\n\n`

  if (report.recommendations.length === 0) {
    markdown += `✅ No performance issues detected.\n`
    return markdown
  }

  markdown += `## Recommendations\n\n`

  const byPriority = {
    high: report.recommendations.filter(r => r.priority === 'high'),
    medium: report.recommendations.filter(r => r.priority === 'medium'),
    low: report.recommendations.filter(r => r.priority === 'low'),
  }

  for (const priority of ['high', 'medium', 'low'] as const) {
    const recs = byPriority[priority]
    if (recs.length === 0) continue

    markdown += `### ${priority.toUpperCase()} Priority\n\n`
    for (const rec of recs) {
      markdown += `#### ${rec.page} - ${rec.metric}\n\n`
      markdown += `- **Current:** ${rec.current}\n`
      markdown += `- **Target:** ${rec.target}\n`
      markdown += `- **Recommendation:** ${rec.recommendation}\n\n`
    }
  }

  return markdown
}

/**
 * Main execution
 */
function main() {
  console.log('📊 Analyzing performance trends...')

  const report = analyzeTrends()

  // Create output directory
  const outputDir = path.join(process.cwd(), 'perf-insights')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Save JSON report
  const jsonPath = path.join(outputDir, 'perf-report.json')
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2))
  console.log(`✅ Performance report (JSON) saved to: ${jsonPath}`)

  // Save Markdown report
  const markdown = generateMarkdownReport(report)
  const mdPath = path.join(outputDir, 'perf-report.md')
  fs.writeFileSync(mdPath, markdown)
  console.log(`✅ Performance report (Markdown) saved to: ${mdPath}`)

  // Print summary
  console.log(`\n📊 Performance Analysis Summary:`)
  console.log(`   Total Issues: ${report.summary.totalIssues}`)
  console.log(`   High Priority: ${report.summary.highPriority}`)
  console.log(`   Medium Priority: ${report.summary.mediumPriority}`)
  console.log(`   Low Priority: ${report.summary.lowPriority}`)
}

if (require.main === module) {
  try {
    main()
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to analyze performance trends:', error)
    process.exit(0) // Don't fail CI
  }
}

export { analyzeTrends, generateMarkdownReport, type PerformanceReport }
