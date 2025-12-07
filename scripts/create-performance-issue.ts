#!/usr/bin/env tsx
/**
 * Create Performance Issue
 * 
 * Creates or updates a GitHub issue for performance regressions.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { PerformanceReport } from './analyze-performance-trends.js'

/**
 * Create or update GitHub issue
 */
async function createOrUpdateIssue(report: PerformanceReport) {
  const githubToken = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY

  if (!githubToken || !repo) {
    console.log('ℹ️  GITHUB_TOKEN or GITHUB_REPOSITORY not set. Skipping issue creation.')
    return
  }

  const [owner, repoName] = repo.split('/')

  try {
    // Search for existing issue
    const searchUrl = `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+label:performance+state:open+in:title:"LCP/CLS regression"`
    
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
    const highPriorityRecs = report.recommendations.filter(r => r.priority === 'high')
    
    let body = `## 🚨 Performance Regression Detected\n\n`
    body += `**Generated:** ${report.timestamp}\n\n`
    body += `**Summary:**\n`
    body += `- Total Issues: ${report.summary.totalIssues}\n`
    body += `- High Priority: ${report.summary.highPriority}\n`
    body += `- Medium Priority: ${report.summary.mediumPriority}\n\n`

    if (highPriorityRecs.length > 0) {
      body += `### High Priority Issues\n\n`
      for (const rec of highPriorityRecs) {
        body += `#### ${rec.page} - ${rec.metric}\n`
        body += `- **Current:** ${rec.current}\n`
        body += `- **Target:** ${rec.target}\n`
        body += `- **Recommendation:** ${rec.recommendation}\n\n`
      }
    }

    body += `### Full Report\n\n`
    body += `See [performance report artifact](https://github.com/${owner}/${repoName}/actions) for complete analysis.\n\n`
    body += `---\n\n*This issue was automatically created by the performance insights system.*`

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
          title: '[performance] LCP/CLS regression detected',
          body,
          labels: ['performance', 'ci'],
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
  const reportPath = path.join(process.cwd(), 'perf-insights', 'perf-report.json')
  
  if (!fs.existsSync(reportPath)) {
    console.log('ℹ️  No performance report found.')
    process.exit(0)
  }

  try {
    const report: PerformanceReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
    
    if (report.summary.highPriority > 0) {
      await createOrUpdateIssue(report)
    } else {
      console.log('ℹ️  No high-priority performance issues. Skipping issue creation.')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to create performance issue:', error)
    process.exit(0) // Don't fail CI
  }
}

if (require.main === module) {
  main()
}
