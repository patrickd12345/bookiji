#!/usr/bin/env node
/**
 * Automatic Staging Deployment + SimCity Chaos Runner
 * 
 * Handles Vercel authentication and deployment automatically.
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '../..')

// Step 1: Get Vercel token
function getVercelToken() {
  // Check command line argument first
  const args = process.argv.slice(2)
  const tokenArg = args.find(arg => arg.startsWith('--token='))
  if (tokenArg) {
    const token = tokenArg.split('=')[1]
    console.log('✅ Using token from command line argument')
    return token
  }

  // Check environment variable
  if (process.env.VERCEL_TOKEN) {
    console.log('✅ Using VERCEL_TOKEN from environment')
    return process.env.VERCEL_TOKEN
  }

  // Check .env.local in repo root
  const envLocalPath = path.join(repoRoot, '.env.local')
  try {
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf8')
      const tokenMatch = envContent.match(/VERCEL_TOKEN\s*=\s*([^\s\r\n]+)/i)
      if (tokenMatch) {
        const token = tokenMatch[1].trim().replace(/^["']|["']$/g, '')
        console.log('✅ Found VERCEL_TOKEN in .env.local')
        return token
      }
    }
  } catch (e) {
    // Ignore
  }

  // Check ~/.vercel/auth.json
  const authPath = path.join(os.homedir(), '.vercel', 'auth.json')
  try {
    if (fs.existsSync(authPath)) {
      const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'))
      if (auth.token) {
        console.log('✅ Found Vercel token in ~/.vercel/auth.json')
        return auth.token
      }
    }
  } catch (e) {
    // Ignore
  }

  return null
}

// Step 2: Verify authentication
function verifyAuth(token) {
  try {
    const cmd = token ? `vercel whoami --token ${token}` : 'vercel whoami'
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' })
    console.log(`✅ Authenticated as: ${output.trim()}`)
    return true
  } catch (e) {
    return false
  }
}

// Step 3: Link project if needed
function linkProject(token) {
  const projectPath = path.join(repoRoot, '.vercel', 'project.json')
  if (fs.existsSync(projectPath)) {
    console.log('✅ Project already linked')
    return true
  }

  console.log('📋 Linking project...')
  try {
    const cmd = token ? `vercel link --yes --token ${token}` : 'vercel link --yes'
    execSync(cmd, { cwd: repoRoot, stdio: 'inherit' })
    console.log('✅ Project linked')
    return true
  } catch (e) {
    console.error('❌ Failed to link project')
    return false
  }
}

// Step 4: Deploy preview
function deployPreview(token) {
  console.log('\n🚀 Deploying preview (staging) runtime...')
  console.log('   This creates a preview deployment (NOT production)')
  
  // Temporarily handle cron job issue for Hobby plan
  const vercelJsonPath = path.join(repoRoot, 'vercel.json')
  const vercelJsonBackup = path.join(repoRoot, 'vercel.json.backup')
  let vercelJsonModified = false
  
  try {
    // Check if vercel.json has problematic cron (runs more than once per day on Hobby plan)
    if (fs.existsSync(vercelJsonPath)) {
      const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'))
      if (vercelJson.crons && Array.isArray(vercelJson.crons)) {
        const problematicCrons = vercelJson.crons.filter(cron => 
          cron.schedule && (cron.schedule.includes('*/5') || cron.schedule.includes('*/') && !cron.schedule.includes('0'))
        )
        if (problematicCrons.length > 0) {
          console.log('   Temporarily removing frequent cron jobs for deployment...')
          fs.copyFileSync(vercelJsonPath, vercelJsonBackup)
          vercelJson.crons = vercelJson.crons.filter(cron => 
            !(cron.schedule && (cron.schedule.includes('*/5') || cron.schedule.includes('*/') && !cron.schedule.includes('0')))
          )
          fs.writeFileSync(vercelJsonPath, JSON.stringify(vercelJson, null, 2))
          vercelJsonModified = true
        }
      }
    }
  } catch (e) {
    console.log('   Warning: Could not modify vercel.json:', e.message)
  }
  
  let url = null
  try {
    const cmd = token 
      ? `vercel deploy --yes --token ${token}` 
      : 'vercel deploy --yes'
    
    const output = execSync(cmd, { 
      cwd: repoRoot, 
      encoding: 'utf8',
      stdio: 'pipe'
    })

    // Extract URL from output (even if build might fail later)
    const urlMatch = output.match(/https:\/\/[^\s]+\.vercel\.app/)
    if (urlMatch) {
      url = urlMatch[0]
    } else {
      // Try to find "Preview:" line
      const previewMatch = output.match(/Preview:\s*(https:\/\/[^\s]+)/)
      if (previewMatch) {
        url = previewMatch[1]
      }
    }
  } catch (e) {
    // Even if command fails, try to extract URL from error output
    const errorOutput = e.stdout || e.message || ''
    const urlMatch = errorOutput.match(/https:\/\/[^\s]+\.vercel\.app/)
    if (urlMatch) {
      url = urlMatch[0]
    } else {
      const previewMatch = errorOutput.match(/Preview:\s*(https:\/\/[^\s]+)/)
      if (previewMatch) {
        url = previewMatch[1]
      }
    }
    
    // If we got a URL, that's success (build may fail later but URL exists)
    if (url) {
      console.log(`⚠️  Deployment command had issues, but URL was created`)
    } else {
      console.error('❌ Deployment failed and no URL found:', e.message)
    }
  } finally {
    // Always restore original vercel.json
    if (vercelJsonModified && fs.existsSync(vercelJsonBackup)) {
      console.log('   Restoring original vercel.json...')
      fs.copyFileSync(vercelJsonBackup, vercelJsonPath)
      fs.unlinkSync(vercelJsonBackup)
    }
  }

  if (url) {
    console.log(`✅ Preview URL: ${url}`)
    console.log(`   (Build may still be in progress - will verify before chaos)`)
    return url
  }

  return null
}

