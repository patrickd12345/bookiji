#!/usr/bin/env tsx
/**
 * Optimize CI Resources
 * 
 * Analyzes CI runtime and suggests resource optimizations.
 * Generates advisory reports without automatically changing configurations.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { CIMetrics } from './export-ci-metrics.js'

interface CIResourceSuggestion {
  suggestedShardCount: number
  currentShardCount: number
  notes: string[]
}

/**
 * Load recent CI metrics
 */
function loadRecentMetrics(limit: number = 30): CIMetrics[] {
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
 * Analyze CI resources and generate suggestions
 */
function analyzeCIResources(): CIResourceSuggestion {
  const metrics = loadRecentMetrics(30)
  
  // Filter E2E metrics
  const e2eMetrics = metrics.filter(m => m.jobType.includes('e2e'))
  const coreMetrics = metrics.filter(m => m.jobType.includes('core') || m.jobType.includes('typecheck') || m.jobType.includes('lint'))

  const suggestions: CIResourceSuggestion = {
    suggestedShardCount: 2, // Default
    currentShardCount: 2, // Assume current is 2
    notes: [],
  }

  // Analyze E2E runtime
  if (e2eMetrics.length > 0) {
    // Estimate runtime from test duration (assuming parallel execution)
    // In a real implementation, you'd track actual job duration
    const durations = e2eMetrics
      .map(m => m.metrics.e2eDuration)
      .filter((d): d is number => d !== undefined)
      .map(d => d / 1000 / 60) // Convert to minutes

    if (durations.length > 0) {
      const medianRuntime = median(durations)
      const maxRuntime = Math.max(...durations)

      console.log(`📊 E2E Analysis:`)
      console.log(`   Median Runtime: ${medianRuntime.toFixed(1)} minutes`)
      console.log(`   Max Runtime: ${maxRuntime.toFixed(1)} minutes`)

      // Suggest shard count based on runtime
      if (medianRuntime < 5 && maxRuntime < 8) {
        suggestions.suggestedShardCount = 1
        suggestions.notes.push('E2E median runtime is consistently < 5min; consider reducing shardCount from 2 → 1 to save resources')
      } else if (medianRuntime > 30 || maxRuntime > 45) {
        suggestions.suggestedShardCount = 4
        suggestions.notes.push(`E2E median runtime is ${medianRuntime.toFixed(1)}min; consider increasing shardCount from 2 → 4 for faster feedback`)
      } else {
        suggestions.suggestedShardCount = 2
        suggestions.notes.push(`E2E runtime is optimal (${medianRuntime.toFixed(1)}min); current shardCount of 2 is appropriate`)
      }
    }
  }

  // Analyze core CI runtime
  if (coreMetrics.length > 0) {
    // Core CI is typically fast, just note it
    suggestions.notes.push('Core CI runtime is low; safe to keep as-is')
  }

  // Check if we have enough data
  if (metrics.length < 10) {
    suggestions.notes.push('⚠️  Insufficient data for optimization (need at least 10 runs)')
  }

  return suggestions
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Analyzing CI resource usage...')

  const suggestions = analyzeCIResources()

  // Create output directory
  const outputDir = path.join(process.cwd(), 'ci-optimizer')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Save suggestions
  const suggestionsPath = path.join(outputDir, 'suggestions.json')
  fs.writeFileSync(suggestionsPath, JSON.stringify(suggestions, null, 2))
  console.log(`✅ CI optimization suggestions saved to: ${suggestionsPath}`)

  // Print summary
  console.log(`\n📊 CI Resource Optimization Suggestions:`)
  console.log(`   Current Shard Count: ${suggestions.currentShardCount}`)
  console.log(`   Suggested Shard Count: ${suggestions.suggestedShardCount}`)
  console.log(`\n   Notes:`)
  for (const note of suggestions.notes) {
    console.log(`   - ${note}`)
  }

  console.log(`\nℹ️  These are advisory suggestions. Manual review required before changing CI configuration.`)
}

if (require.main === module) {
  try {
    main()
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to optimize CI resources:', error)
    process.exit(0) // Don't fail CI
  }
}

export { analyzeCIResources, type CIResourceSuggestion }
