#!/usr/bin/env tsx
/**
 * AnomalyAI - Cross-domain anomaly detection monitor
 * 
 * Agent 8: General anomaly detector across all signals
 * 
 * Monitors all read-only endpoints and generates unified anomaly reports
 * with severity prioritization and agent recommendations.
 * 
 * Usage:
 *   pnpm anomalyai
 *   pnpm anomalyai https://www.bookiji.com
 *   pnpm anomalyai https://staging.bookiji.com
 */

interface AnomalyReport {
  agent: string
  timestamp: string
  report: {
    timestamp: string
    totalAnomalies: number
    criticalCount: number
    highCount: number
    mediumCount: number
    lowCount: number
    summary: string
    recommendations: {
      immediate: string[]
      monitor: string[]
      investigate: Array<{
        agent: string
        reason: string
        priority: number
      }>
    }
    crossSignalCorrelations: Array<{
      signals: string[]
      pattern: string
      severity: 'low' | 'medium' | 'high' | 'critical'
    }>
    anomalies: Array<{
      id: string
      severity: string
      title: string
      description: string
      recommendedAgent: string
      recommendedAction: string
      confidence: number
      affectedServices: string[]
    }>
  }
  rawSignalsCount: number
  unifiedAnomaliesCount: number
}

class AnomalyAIMonitor {
  private baseUrl: string

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  /**
   * Run anomaly detection
   */
  async monitor(): Promise<void> {
    console.log('🔍 AnomalyAI: Starting cross-domain anomaly detection...\n')
    console.log(`📍 Base URL: ${this.baseUrl}\n`)

    try {
      const url = `${this.baseUrl}/api/ops/anomaly`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AnomalyAI-Monitor/1.0'
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: AnomalyReport = await response.json()
      this.displayReport(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        console.error(`❌ Connection failed: Server may not be running at ${this.baseUrl}`)
        console.error(`   Make sure the development server is running: pnpm dev`)
      } else if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
        console.error(`❌ Request timeout: Anomaly detection took too long`)
        console.error(`   This may indicate system performance issues`)
      } else {
        console.error(`❌ AnomalyAI monitoring failed: ${errorMessage}`)
      }
      process.exit(1)
    }
  }

  /**
   * Display anomaly report
   */
  private displayReport(data: AnomalyReport): void {
    const report = data.report

    console.log('═'.repeat(70))
    console.log('🟦 ANOMALYAI - Cross-Domain Anomaly Detection Report')
    console.log('═'.repeat(70))
    console.log(`Timestamp: ${new Date(report.timestamp).toLocaleString()}\n`)

    // Summary
    console.log('📊 Summary')
    console.log('─'.repeat(70))
    console.log(report.summary)
    console.log(`\n   Total Anomalies: ${report.totalAnomalies}`)
    console.log(`   Critical: ${report.criticalCount} | High: ${report.highCount} | Medium: ${report.mediumCount} | Low: ${report.lowCount}`)
    console.log(`   Raw Signals: ${data.rawSignalsCount} | Unified: ${data.unifiedAnomaliesCount}\n`)

    // Critical anomalies
    if (report.criticalCount > 0) {
      console.log('🚨 CRITICAL ANOMALIES')
      console.log('─'.repeat(70))
      const critical = report.anomalies.filter(a => a.severity === 'critical')
      for (const anomaly of critical) {
        console.log(`\n• ${anomaly.title}`)
        console.log(`  Description: ${anomaly.description}`)
        console.log(`  Recommended Agent: ${anomaly.recommendedAgent}`)
        console.log(`  Action: ${anomaly.recommendedAction}`)
        console.log(`  Confidence: ${(anomaly.confidence * 100).toFixed(0)}%`)
        if (anomaly.affectedServices.length > 0) {
          console.log(`  Affected Services: ${anomaly.affectedServices.join(', ')}`)
        }
      }
      console.log()
    }

    // High severity anomalies
    if (report.highCount > 0) {
      console.log('⚠️  HIGH SEVERITY ANOMALIES')
      console.log('─'.repeat(70))
      const high = report.anomalies.filter(a => a.severity === 'high')
      for (const anomaly of high.slice(0, 5)) { // Show top 5
        console.log(`\n• ${anomaly.title}`)
        console.log(`  Description: ${anomaly.description}`)
        console.log(`  Recommended Agent: ${anomaly.recommendedAgent}`)
        if (anomaly.affectedServices.length > 0) {
          console.log(`  Affected Services: ${anomaly.affectedServices.join(', ')}`)
        }
      }
      if (high.length > 5) {
        console.log(`\n  ... and ${high.length - 5} more high-severity anomalies`)
      }
      console.log()
    }

    // Recommendations
    if (report.recommendations.immediate.length > 0) {
      console.log('🎯 IMMEDIATE ACTIONS')
      console.log('─'.repeat(70))
      report.recommendations.immediate.forEach((action, i) => {
        console.log(`  ${i + 1}. ${action}`)
      })
      console.log()
    }

    if (report.recommendations.investigate.length > 0) {
      console.log('🔬 RECOMMENDED INVESTIGATIONS')
      console.log('─'.repeat(70))
      report.recommendations.investigate.forEach((inv, i) => {
        console.log(`  ${i + 1}. ${inv.agent}`)
        console.log(`     Reason: ${inv.reason}`)
        console.log(`     Priority: ${inv.priority}/4`)
      })
      console.log()
    }

    // Cross-signal correlations
    if (report.crossSignalCorrelations.length > 0) {
      console.log('🔗 CROSS-SIGNAL CORRELATIONS')
      console.log('─'.repeat(70))
      for (const correlation of report.crossSignalCorrelations) {
        const severityEmoji = correlation.severity === 'critical' ? '🚨' :
                              correlation.severity === 'high' ? '⚠️' :
                              correlation.severity === 'medium' ? '📊' : 'ℹ️'
        console.log(`\n${severityEmoji} ${correlation.pattern}`)
        console.log(`   Severity: ${correlation.severity.toUpperCase()}`)
        console.log(`   Signals: ${correlation.signals.length} related anomaly(ies)`)
      }
      console.log()
    }

    // Monitor recommendations
    if (report.recommendations.monitor.length > 0) {
      console.log('👀 MONITOR')
      console.log('─'.repeat(70))
      report.recommendations.monitor.slice(0, 3).forEach((action, i) => {
        console.log(`  ${i + 1}. ${action}`)
      })
      if (report.recommendations.monitor.length > 3) {
        console.log(`  ... and ${report.recommendations.monitor.length - 3} more items to monitor`)
      }
      console.log()
    }

    // Status
    if (report.totalAnomalies === 0) {
      console.log('✅ No anomalies detected. System operating normally.\n')
    } else if (report.criticalCount > 0) {
      console.log('🚨 CRITICAL: Immediate attention required\n')
    } else if (report.highCount > 0) {
      console.log('⚠️  WARNING: High-severity anomalies detected\n')
    } else {
      console.log('📊 INFO: Low to medium severity anomalies detected\n')
    }

    console.log('═'.repeat(70))
    console.log('💡 AnomalyAI Note: This is an early-warning system.')
    console.log('   Escalate only when anomalies are meaningful and actionable.\n')
  }
}

// Main execution
async function main() {
  const baseUrl = process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  const monitor = new AnomalyAIMonitor(baseUrl)
  await monitor.monitor()
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ AnomalyAI monitoring failed:', error)
    process.exit(1)
  })
}

export { AnomalyAIMonitor }
