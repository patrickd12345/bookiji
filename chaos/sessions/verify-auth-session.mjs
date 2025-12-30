#!/usr/bin/env node
/**
 * Tooling: Verify Auth Session for Chaos Preflight
 * 
 * Prints detailed session validation information for debugging.
 * 
 * Usage:
 *   AUTH_TOKEN=<token> EXPECTED_ROLE=vendor node chaos/sessions/verify-auth-session.mjs
 */

import { checkAuthSession, AuthSessionValidationError } from '../preflight/check-auth-session.mjs'

const BASE_URL = process.env.BASE_URL || process.env.STAGING_URL || 'http://localhost:3000'
const AUTH_TOKEN = process.env.AUTH_TOKEN || process.env.CHAOS_AUTH_TOKEN
const EXPECTED_ROLE = process.env.EXPECTED_ROLE || 'vendor'

async function verifyAuthSession() {
  console.log('\n' + '='.repeat(60))
  console.log('AUTH SESSION VERIFICATION')
  console.log('='.repeat(60))
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Expected Role: ${EXPECTED_ROLE}`)
  console.log(`Auth Token: ${AUTH_TOKEN ? AUTH_TOKEN.substring(0, 20) + '...' : 'NOT SET'}`)
  console.log('='.repeat(60) + '\n')

  if (!AUTH_TOKEN) {
    console.error('❌ AUTH_TOKEN or CHAOS_AUTH_TOKEN environment variable is required')
    console.error('\nSet it with:')
    console.error('  export AUTH_TOKEN="your-token-here"')
    console.error('  OR')
    console.error('  export CHAOS_AUTH_TOKEN="your-token-here"')
    process.exit(1)
  }

  try {
    const result = await checkAuthSession({
      baseUrl: BASE_URL,
      expectedRole: EXPECTED_ROLE,
      authToken: AUTH_TOKEN
    })

    console.log('✅ AUTH SESSION VALIDATION PASSED\n')
    console.log('Session Details:')
    console.log(`  HTTP Status: ${result.status}`)
    console.log(`  Content-Type: ${result.contentType}`)
    console.log(`  User ID: ${result.user.id}`)
    console.log(`  User Email: ${result.user.email || 'N/A'}`)
    console.log(`  Role: ${result.role}`)
    console.log(`  Expires At: ${result.expiresAt}`)
    console.log(`  Expires In: ${result.expiresIn}s`)
    console.log(`  Target URL: ${result.targetUrl}`)
    console.log('\n✅ All validations passed\n')
    process.exit(0)
  } catch (error) {
    console.error('❌ AUTH SESSION VALIDATION FAILED\n')
    
    if (error instanceof AuthSessionValidationError) {
      console.error('Invariant:', error.invariantId)
      console.error('Error Code:', error.code)
      console.error('Reason:', error.reason)
      console.error('\nHTTP Details:')
      console.error(`  Status: ${error.status ?? 'N/A'}`)
      console.error(`  Content-Type: ${error.contentType ?? 'N/A'}`)
      console.error(`  Target URL: ${error.targetUrl ?? 'N/A'}`)
      
      if (error.violations && error.violations.length > 0) {
        console.error('\nViolations:')
        error.violations.forEach((violation, index) => {
          console.error(`  ${index + 1}. ${violation.type}: ${violation.detail}`)
        })
      }
      
      if (error.bodySnippet) {
        console.error('\nResponse Snippet:')
        console.error(`  ${error.bodySnippet}`)
      }
    } else {
      console.error('Error:', error.message)
      if (error.stack) {
        console.error('\nStack:', error.stack)
      }
    }
    
    console.error('\n❌ Validation failed\n')
    process.exit(1)
  }
}

verifyAuthSession()





















