#!/usr/bin/env node
/**
 * I-AUTH-SESSION-1 — Auth Session Validity Preflight
 * 
 * Enforces that a valid authenticated session exists before chaos execution.
 * 
 * Rules:
 * 1. A valid authenticated session MUST exist
 * 2. Anonymous, guest, partial, or expired sessions are fatal
 * 3. Redirects or HTML responses are fatal
 * 4. Role must match the expected chaos role (vendor vs customer)
 * 5. Failure MUST abort execution before any scenario or timer starts
 */

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const SESSION_PATH = '/api/auth/session'
const INVARIANT_ID = 'I-AUTH-SESSION-1'

class AuthSessionValidationError extends Error {
  constructor({ code, message, targetUrl, status, contentType, bodySnippet, violations, reason }) {
    super(message)
    this.name = 'AuthSessionValidationError'
    this.code = code
    this.invariantId = INVARIANT_ID
    this.targetUrl = targetUrl
    this.status = status
    this.contentType = contentType
    this.bodySnippet = bodySnippet
    this.violations = violations || []
    this.reason = reason
  }
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '')
}

/**
 * Check authentication session validity
 * 
 * @param {Object} options
 * @param {string} options.baseUrl - Base URL for the API
 * @param {string} options.expectedRole - Expected user role ('vendor' or 'customer')
 * @param {string} options.authToken - Bearer token for authentication
 * @param {Object} options.fetchOptions - Additional fetch options
 * @returns {Promise<Object>} Session validation result
 * @throws {AuthSessionValidationError} If validation fails
 */
