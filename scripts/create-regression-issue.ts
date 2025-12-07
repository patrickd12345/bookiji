#!/usr/bin/env tsx
/**
 * Create Regression Issue
 * 
 * Creates or updates a GitHub issue for detected regressions.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { RegressionReport } from './detect-regressions.js'

/**
 * Create or update GitHub issue
 */
async function createOrUpdateIssue(report: RegressionReport) {
  const githubToken = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY

  if (!githubToken || !repo) {
    console.log('ℹ️  GITHUB_TOKEN or GITHUB_REPOSITORY not set. Skipping issue creation.')
    return
  }

  const [owner, repoName] = repo.split('/')

  try {
    // Search for existing issue
    const searchUrl = `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+label:regression+state:open+in:title:"Reliability/Performance degradation"`
    
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

    // Build issue body
    let body = `## 🚨 Reliability/Performance Degradation Detected\n\n`
    body += `**Timestamp:** ${report.timestamp}\n`
    body += `**Status:** ${report.status.toUpperCase()}\n`
    body += `**Recommendation:** ${report.recommendation.toUpperCase()}\n\n`

    if (report.suspectCommits.length > 0) {
      body += `### Suspect Commits\n\n`
      for (const commit of report.suspectCommits) {
        body += `- \`${commit.substring(0, 7)}\` - [View Commit](https://github.com/${owner}/${repoName}/commit/${commit})\n`
      }
      body += `\n`
    }

    if (Object.keys(report.metrics).length > 0) {
      body += `### Metrics Degradation\n\n`
      for (const [metric, data] of Object.entries(report.metrics)) {
        body += `#### ${metric}\n`
        body += `- **Current:** ${data.current}\n`
        body += `- **Baseline:** ${data.baseline}\n`
        body += `- **Change:** ${data.percentChange > 0 ? '+' : ''}${data.percentChange}%\n\n`
      }
    }

    body += `### Next Steps\n\n`
    if (report.recommendation === 'rollback') {
      body += `1. Review suspect commits above\n`
      body += `2. Consider rolling back to previous stable commit\n`
      body += `3. Investigate root cause after rollback\n`
    } else {
      body += `1. Monitor metrics closely\n`
      body += `2. Investigate suspect commits\n`
      body += `3. Consider rollback if degradation worsens\n`
    }

    body += `\n---\n\n*This issue was automatically created by the regression analyzer.*`

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
          title: '[regression] Reliability/Performance degradation detected',
          body,
          labels: ['regression', 'reliability'],
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
  const reportPath = path.join(process.cwd(), 'regressions', 'regression-report.json')
  
  if (!fs.existsSync(reportPath)) {
    console.log('ℹ️  No regression report found.')
    process.exit(0)
  }

  try {
    const report: RegressionReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
    
    if (report.status === 'degraded') {
      await createOrUpdateIssue(report)
    } else {
      console.log('ℹ️  No degradation detected. Skipping issue creation.')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to create regression issue:', error)
    process.exit(0) // Don't fail CI
  }
}

if (require.main === module) {
  main()
}