// Step 5: Verify deployment
async function verifyDeployment(url) {
  console.log(`\n🔍 Verifying deployment: ${url}/api/health`)
  
  const maxRetries = 5
  const retryDelay = 10000 // 10 seconds

  for (let i = 1; i <= maxRetries; i++) {
    try {
      const response = await fetch(`${url}/api/health`)
      
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('json')) {
          const data = await response.json()
          console.log(`✅ Health check passed! (Attempt ${i})`)
          console.log(`   Response: ${JSON.stringify(data).substring(0, 200)}`)
          return true
        } else {
          console.log(`⚠️  Health check returned non-JSON (Attempt ${i}): ${contentType}`)
        }
      }
    } catch (e) {
      console.log(`⚠️  Health check failed (Attempt ${i}/${maxRetries}): ${e.message}`)
      if (i < maxRetries) {
        console.log(`   Retrying in ${retryDelay/1000} seconds...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }

  console.error('❌ Health check failed after all retries')
  return false
}

// Step 6: Run chaos sessions
function runChaosSessions(stagingUrl) {
  console.log('\n' + '='.repeat(60))
  console.log('Running SimCity chaos sessions against staging...')
  console.log('='.repeat(60))
  console.log(`Environment: staging`)
  console.log(`Base URL: ${stagingUrl}`)
  console.log(`Incident Creation: ENABLED`)
  console.log('='.repeat(60) + '\n')

  // Set environment variables
  process.env.APP_ENV = 'staging'
  process.env.ENABLE_STAGING_INCIDENTS = 'true'
  process.env.BASE_URL = stagingUrl

  try {
    execSync('node chaos/sessions/run-simcity-sessions.mjs', {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        APP_ENV: 'staging',
        ENABLE_STAGING_INCIDENTS: 'true',
        BASE_URL: stagingUrl
      }
    })
    return 0
  } catch (e) {
    return e.status || 1
  }
}

// Main execution
async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('  AUTOMATIC STAGING DEPLOYMENT + SIMCITY CHAOS')
  console.log('='.repeat(60) + '\n')

  // Step 1: Get token
  const token = getVercelToken()
  if (!token) {
    console.error('❌ No Vercel authentication found')
    console.error('\nTo authenticate, choose one:')
    console.error('1. Run: vercel login (opens browser)')
    console.error('2. Set: $env:VERCEL_TOKEN = "your-token"')
    console.error('   Get token from: https://vercel.com/account/tokens')
    process.exit(1)
  }

  // Step 2: Verify auth
  if (!verifyAuth(token)) {
    console.error('❌ Authentication verification failed')
    process.exit(1)
  }

  // Step 3: Link project
  if (!linkProject(token)) {
    process.exit(1)
  }

  // Step 4: Deploy
  const stagingUrl = deployPreview(token)
  if (!stagingUrl) {
    process.exit(1)
  }

  // Step 5: Verify
  const verified = await verifyDeployment(stagingUrl)
  if (!verified) {
    console.error('\n⚠️  Deployment verification failed, but continuing...')
    console.error('   You can verify manually: curl ' + stagingUrl + '/api/health')
  }

  // Step 6: Run chaos
  const exitCode = runChaosSessions(stagingUrl)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('  DEPLOYMENT + CHAOS RUN SUMMARY')
  console.log('='.repeat(60))
  console.log(`Staging URL: ${stagingUrl}`)
  console.log(`Chaos Exit Code: ${exitCode}`)
  console.log(`\nObservation files: chaos/sessions/`)
  console.log('='.repeat(60) + '\n')

  process.exit(exitCode)
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