export async function checkAuthSession({ 
  baseUrl = BASE_URL, 
  expectedRole,
  authToken,
  fetchOptions = {} 
} = {}) {
  if (!expectedRole) {
    throw new AuthSessionValidationError({
      code: 'MISSING_EXPECTED_ROLE',
      message: `${INVARIANT_ID} violation - expectedRole is required`,
      targetUrl: null,
      status: null,
      contentType: null,
      bodySnippet: null,
      violations: [{ type: 'config', detail: 'expectedRole parameter is required' }],
      reason: 'expectedRole must be specified (vendor or customer)'
    })
  }

  if (!authToken) {
    throw new AuthSessionValidationError({
      code: 'MISSING_AUTH_TOKEN',
      message: `${INVARIANT_ID} violation - authToken is required`,
      targetUrl: null,
      status: null,
      contentType: null,
      bodySnippet: null,
      violations: [{ type: 'config', detail: 'authToken parameter is required' }],
      reason: 'authToken must be provided for authenticated requests'
    })
  }

  const normalizedBase = normalizeBaseUrl(baseUrl)
  const targetUrl = `${normalizedBase}${SESSION_PATH}`

  let response
  try {
    response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      redirect: 'manual',
      ...fetchOptions
    })
  } catch (error) {
    throw new AuthSessionValidationError({
      code: 'SESSION_UNREACHABLE',
      message: `${INVARIANT_ID} violation - Failed to reach session endpoint: ${error.message}`,
      targetUrl,
      status: null,
      contentType: null,
      bodySnippet: null,
      violations: [{ type: 'network', detail: error.message }],
      reason: `Network error: ${error.message}`
    })
  }

  const status = response.status
  const contentType = response.headers.get('content-type') || ''
  const rawBody = await response.text()
  const bodySnippet = (rawBody || '').trim().replace(/\s+/g, ' ').slice(0, 400)
  const lowerBody = (rawBody || '').toLowerCase()
  const violations = []

  // Fail fast: Check for redirects (reuse ingress detection rules)
  const isRedirect = status >= 300 && status < 400
  if (isRedirect) {
    violations.push({
      type: 'redirect',
      detail: `Server returned ${status} with Location=${response.headers.get('location') || 'unknown'}`
    })
  }

  // Fail fast: Check for HTML content type
  const lowerContentType = contentType.toLowerCase()
  const isHtmlContentType = lowerContentType.includes('text/html') || lowerContentType.includes('application/xhtml+xml')
  if (isHtmlContentType) {
    violations.push({
      type: 'content-type-html',
      detail: `Content-Type is ${contentType}`
    })
  }

  // Fail fast: Check for HTML in body
  const containsHtmlTag = /<!doctype|<html/i.test(lowerBody)
  if (containsHtmlTag) {
    violations.push({
      type: 'html-body',
      detail: 'Response body contains <html'
    })
  }

  // If redirect or HTML detected, fail immediately (no JSON parsing)
  if (violations.length > 0) {
    throw new AuthSessionValidationError({
      code: 'HTML_OR_REDIRECT_DETECTED',
      message: `${INVARIANT_ID} violation - HTML or redirect detected while validating session endpoint`,
      targetUrl,
      status,
      contentType,
      bodySnippet: bodySnippet || '<empty response body>',
      violations,
      reason: 'Session endpoint returned HTML or redirect instead of JSON'
    })
  }

  // Check for non-OK status
  if (!response.ok) {
    throw new AuthSessionValidationError({
      code: 'SESSION_ENDPOINT_ERROR',
      message: `${INVARIANT_ID} violation - Session endpoint returned non-OK status ${status}`,
      targetUrl,
      status,
      contentType,
      bodySnippet: bodySnippet || '<empty response body>',
      violations: [{ type: 'status', detail: `Status was ${status}` }],
      reason: `Session endpoint returned ${status}`
    })
  }

  // Validate JSON content type
  if (!lowerContentType.includes('json')) {
    throw new AuthSessionValidationError({
      code: 'NON_JSON_RESPONSE',
      message: `${INVARIANT_ID} violation - Session endpoint did not return JSON (Content-Type: ${contentType})`,
      targetUrl,
      status,
      contentType,
      bodySnippet: bodySnippet || '<empty response body>',
      violations: [{ type: 'content-type', detail: contentType }],
      reason: `Expected JSON but got ${contentType}`
    })
  }

  // Parse JSON
  let sessionData
  try {
    sessionData = JSON.parse(rawBody)
  } catch (parseError) {
    throw new AuthSessionValidationError({
      code: 'INVALID_JSON',
      message: `${INVARIANT_ID} violation - Session endpoint returned invalid JSON`,
      targetUrl,
      status,
      contentType,
      bodySnippet: bodySnippet || '<empty response body>',
      violations: [{ type: 'json-parse', detail: parseError.message }],
      reason: 'Failed to parse JSON response'
    })
  }

  // Validate session exists
  if (!sessionData.session) {
    throw new AuthSessionValidationError({
      code: 'NO_SESSION',
      message: `${INVARIANT_ID} violation - No session found`,
      targetUrl,
      status,
      contentType,
      bodySnippet: bodySnippet || '<empty response body>',
      violations: [{ type: 'session-missing', detail: 'Response does not contain session object' }],
      reason: 'Session does not exist'
    })
  }

  // Validate user.id is present
  if (!sessionData.user?.id) {
    throw new AuthSessionValidationError({
      code: 'NO_USER_ID',
      message: `${INVARIANT_ID} violation - User ID is missing`,
      targetUrl,
      status,
      contentType,
      bodySnippet: bodySnippet || '<empty response body>',
      violations: [{ type: 'user-id-missing', detail: 'User ID is not present in response' }],
      reason: 'User ID is missing from session'
    })
  }

  // Validate role is not anonymous
  if (!sessionData.role || sessionData.role === 'anon') {
    throw new AuthSessionValidationError({
      code: 'ANONYMOUS_ROLE',
      message: `${INVARIANT_ID} violation - User role is anonymous or missing`,
      targetUrl,
      status,
      contentType,
      bodySnippet: bodySnippet || '<empty response body>',
      violations: [{ type: 'role-anonymous', detail: `Role is ${sessionData.role || 'missing'}` }],
      reason: `User role is anonymous (${sessionData.role || 'missing'})`
    })
  }

  // Validate role matches expected
  if (sessionData.role !== expectedRole) {
    throw new AuthSessionValidationError({
      code: 'ROLE_MISMATCH',
      message: `${INVARIANT_ID} violation - User role does not match expected role`,
      targetUrl,
      status,
      contentType,
      bodySnippet: bodySnippet || '<empty response body>',
      violations: [{ 
        type: 'role-mismatch', 
        detail: `Expected ${expectedRole} but got ${sessionData.role}` 
      }],
      reason: `Role mismatch: expected ${expectedRole}, got ${sessionData.role}`
    })
  }

  // Validate session expiry is in the future
  if (!sessionData.session.expires_at) {
    throw new AuthSessionValidationError({
      code: 'NO_EXPIRY',
      message: `${INVARIANT_ID} violation - Session expiry is missing`,
      targetUrl,
      status,
      contentType,
      bodySnippet: bodySnippet || '<empty response body>',
      violations: [{ type: 'expiry-missing', detail: 'Session expires_at is missing' }],
      reason: 'Session expiry timestamp is missing'
    })
  }

  const expiresAt = sessionData.session.expires_at
  const now = Math.floor(Date.now() / 1000) // Unix timestamp in seconds
  if (expiresAt <= now) {
    const expiryDate = new Date(expiresAt * 1000).toISOString()
    throw new AuthSessionValidationError({
      code: 'SESSION_EXPIRED',
      message: `${INVARIANT_ID} violation - Session has expired`,
      targetUrl,
      status,
      contentType,
      bodySnippet: bodySnippet || '<empty response body>',
      violations: [{ 
        type: 'expiry-past', 
        detail: `Session expired at ${expiryDate} (now: ${new Date().toISOString()})` 
      }],
      reason: `Session expired at ${expiryDate}`
    })
  }

  // All validations passed
  return {
    targetUrl,
    status,
    contentType,
    session: sessionData.session,
    user: sessionData.user,
    role: sessionData.role,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    expiresIn: sessionData.session.expires_in
  }
}

export { AuthSessionValidationError }

// CLI usage
if (process.argv[1] && process.argv[1].endsWith('check-auth-session.mjs')) {
  (async () => {
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
      const authToken = process.env.AUTH_TOKEN || process.env.CHAOS_AUTH_TOKEN
      const expectedRole = process.env.EXPECTED_ROLE || 'vendor'

      if (!authToken) {
        console.error(`\n${INVARIANT_ID} — Auth token required`)
        console.error('Set AUTH_TOKEN or CHAOS_AUTH_TOKEN environment variable')
        process.exit(1)
      }

      const result = await checkAuthSession({ 
        baseUrl, 
        expectedRole,
        authToken 
      })
      
      console.log(`\n${INVARIANT_ID} — Auth session validation passed`)
      console.log(`  User ID: ${result.user.id}`)
      console.log(`  Role: ${result.role}`)
      console.log(`  Expires at: ${result.expiresAt}`)
      console.log(`  Expires in: ${result.expiresIn}s`)
      process.exit(0)
    } catch (error) {
      console.error(`\n${INVARIANT_ID} — Auth session validation failed`)
      console.error(error.message)
      if (error instanceof AuthSessionValidationError) {
        console.error('Details:', {
          url: error.targetUrl,
          status: error.status,
          contentType: error.contentType,
          violations: error.violations,
          reason: error.reason
        })
      }
      process.exit(1)
    }
  })()
}






















