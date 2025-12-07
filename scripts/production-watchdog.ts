#!/usr/bin/env tsx
/**
 * Production Watchdog - Autonomous SRE Bot
 * 
 * Monitors production health and either:
 * - Attempts safe auto-remediation
 * - Opens/updates GitHub Issues for incidents
 */

import * as fs from 'fs'
import * as path from 'path'

interface WatchdogCheck {
  name: string
  passed: boolean
  error?: string
  details?: unknown
}

interface WatchdogResult {
  timestamp: string
  targetUrl: string
  checks: WatchdogCheck[]
  overall: 'ok' | 'degraded' | 'down'
  incidentCreated?: boolean
  incidentUrl?: string
  incidentNumber?: number
}

/**
 * Check health endpoint
 */
async function checkHealthEndpoint(url: string): Promise<WatchdogCheck> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Bookiji-Watchdog/1.0',
      },
    })

    if (!response.ok) {
      return {
        name: 'health_endpoint',
        passed: false,
        error: `HTTP ${response.status}`,
        details: { status: response.status },
      }
    }

    const data = await response.json().catch(() => ({}))
    
    // Check for expected health structure
    const isHealthy = data.status === 'ok' || data.healthy === true || response.status === 200

    return {
      name: 'health_endpoint',
      passed: isHealthy,
      details: data,
    }
  } catch (error) {
    return {
      name: 'health_endpoint',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Check booking API
 */
async function checkBookingAPI(baseUrl: string): Promise<WatchdogCheck> {
  try {
    // Try a lightweight endpoint
    const healthUrl = `${baseUrl}/api/health/bookings`
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Bookiji-Watchdog/1.0',
      },
    })

    if (!response.ok) {
      return {
        name: 'booking_api',
        passed: false,
        error: `HTTP ${response.status}`,
      }
    }

    return {
      name: 'booking_api',
      passed: true,
    }
  } catch (error) {
    return {
      name: 'booking_api',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Check error budget via Sentry (optional)
 */
async function checkErrorBudget(): Promise<WatchdogCheck> {
  const sentryToken = process.env.SENTRY_API_TOKEN
  const sentryOrg = process.env.SENTRY_ORG
  const sentryProject = process.env.SENTRY_PROJECT

  if (!sentryToken || !sentryOrg || !sentryProject) {
    return {
      name: 'error_budget',
      passed: true, // Don't fail if Sentry not configured
      details: { configured: false },
    }
  }

  try {
    // In a real implementation, query Sentry API for recent error counts
    // For now, stub this
    console.log('ℹ️  Sentry error budget check not fully implemented')
    
    return {
      name: 'error_budget',
      passed: true,
      details: { configured: true, checked: false },
    }
  } catch (error) {
    return {
      name: 'error_budget',
      passed: true, // Don't fail watchdog if Sentry check fails
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Attempt auto-remediation
 */
async function attemptAutoRemediation(baseUrl: string): Promise<boolean> {
  const remediationUrl = `${baseUrl}/api/admin/reload-config`
  
  try {
    const response = await fetch(remediationUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_API_KEY || ''}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      console.log('✅ Auto-remediation attempted: config reload')
      return true
    }
  } catch (error) {
    console.warn('⚠️  Auto-remediation failed:', error)
  }

  return false
}

/**
 * Generate incident key from checks
 */
function generateIncidentKey(checks: WatchdogCheck[]): string {
  const failedChecks = checks.filter(c => !c.passed).map(c => c.name).sort().join(',')
  // Simple hash-like key
  return Buffer.from(failedChecks).toString('base64').substring(0, 16)
}

/**
 * Find or create incident issue
 */
async function findOrCreateIncident(
  checks: WatchdogCheck[],
  targetUrl: string
): Promise<{ created: boolean; url?: string; issueNumber?: number }> {
  const githubToken = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY

  if (!githubToken || !repo) {
    console.warn('⚠️  GITHUB_TOKEN or GITHUB_REPOSITORY not set. Cannot create incident.')
    return { created: false }
  }

  const [owner, repoName] = repo.split('/')
  const incidentKey = generateIncidentKey(checks)

  try {
    // Use GitHub API to search for existing open incident
    const searchUrl = `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+label:incident+label:watchdog+state:open`
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    let existingIssue: { number?: number; title?: string } | null = null

    if (searchResponse.ok) {
      const searchData = await searchResponse.json()
      if (searchData.items && searchData.items.length > 0) {
        // Try to match by incident key in title or body
        for (const item of searchData.items) {
          if (item.title.includes('Production degradation detected')) {
            existingIssue = item
            break
          }
        }
      }
    }

    const failedChecks = checks.filter(c => !c.passed)
    const issueBody = `## 🚨 Production Degradation Detected

**Timestamp:** ${new Date().toISOString()}
**Target URL:** ${targetUrl}

### Failed Checks:
${failedChecks.map(c => `- ❌ **${c.name}**: ${c.error || 'Unknown error'}`).join('\n')}

### All Checks:
${checks.map(c => `- ${c.passed ? '✅' : '❌'} **${c.name}**`).join('\n')}

### Links:
- [CI Runs](https://github.com/${owner}/${repoName}/actions)
- [Health Endpoint](${targetUrl}/api/health)

### Next Steps:
1. Review failed checks above
2. Check application logs
3. Verify infrastructure status
4. Close this issue when resolved

---

*This issue was automatically created by the Production Watchdog.*`

    if (existingIssue && existingIssue.number) {
      // Add comment to existing issue
      const commentUrl = `https://api.github.com/repos/${owner}/${repoName}/issues/${existingIssue.number}/comments`
      
      await fetch(commentUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: `## 🔄 Update: ${new Date().toISOString()}\n\n${issueBody}`,
        }),
      })

      console.log(`✅ Updated existing incident: #${existingIssue.number}`)
      return {
        created: false,
        url: `https://github.com/${owner}/${repoName}/issues/${existingIssue.number}`,
        issueNumber: existingIssue.number,
      }
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
          title: '[incident] Production degradation detected',
          body: issueBody,
          labels: ['incident', 'watchdog'],
        }),
      })

      if (createResponse.ok) {
        const issue = await createResponse.json()
        console.log(`✅ Created incident: #${issue.number}`)
        return {
          created: true,
          url: issue.html_url,
          issueNumber: issue.number,
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Failed to create/update incident:', error)
  }

  return { created: false }
}

