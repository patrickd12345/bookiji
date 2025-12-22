#!/usr/bin/env tsx
/**
 * Rollback Deployment
 * 
 * Rolls back to the previous production version when canary tests fail.
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const DEPLOY_TARGET = process.env.DEPLOY_TARGET || 'vercel'
const ROLLBACK_TO_VERSION = process.env.ROLLBACK_TO_VERSION

interface RollbackResult {
  success: boolean
  rolledBackUrl?: string
  error?: string
}

async function rollback(): Promise<RollbackResult> {
  console.log('⏪ Rolling back deployment...')

  try {
    if (DEPLOY_TARGET === 'vercel') {
      return await rollbackVercel()
    } else if (DEPLOY_TARGET === 'custom') {
      return await rollbackCustom()
    } else {
      throw new Error(`Unknown deploy target: ${DEPLOY_TARGET}`)
    }
  } catch (error) {
    console.error('❌ Rollback failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function rollbackVercel(): Promise<RollbackResult> {
  try {
    // Get previous deployment
    const deployments = execSync(
      `vercel ls --token=${process.env.VERCEL_TOKEN} --json`,
      { encoding: 'utf-8' }
    )

    const deploymentList = JSON.parse(deployments)
    const previousDeployment = deploymentList.find((d: any) => 
      d.state === 'READY' && d.target === 'production'
    )

    if (!previousDeployment) {
      throw new Error('No previous deployment found to rollback to')
    }

    // Promote previous deployment
    const output = execSync(
      `vercel promote ${previousDeployment.uid} --token=${process.env.VERCEL_TOKEN}`,
      { encoding: 'utf-8' }
    )

    const urlMatch = output.match(/https:\/\/[^\s]+/)
    const rolledBackUrl = urlMatch ? urlMatch[0] : 'https://www.bookiji.com'

    // Log rollback
    const rollbackInfo = {
      rolledBackAt: new Date().toISOString(),
      fromVersion: process.env.CANARY_VERSION || 'unknown',
      toVersion: previousDeployment.uid,
      url: rolledBackUrl,
      commit: process.env.GITHUB_SHA || 'unknown'
    }

    fs.writeFileSync(
      path.join(process.cwd(), '.rollback.json'),
      JSON.stringify(rollbackInfo, null, 2)
    )

    console.log(`✅ Rolled back to: ${rolledBackUrl}`)
    return { success: true, rolledBackUrl }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Vercel rollback failed'
    }
  }
}

async function rollbackCustom(): Promise<RollbackResult> {
  // Custom rollback logic here
  console.log('⚠️  Custom rollback not implemented')
  return {
    success: false,
    error: 'Custom rollback not implemented'
  }
}

// Main execution
if (require.main === module) {
  rollback()
    .then((result) => {
      if (result.success) {
        console.log(`✅ Rollback successful: ${result.rolledBackUrl}`)
        process.exit(0)
      } else {
        console.error(`❌ Rollback failed: ${result.error}`)
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { rollback }














