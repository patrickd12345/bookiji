#!/usr/bin/env tsx
/**
 * Suggest Rollback
 * 
 * Reads regression report and suggests rollback actions.
 * Optionally triggers automatic rollback if enabled.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { RegressionReport } from './detect-regressions.js'

/**
 * Load regression report
 */
function loadRegressionReport(): RegressionReport | null {
  const reportPath = path.join(process.cwd(), 'regressions', 'regression-report.json')
  
  if (!fs.existsSync(reportPath)) {
    console.log('ℹ️  No regression report found.')
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
  } catch (error) {
    console.warn('⚠️  Failed to load regression report:', error)
    return null
  }
}

/**
 * Find commit before regression
 */
function findRollbackTarget(suspectCommits: string[]): string | null {
  if (suspectCommits.length === 0) {
    return null
  }

  // For now, suggest the commit before the first suspect commit
  // In a real implementation, you'd query git history
  return suspectCommits[0]
}

/**
 * Suggest rollback
 */
function suggestRollback(report: RegressionReport) {
  if (report.status !== 'degraded' || report.recommendation !== 'rollback') {
    console.log('ℹ️  No rollback recommended.')
    return
  }

  const rollbackTarget = findRollbackTarget(report.suspectCommits)

  if (!rollbackTarget) {
    console.log('⚠️  Rollback recommended but no target commit identified.')
    return
  }

  console.log('\n🔄 Rollback Recommendation:')
  console.log(`   Status: ${report.status.toUpperCase()}`)
  console.log(`   Recommendation: ${report.recommendation.toUpperCase()}`)
  console.log(`   Suspect Commits: ${report.suspectCommits.map(s => s.substring(0, 7)).join(', ')}`)
  console.log(`\n   Suggested Action:`)
  console.log(`   Consider promoting commit ${rollbackTarget.substring(0, 7)} as the new production.`)
  console.log(`\n   To rollback manually:`)
  console.log(`   npx tsx scripts/rollback.ts --sha ${rollbackTarget.substring(0, 7)}`)

  // Check if auto-rollback is enabled
  const autoRollbackEnabled = process.env.AUTO_ROLLBACK_ENABLED === 'true'

  if (autoRollbackEnabled) {
    console.log('\n🤖 Auto-rollback enabled. Attempting rollback...')
    
    try {
      // Call existing rollback script
      const { execSync } = require('child_process')
      execSync(`npx tsx scripts/rollback.ts --sha ${rollbackTarget.substring(0, 7)}`, {
        stdio: 'inherit',
      })
      console.log('✅ Rollback initiated')
    } catch (error) {
      console.error('❌ Auto-rollback failed:', error)
      console.log('⚠️  Please rollback manually using the command above.')
    }
  } else {
    console.log('\nℹ️  Auto-rollback is disabled. Set AUTO_ROLLBACK_ENABLED=true to enable.')
  }
}

/**
 * Main execution
 */
function main() {
  const report = loadRegressionReport()

  if (!report) {
    process.exit(0)
  }

  suggestRollback(report)
  process.exit(0)
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error('❌ Failed to suggest rollback:', error)
    process.exit(0) // Don't fail CI
  }
}

export { suggestRollback }
