#!/usr/bin/env tsx
/**
 * Quarantine Flaky Tests
 * 
 * Detects flaky tests based on history and creates a quarantine list.
 * Optionally creates GitHub issues for tracking.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { TestHistory, TestStats } from './update-test-history.js'

interface QuarantinedTest {
  reason: string
  lastUpdated: string
  stats: TestStats
}

interface QuarantineList {
  [testPath: string]: QuarantinedTest
}

/**
 * Load test history
 */
function loadTestHistory(): TestHistory {
  const historyPath = path.join(process.cwd(), 'ci-history', 'tests.json')
  
  if (!fs.existsSync(historyPath)) {
    console.warn('⚠️  Test history not found. No tests to quarantine.')
    return {}
  }

  try {
    return JSON.parse(fs.readFileSync(historyPath, 'utf-8'))
  } catch (error) {
    console.warn('⚠️  Failed to load test history:', error)
    return {}
  }
}

/**
 * Detect flaky tests
 */
function detectFlakyTests(history: TestHistory): QuarantineList {
  const quarantined: QuarantineList = {}

  for (const [testPath, stats] of Object.entries(history)) {
    // Flaky criteria:
    // - Has failures
    // - Has flaky failures >= 2
    // - Failure rate < 20% (not consistently failing)
    const failureRate = stats.runs > 0 ? (stats.failures / stats.runs) * 100 : 0

    if (
      stats.failures > 0 &&
      stats.flakyFailures >= 2 &&
      failureRate < 20
    ) {
      quarantined[testPath] = {
        reason: 'flaky',
        lastUpdated: new Date().toISOString(),
        stats,
      }
    }
  }

  return quarantined
}

/**
 * Save quarantine list
 */
function saveQuarantineList(quarantined: QuarantineList) {
  const historyDir = path.join(process.cwd(), 'ci-history')
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true })
  }

  const quarantinePath = path.join(historyDir, 'quarantined-tests.json')
  fs.writeFileSync(quarantinePath, JSON.stringify(quarantined, null, 2))
  console.log(`✅ Quarantine list saved to: ${quarantinePath}`)
}

/**
 * Generate Markdown summary
 */
function generateSummary(quarantined: QuarantineList): string {
  if (Object.keys(quarantined).length === 0) {
    return '✅ No flaky tests detected.'
  }

  let markdown = `## Flaky Tests Detected\n\n`
  markdown += `Found ${Object.keys(quarantined).length} flaky test(s):\n\n`

  for (const [testPath, info] of Object.entries(quarantined)) {
    const failureRate = info.stats.runs > 0
      ? ((info.stats.failures / info.stats.runs) * 100).toFixed(1)
      : '0'

    markdown += `### ${testPath}\n`
    markdown += `- **Runs:** ${info.stats.runs}\n`
    markdown += `- **Failures:** ${info.stats.failures}\n`
    markdown += `- **Flaky Failures:** ${info.stats.flakyFailures}\n`
    markdown += `- **Failure Rate:** ${failureRate}%\n`
    markdown += `- **Reason:** ${info.reason}\n\n`
  }

  return markdown
}

/**
 * Create or update GitHub issue
 */
async function createOrUpdateIssue(summary: string, quarantined: QuarantineList) {
  const githubToken = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY

  if (!githubToken || !repo) {
    console.log('ℹ️  GITHUB_TOKEN or GITHUB_REPOSITORY not set. Skipping issue creation.')
    return
  }

  const [owner, repoName] = repo.split('/')

  try {
    // Search for existing issue
    const searchUrl = `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+label:flaky-tests+state:open+in:title:"Flaky tests detected"`
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    let existingIssue: { number?: number } | null = null

    if (searchResponse.ok) {
      const searchData = await searchResponse.json()
      if (searchData.items && searchData.items.length > 0) {
        existingIssue = searchData.items[0]
      }
    }

    const body = `${summary}\n\n---\n\n*This issue was automatically created/updated by the flaky test quarantine system.*`

    if (existingIssue && existingIssue.number) {
      // Update existing issue
      const commentUrl = `https://api.github.com/repos/${owner}/${repoName}/issues/${existingIssue.number}/comments`
      
      await fetch(commentUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: `## Update: ${new Date().toISOString()}\n\n${body}`,
        }),
      })

      console.log(`✅ Updated existing issue: #${existingIssue.number}`)
    } else {
      // Create new issue
      const createUrl = `https://api.github.com/repos/${owner}/${repoName}/issues`
      
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Flaky tests detected',
          body,
          labels: ['flaky-tests', 'ci'],
        }),
      })

      if (createResponse.ok) {
        const issue = await createResponse.json()
        console.log(`✅ Created issue: #${issue.number}`)
      }
    }
  } catch (error) {
    console.warn('⚠️  Failed to create/update issue:', error)
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔍 Detecting flaky tests...')

    const history = loadTestHistory()
    const quarantined = detectFlakyTests(history)

    if (Object.keys(quarantined).length === 0) {
      console.log('✅ No flaky tests detected.')
      // Clear quarantine list if no flaky tests
      const quarantinePath = path.join(process.cwd(), 'ci-history', 'quarantined-tests.json')
      if (fs.existsSync(quarantinePath)) {
        fs.writeFileSync(quarantinePath, JSON.stringify({}, null, 2))
      }
      process.exit(0)
    }

    console.log(`⚠️  Detected ${Object.keys(quarantined).length} flaky test(s)`)

    saveQuarantineList(quarantined)

    const summary = generateSummary(quarantined)
    console.log('\n' + summary)

    // Create or update GitHub issue
    await createOrUpdateIssue(summary, quarantined)

    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to quarantine flaky tests:', error)
    process.exit(0) // Don't fail CI
  }
}

if (require.main === module) {
  main()
}

export { detectFlakyTests, generateSummary, type QuarantineList }
