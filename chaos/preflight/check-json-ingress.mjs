#!/usr/bin/env node
const INGRESS_INVARIANT_ID = 'I-INGRESS-1'
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const HEALTH_PATH = '/api/health'
const HTML_TAG_REGEX = /<!doctype|<html/i

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '')
}

class JsonIngressValidationError extends Error {
  constructor({
    code,
    invariantId = INGRESS_INVARIANT_ID,
    message,
    targetUrl,
    finalUrl,
    status,
    contentType,
    redirectLocation,
    bodySnippet,
    violations,
    likelyCauses
  }) {
    super(message)
    this.name = 'JsonIngressValidationError'
    this.code = code
    this.invariantId = invariantId
    this.targetUrl = targetUrl
    this.finalUrl = finalUrl
    this.status = status
    this.contentType = contentType
    this.redirectLocation = redirectLocation
    this.bodySnippet = bodySnippet
    this.violations = violations || []
    this.likelyCauses = likelyCauses || []
  }
}

export async function checkJsonIngress({ baseUrl = BASE_URL, fetchOptions = {} } = {}) {
  const normalizedBase = normalizeBaseUrl(baseUrl)
  const targetUrl = `${normalizedBase}${HEALTH_PATH}`

  let response
  try {
    response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      redirect: 'manual',
      ...fetchOptions
    })
  } catch (error) {
    throw new JsonIngressValidationError({
      code: 'INGRESS_UNREACHABLE',
      message: `${INGRESS_INVARIANT_ID}: Unable to reach ${targetUrl} (${error.message}).`,
      targetUrl,
      finalUrl: targetUrl,
      status: null,
      contentType: null,
      redirectLocation: null,
      bodySnippet: null,
      violations: [{ type: 'network', detail: error.message }],
      likelyCauses: [
        'Deployment is unreachable or BASE_URL is misconfigured.'
      ]
    })
  }

  const status = response.status
  const contentType = response.headers.get('content-type') || ''
  const redirectLocation = response.headers.get('location') || ''
  const finalUrl = response.url || targetUrl
  const rawBody = await response.text()
  const cleanedSnippet = (rawBody || '').trim().replace(/\s+/g, ' ').slice(0, 400)
  const bodySnippet = cleanedSnippet.length > 0 ? cleanedSnippet : '<empty response body>'
  const lowerContentType = contentType.toLowerCase()
  const violations = []
  const likelyCauses = new Set()

  const isRedirect = status >= 300 && status < 400
  if (isRedirect) {
    violations.push({
      type: 'redirect',
      detail: `HTTP ${status} redirect to ${redirectLocation || '<unknown location>'}`
    })
    likelyCauses.add('Vercel Preview Protection or another auth guard is redirecting to an HTML login page.')
  }

  const isHtmlContentType = lowerContentType.includes('text/html') || lowerContentType.includes('application/xhtml+xml')
  if (isHtmlContentType) {
    violations.push({
      type: 'content-type-html',
      detail: `Content-Type is ${contentType}`
    })
    likelyCauses.add('Preview protection is serving HTML instead of JSON from /api/health.')
  }

  const containsHtmlTag = HTML_TAG_REGEX.test(rawBody || '')
  if (containsHtmlTag) {
    violations.push({
      type: 'html-body',
      detail: 'Response body contains <html'
    })
    likelyCauses.add('An HTML auth wall (for example Vercel Preview Protection) returned a page instead of JSON.')
  }

  if (!response.ok) {
    violations.push({
      type: 'status',
      detail: `Status ${status}`
    })
    likelyCauses.add('The health endpoint returned a non-OK status, indicating either an unhealthy service or an interception.')
  }

  if (!lowerContentType.includes('json')) {
    violations.push({
      type: 'content-type-json',
      detail: `Content-Type is ${contentType || '<missing>'}`
    })
    likelyCauses.add('The endpoint did not advertise JSON, which often happens when HTML auth protection intercepts the call.')
  }

  if (violations.length > 0) {
    const causeList = Array.from(likelyCauses)
    const causeMessage = causeList.length > 0 ? causeList.join(' ') : 'Unknown ingress failure.'
    throw new JsonIngressValidationError({
      code: 'HTML_INGRESS_DETECTED',
      message: `${INGRESS_INVARIANT_ID}: JSON ingress validation failed for ${targetUrl}. ${causeMessage}`,
      targetUrl,
      finalUrl,
      status,
      contentType,
      redirectLocation,
      bodySnippet,
      violations,
      likelyCauses: causeList
    })
  }

  return {
    targetUrl,
    finalUrl,
    status,
    contentType,
    redirectLocation,
    bodySnippet
  }
}

export { JsonIngressValidationError }

if (process.argv[1] && process.argv[1].endsWith('check-json-ingress.mjs')) {
  ;(async () => {
    try {
      const result = await checkJsonIngress()
      console.log(`${INGRESS_INVARIANT_ID}: JSON ingress validation passed.`)
      console.log(`  Target URL: ${result.targetUrl}`)
      console.log(`  Final URL: ${result.finalUrl}`)
      console.log(`  HTTP status: ${result.status}`)
      console.log(`  Content-Type: ${result.contentType}`)
      console.log(`  Redirect location: ${result.redirectLocation || '<none>'}`)
      console.log(`  Body snippet: ${result.bodySnippet}`)
      process.exit(0)
    } catch (error) {
      console.error(`${INGRESS_INVARIANT_ID}: JSON ingress validation failed.`)
      if (error instanceof JsonIngressValidationError) {
        console.error(`  Target URL: ${error.targetUrl}`)
        console.error(`  Final URL: ${error.finalUrl || error.targetUrl}`)
        console.error(`  HTTP status: ${error.status ?? 'unknown'}`)
        console.error(`  Content-Type: ${error.contentType ?? '<missing>'}`)
        console.error(`  Redirect location: ${error.redirectLocation || '<none>'}`)
        if (error.bodySnippet) {
          console.error(`  Body snippet: ${error.bodySnippet}`)
        }
        if (Array.isArray(error.violations) && error.violations.length > 0) {
          console.error('  Violations:')
          error.violations.forEach(v => {
            console.error(`    - ${v.type}: ${v.detail}`)
          })
        }
        if (Array.isArray(error.likelyCauses) && error.likelyCauses.length > 0) {
          console.error('  Likely causes:')
          error.likelyCauses.forEach(cause => {
            console.error(`    - ${cause}`)
          })
        }
      } else {
        console.error(`  ${error.message}`)
      }
      process.exit(1)
    }
  })()
}