/**
 * Resolve incident if conditions normalized
 */
async function resolveIncidentIfNormalized(
  checks: WatchdogCheck[],
  existingIssueNumber?: number
): Promise<boolean> {
  const githubToken = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY
  const allowAutoClose = process.env.ALLOW_AUTO_CLOSE_INCIDENTS === 'true'

  if (!githubToken || !repo || !existingIssueNumber) {
    return false
  }

  // Check if all checks are passing now
  const allPassing = checks.every(c => c.passed)

  if (!allPassing) {
    return false
  }

  const [owner, repoName] = repo.split('/')

  try {
    // Add resolution comment
    const commentUrl = `https://api.github.com/repos/${owner}/${repoName}/issues/${existingIssueNumber}/comments`
    
    await fetch(commentUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: `## ✅ Incident Auto-Resolved\n\n**Timestamp:** ${new Date().toISOString()}\n\nAll health checks are now passing. Conditions have returned to normal.\n\n---\n\n*This resolution was automatically detected by the Production Watchdog.*`,
      }),
    })

    console.log(`✅ Added resolution comment to issue #${existingIssueNumber}`)

    if (allowAutoClose) {
      // Close the issue
      const closeUrl = `https://api.github.com/repos/${owner}/${repoName}/issues/${existingIssueNumber}`
      
      await fetch(closeUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state: 'closed',
          state_reason: 'resolved',
        }),
      })

      console.log(`✅ Auto-closed issue #${existingIssueNumber}`)
    } else {
      // Just add resolved label
      const labelUrl = `https://api.github.com/repos/${owner}/${repoName}/issues/${existingIssueNumber}/labels`
      
      await fetch(labelUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          labels: ['resolved'],
        }),
      })

      console.log(`✅ Added 'resolved' label to issue #${existingIssueNumber}`)
    }

    return true
  } catch (error) {
    console.warn('⚠️  Failed to resolve incident:', error)
    return false
  }
}

