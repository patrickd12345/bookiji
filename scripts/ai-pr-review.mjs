#!/usr/bin/env node
/**
 * AI-Assisted PR Review
 * 
 * Analyzes PR changes and suggests relevant tests to run.
 * Posts a comment on the PR with risk assessment and test suggestions.
 */

import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY
const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH

if (!GITHUB_REPOSITORY || !GITHUB_EVENT_PATH) {
  console.warn('⚠️  Missing GitHub environment variables. Skipping AI review.')
  process.exit(0)
}

// Load PR event data
const event = JSON.parse(readFileSync(GITHUB_EVENT_PATH, 'utf-8'))
const prNumber = event.pull_request?.number
const prTitle = event.pull_request?.title || 'Unknown'
const prBody = event.pull_request?.body || ''

if (!prNumber) {
  console.warn('⚠️  No PR number found. Skipping AI review.')
  process.exit(0)
}

const [owner, repo] = GITHUB_REPOSITORY.split('/')

/**
 * Get changed files from GitHub API
 */
async function getChangedFiles() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const files = await response.json()
    return files.map(file => ({
      path: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
    }))
  } catch (error) {
    console.error('❌ Failed to fetch changed files:', error)
    return []
  }
}

/**
 * Call OpenAI API for analysis
 */
async function analyzeWithAI(changedFiles) {
  if (!OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not set. Skipping AI analysis.')
    return null
  }

  const fileSummary = changedFiles
    .map(f => `- ${f.path} (${f.status}, +${f.additions}/-${f.deletions})`)
    .join('\n')

  const prompt = `You are a senior platform engineer reviewing a pull request for a Next.js booking platform (Bookiji).

Repository: ${GITHUB_REPOSITORY}
PR Title: ${prTitle}
PR Description: ${prTitle}\n${prBody.substring(0, 500)}

Changed Files:
${fileSummary}

Analyze this PR and provide:
1. Risk level (low/medium/high) based on:
   - Changes to critical paths (auth, payments, database migrations, admin)
   - Test coverage of changed files
   - Complexity of changes

2. Suggested tests to run (specific Playwright specs or npm scripts):
   - E2E tests: "npx playwright test tests/e2e/booking-flow.spec.ts"
   - Contract tests: "npm run contract"
   - Chaos tests: "npm run chaos"
   - Unit tests for specific files

3. Areas of concern (e.g., "payments", "auth", "migrations", "admin")

Return ONLY valid JSON in this format:
{
  "risk": "low" | "medium" | "high",
  "summary": "Brief 2-3 sentence summary of the changes and their impact",
  "suggestedTests": ["npm run e2e", "npx playwright test tests/e2e/booking-flow.spec.ts", ...],
  "areasOfConcern": ["payments", "auth", ...]
}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a senior platform engineer. Always return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content in OpenAI response')
    }

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response')
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('❌ OpenAI API call failed:', error)
    return null
  }
}

/**
 * Find existing comment from this bot
 */
async function findExistingComment() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      return null
    }

    const comments = await response.json()
    const botComment = comments.find(
      comment =>
        comment.user.type === 'Bot' &&
        comment.body.includes('🤖 AI PR Review')
    )

    return botComment?.id || null
  } catch (error) {
    console.error('❌ Failed to fetch comments:', error)
    return null
  }
}

/**
 * Post or update PR comment
 */
async function postComment(analysis) {
  if (!analysis) {
    console.warn('⚠️  No analysis to post. Skipping comment.')
    return
  }

  const riskEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🔴',
  }[analysis.risk] || '⚪'

  const areasEmoji = analysis.areasOfConcern?.length
    ? analysis.areasOfConcern.map(a => `\`${a}\``).join(', ')
    : 'None identified'

  const testsList = analysis.suggestedTests?.length
    ? analysis.suggestedTests.map(t => `- \`${t}\``).join('\n')
    : '- No specific tests suggested'

  const commentBody = `## 🤖 AI PR Review

${riskEmoji} **Risk Level:** ${analysis.risk.toUpperCase()}

### Summary
${analysis.summary || 'No summary available'}

### Suggested Tests
${testsList}

### Areas of Concern
${areasEmoji}

---
*This is an automated review. Please verify suggestions before running tests.*`

  try {
    const existingCommentId = await findExistingComment()

    if (existingCommentId) {
      // Update existing comment
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/comments/${existingCommentId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: commentBody,
          }),
        }
      )

      if (response.ok) {
        console.log('✅ Updated existing PR comment')
      } else {
        throw new Error(`Failed to update comment: ${response.status}`)
      }
    } else {
      // Create new comment
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: commentBody,
          }),
        }
      )

      if (response.ok) {
        console.log('✅ Posted new PR comment')
      } else {
        const error = await response.text()
        throw new Error(`Failed to post comment: ${response.status} - ${error}`)
      }
    }
  } catch (error) {
    console.error('❌ Failed to post comment:', error)
    // Don't fail the job
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`🔍 Analyzing PR #${prNumber}: ${prTitle}`)

  const changedFiles = await getChangedFiles()
  console.log(`📝 Found ${changedFiles.length} changed files`)

  if (changedFiles.length === 0) {
    console.log('⚠️  No changed files. Skipping review.')
    process.exit(0)
  }

  const analysis = await analyzeWithAI(changedFiles)

  if (analysis) {
    console.log(`✅ Analysis complete. Risk: ${analysis.risk}`)
    await postComment(analysis)
  } else {
    console.warn('⚠️  Analysis unavailable. Skipping comment.')
  }

  // Always exit successfully to not block CI
  process.exit(0)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(0) // Don't fail CI
})



























