import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 vendors
    { duration: '1m', target: 20 },    // Stay at 20 vendors
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'errors': ['rate<0.01'],
    'http_req_failed': ['rate<0.01'],  // Should be near 0% with proper auth
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

/**
 * Setup phase: Authenticate once per test run and return auth token
 * This token is shared across all VUs for the test duration
 * 
 * Uses a dev-only helper endpoint that properly authenticates with Supabase JS client
 * to get a token in the correct format for Next.js API routes
 */
export function setup() {
  console.log('🔐 Authenticating vendor for load test...')
  console.log(`📍 Base URL: ${BASE_URL}`)

  // Use the dev helper endpoint that uses Supabase JS client (same pattern as simcity-auth)
  // This ensures the token format is compatible with Next.js API routes
  // Note: (dev) route group is omitted from URL in Next.js
  const authUrl = `${BASE_URL}/api/test/vendor-auth`
  const authParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  }

  const authResponse = http.get(authUrl, authParams)

  if (authResponse.status !== 200) {
    console.error(`❌ Authentication failed: ${authResponse.status}`)
    console.error(`Response: ${authResponse.body}`)
    throw new Error(`Failed to authenticate vendor: ${authResponse.status}`)
  }

  const authData = JSON.parse(authResponse.body)
  
  if (!authData.token) {
    console.error('❌ No token in auth response')
    console.error(`Response: ${JSON.stringify(authData, null, 2)}`)
    throw new Error('Failed to obtain access token')
  }

  console.log('✅ Vendor authenticated successfully')
  console.log(`📧 User: ${authData.email || 'unknown'}`)
  console.log(`⏰ Token expires in: ${authData.expiresIn || 'unknown'} seconds`)
  console.log(`🔑 Token preview: ${authData.token.substring(0, 20)}...`)

  // Verify token works by testing one vendor endpoint
  const testUrl = `${BASE_URL}/api/vendor/analytics`
  const testParams = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.token}`,
    },
  }
  const testResponse = http.get(testUrl, testParams)
  
  if (testResponse.status === 200) {
    console.log('✅ Token validation successful - vendor endpoint returned 200')
  } else {
    console.error(`⚠️  Token validation failed: ${testResponse.status}`)
    console.error(`Response: ${testResponse.body}`)
    // Don't throw - token might still work, just log the warning
  }

  return {
    accessToken: authData.token,
    expiresIn: authData.expiresIn,
    userId: authData.userId,
    email: authData.email,
  }
}

/**
 * Main test function: Execute vendor operations with authenticated requests
 * Each VU receives the auth data from setup() and reuses the token
 */
export default function (data) {
  // Extract auth token from setup data
  // If setup failed, data will be undefined - fail fast
  if (!data || !data.accessToken) {
    console.error('❌ No auth token available - setup phase failed')
    return
  }

  const authToken = data.accessToken

  // Simulate vendor operations
  const vendorFlow = [
    {
      name: 'Vendor Analytics',
      url: `${BASE_URL}/api/vendor/analytics`,
      method: 'GET',
      expectedFields: ['bookings_count', 'upcoming_bookings_count', 'completed_bookings_count'],
    },
    {
      name: 'Vendor Settings',
      url: `${BASE_URL}/api/vendor/settings`,
      method: 'GET',
      expectedFields: ['timezone', 'notification_preferences', 'visibility_flags'],
    },
    {
      name: 'Service Types',
      url: `${BASE_URL}/api/vendor/service-types`,
      method: 'GET',
      expectedFields: ['service_types'],
    },
  ]

  for (const step of vendorFlow) {
    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,  // Attach auth token to every request
      },
    }

    const response = step.method === 'GET'
      ? http.get(step.url, params)
      : http.post(step.url, null, params)

    // Validate response: expect 200, valid JSON, and required fields
    const responseBody = response.body ? JSON.parse(response.body) : null
    
    const success = check(response, {
      [`${step.name} status is 200`]: (r) => r.status === 200,
      [`${step.name} response is JSON`]: (r) => {
        try {
          const body = JSON.parse(r.body)
          return body !== null && typeof body === 'object'
        } catch {
          return false
        }
      },
      [`${step.name} has expected fields`]: (r) => {
        try {
          const body = JSON.parse(r.body)
          return step.expectedFields.every(field => {
            // Check if field exists (nested fields use dot notation)
            const parts = field.split('.')
            let value = body
            for (const part of parts) {
              if (value === null || value === undefined) return false
              value = value[part]
            }
            return value !== undefined
          })
        } catch {
          return false
        }
      },
      [`${step.name} response time < 500ms`]: (r) => r.timings.duration < 500,
    })

    errorRate.add(!success)

    // Log failures explicitly for debugging
    if (response.status !== 200) {
      console.error(`❌ ${step.name} returned ${response.status} - Response: ${response.body?.substring(0, 200)}`)
    }

    sleep(2) // Vendors update less frequently
  }
}