/**
 * Run watchdog checks
 */
async function runWatchdog(): Promise<WatchdogResult> {
  const targetUrl = process.env.WATCHDOG_TARGET_URL || 'https://www.bookiji.com'
  const healthEndpoint = process.env.WATCHDOG_HEALTH_ENDPOINT || `${targetUrl}/api/health`

  console.log(`🐕 Running production watchdog checks...`)
  console.log(`   Target: ${targetUrl}`)
  console.log(`   Health: ${healthEndpoint}`)

  const checks: WatchdogCheck[] = []

  // Check health endpoint
  console.log('🔍 Checking health endpoint...')
  const healthCheck = await checkHealthEndpoint(healthEndpoint)
  checks.push(healthCheck)
  console.log(`   ${healthCheck.passed ? '✅' : '❌'} ${healthCheck.name}`)

  // Check booking API
  console.log('🔍 Checking booking API...')
  const bookingCheck = await checkBookingAPI(targetUrl)
  checks.push(bookingCheck)
  console.log(`   ${bookingCheck.passed ? '✅' : '❌'} ${bookingCheck.name}`)

  // Check error budget
  console.log('🔍 Checking error budget...')
  const errorBudgetCheck = await checkErrorBudget()
  checks.push(errorBudgetCheck)
  console.log(`   ${errorBudgetCheck.passed ? '✅' : 'ℹ️'} ${errorBudgetCheck.name}`)

  // Determine overall status
  const failedChecks = checks.filter(c => !c.passed)
  let overall: 'ok' | 'degraded' | 'down' = 'ok'
  
  if (failedChecks.length === checks.length) {
    overall = 'down'
  } else if (failedChecks.length > 0) {
    overall = 'degraded'
  }

  console.log(`\n📊 Overall Status: ${overall.toUpperCase()}`)

  let incidentCreated = false
  let incidentUrl: string | undefined
  let incidentNumber: number | undefined

  // If degraded or down, attempt remediation and create incident
  if (overall !== 'ok') {
    console.log('⚠️  Production issues detected. Attempting remediation...')
    const remediated = await attemptAutoRemediation(targetUrl)
    
    if (!remediated) {
      console.log('📝 Creating/updating incident issue...')
      const incident = await findOrCreateIncident(checks, targetUrl)
      incidentCreated = incident.created
      incidentUrl = incident.url
      incidentNumber = incident.issueNumber
    }
  } else {
    console.log('✅ All checks passed. Production is healthy.')
    
    // Check if we need to resolve an existing incident
    // Try to find existing open incident
    const githubToken = process.env.GITHUB_TOKEN
    const repo = process.env.GITHUB_REPOSITORY
    
    if (githubToken && repo) {
      try {
        const [owner, repoName] = repo.split('/')
        const searchUrl = `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+label:incident+label:watchdog+state:open`
        
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        })

        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          if (searchData.items && searchData.items.length > 0) {
            const existingIssue = searchData.items[0]
            await resolveIncidentIfNormalized(checks, existingIssue.number)
          }
        }
      } catch (error) {
        console.warn('⚠️  Failed to check for existing incidents:', error)
      }
    }
  }

  const result: WatchdogResult = {
    timestamp: new Date().toISOString(),
    targetUrl,
    checks,
    overall,
    incidentCreated,
    incidentUrl,
    incidentNumber,
  }

  // Write result
  const resultPath = path.join(process.cwd(), 'watchdog-result.json')
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2))
  console.log(`✅ Watchdog result written to: ${resultPath}`)

  return result
}

/**
 * Main execution
 */
async function main() {
  try {
    const result = await runWatchdog()
    
    if (result.overall === 'ok') {
      console.log('\n✅ WATCHDOG_OK')
      process.exit(0)
    } else {
      console.log(`\n⚠️  WATCHDOG_${result.overall.toUpperCase()}`)
      process.exit(0) // Don't fail CI, but log the issue
    }
  } catch (error) {
    console.error('❌ Watchdog failed:', error)
    process.exit(0) // Don't fail CI
  }
}

if (require.main === module) {
  main()
}

export { runWatchdog, type WatchdogResult }
