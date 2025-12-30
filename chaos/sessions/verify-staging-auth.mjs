#!/usr/bin/env node
/**
 * PREFLIGHT VERIFIER — STAGING AUTHENTICATION
 * 
 * Verifies that staging authentication is working before running chaos.
 * 
 * This script:
 * 1. Authenticates via /api/(dev)/simcity-auth
 * 2. Calls /api/health with auth token
 * 3. Asserts JSON + 200 response
 * 4. Exits non-zero on failure
 * 
 * Usage:
 *   STAGING_URL=https://... node chaos/sessions/verify-staging-auth.mjs
 */

const STAGING_URL = process.env.STAGING_URL || process.env.BASE_URL || 'http://localhost:3000'

async function verifyStagingAuth() {
  console.log('\n' + '='.repeat(60))
  console.log('STAGING AUTHENTICATION PREFLIGHT CHECK')
  console.log('='.repeat(60))
  console.log(`Staging URL: ${STAGING_URL}\n`)

  // Step 1: Get authentication token
  console.log('Step 1: Obtaining authentication token...')
  let authToken = null
  let userId = null

  try {
    const authResponse = await fetch(`${STAGING_URL}/api/(dev)/simcity-auth`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error(`❌ Authentication failed: ${authResponse.status}`)
      console.error(`   Response: ${errorText.substring(0, 200)}`)
      return false
    }

    const authData = await authResponse.json()
    
    if (!authData.token) {
      console.error('❌ No token in authentication response')
      console.error(`   Response: ${JSON.stringify(authData)}`)
      return false
    }

    authToken = authData.token
    userId = authData.userId
    console.log(`✅ Authentication successful`)
    console.log(`   User ID: ${userId}`)
    console.log(`   Email: ${authData.email}`)
    console.log(`   Token expires in: ${authData.expiresIn}s\n`)
  } catch (error) {
    console.error(`❌ Authentication request failed: ${error.message}`)
    return false
  }

  // Step 2: Verify unauthenticated request returns 401
  console.log('Step 2: Verifying unauthenticated request returns 401...')
  try {
    const unauthResponse = await fetch(`${STAGING_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (unauthResponse.status === 401) {
      console.log('   ✅ Unauthenticated request correctly returns 401\n')
    } else {
      const contentType = unauthResponse.headers.get('content-type') || ''
      if (contentType.includes('html')) {
        console.log('   ✅ Unauthenticated request returns HTML (auth redirect)\n')
      } else {
        console.log(`   ⚠️  Unauthenticated request returned ${unauthResponse.status} (expected 401)\n`)
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Unauthenticated check failed: ${error.message}\n`)
  }

  // Step 3: Verify authenticated request returns 200 JSON
  console.log('Step 3: Verifying authenticated request returns 200 JSON...')
  try {
    const healthResponse = await fetch(`${STAGING_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      }
    })

    const contentType = healthResponse.headers.get('content-type') || ''

    if (healthResponse.ok && contentType.includes('json')) {
      const healthData = await healthResponse.json()
      console.log('   ✅ Authenticated request returns 200 JSON')
      console.log(`   Response: ${JSON.stringify(healthData).substring(0, 200)}`)
      return true
    } else {
      const text = await healthResponse.text()
      console.error(`❌ Authenticated request failed: ${healthResponse.status}`)
      console.error(`   Content-Type: ${contentType}`)
      console.error(`   Response: ${text.substring(0, 200)}`)
      return false
    }
  } catch (error) {
    console.error(`❌ Authenticated health check failed: ${error.message}`)
    return false
  }
}

// Main execution
verifyStagingAuth()
  .then(success => {
    if (success) {
      console.log('\n' + '='.repeat(60))
      console.log('✅ PREFLIGHT CHECK PASSED')
      console.log('='.repeat(60))
      console.log('\nStaging authentication is ready for SimCity chaos.\n')
      process.exit(0)
    } else {
      console.log('\n' + '='.repeat(60))
      console.log('❌ PREFLIGHT CHECK FAILED')
      console.log('='.repeat(60))
      console.log('\nStaging authentication is not ready.')
      console.log('Fix authentication issues before running chaos.\n')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('\n❌ FATAL ERROR:', error)
    process.exit(1)
  })













