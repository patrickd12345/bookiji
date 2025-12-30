#!/usr/bin/env node
const STAGING_URL = process.env.STAGING_URL || process.env.BASE_URL || 'http://localhost:3000'
const TARGET_PATH = '/api/(dev)/simcity-auth'
const SUMMARY_DIVIDER = '='.repeat(60)
const INGRESS_INVARIANT_ID = 'I-INGRESS-1'

const HTML_TAG_REGEX = /<!doctype|<html/i

function printHeader() {
  console.log('\n' + SUMMARY_DIVIDER)
  console.log(`${INGRESS_INVARIANT_ID}: PREVIEW ACCESS VERIFICATION`)
  console.log(SUMMARY_DIVIDER)
  console.log(`Preview URL: ${STAGING_URL}`)
}

async function verifyPreviewAccess() {
  printHeader()

  const targetUrl = `${STAGING_URL}${TARGET_PATH}`
  let response

  try {
    response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      redirect: 'manual'
    })
  } catch (error) {
    console.error('\nRequest failed while reaching preview deployment:')
    console.error(`  ${error.message}`)
    console.error('Likely cause: Deployment is offline, unreachable, or BASE_URL is incorrect.')
    return false
  }

  const status = response.status
  const contentType = response.headers.get('content-type') || ''
  const redirectLocation = response.headers.get('location') || ''
  const finalUrl = response.url || targetUrl
  const text = await response.text()
  const lowerContentType = contentType.toLowerCase()
  const htmlContentType = lowerContentType.includes('text/html') || lowerContentType.includes('application/xhtml+xml')
  const htmlBodyDetected = HTML_TAG_REGEX.test(text)
  const htmlReasons = []
  if (htmlContentType) htmlReasons.push('content-type')
  if (htmlBodyDetected) htmlReasons.push('body')
  const htmlDetected = htmlReasons.length > 0
  const redirectDetected = status >= 300 && status < 400

  console.log('\nFetch summary:')
  console.log(`  - HTTP status: ${status}`)
  console.log(`  - Content-Type: ${contentType || '<missing>'}`)
  console.log(
    `  - Redirect detected: ${redirectDetected ? `YES${redirectLocation ? ` (location: ${redirectLocation})` : ''}` : 'NO'}`
  )
  console.log(
    `  - HTML detected: ${htmlDetected ? `YES (via ${htmlReasons.join(' + ')})` : 'NO'}`
  )
  console.log(`  - Final URL: ${finalUrl}`)

  if (redirectDetected || htmlDetected) {
    console.error('\nIngress violation detected.')
    console.error('Likely cause: Vercel Preview Protection, preview password gating, or another HTML auth wall.')
    return false
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (_) {
    console.error('\nInvalid JSON response.')
    console.error(`Response snippet: ${text.substring(0, 200)}`)
    console.error('Likely cause: HTML auth wall replaced the payload with an HTML page.')
    return false
  }

  if (!parsed || typeof parsed !== 'object') {
    console.error('\nUnexpected response format.')
    console.error(`Body: ${text.substring(0, 200)}`)
    console.error('Likely cause: Preview deployment returned a non-JSON payload.')
    return false
  }

  if (!parsed.success || !parsed.token) {
    console.error('\nResponse does not match the expected structure.')
    console.error(`Body: ${JSON.stringify(parsed)}`)
    console.error('Likely cause: Auth gateway blocked the request or the endpoint is misconfigured.')
    return false
  }

  const safeToken = typeof parsed.token === 'string' ? parsed.token.slice(0, 20) : '<missing>'

  console.log('\nPreview endpoint is accessible and returns JSON.')
  console.log(`  Token issued: ${safeToken}${typeof parsed.token === 'string' ? '...' : ''}`)
  console.log(`  User ID: ${parsed.userId ?? '<missing>'}`)
  console.log(`  Email: ${parsed.email ?? '<missing>'}`)

  return true
}

verifyPreviewAccess()
  .then(success => {
    console.log('\n' + SUMMARY_DIVIDER)
    if (success) {
      console.log('PREVIEW ACCESS VERIFICATION PASSED')
      console.log('Preview deployment is reachable for SimCity authentication.')
    } else {
      console.log('PREVIEW ACCESS VERIFICATION FAILED')
      console.log('Fix deployment configuration before running chaos.')
    }
    console.log(SUMMARY_DIVIDER + '\n')
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('\nFatal error during preview verification:')
    console.error(`  ${error.message}`)
    console.log(SUMMARY_DIVIDER + '\n')
    process.exit(1)
  })












