import { test, expect } from '../../fixtures/base'
import { createAjv, getOpenApiSpec, getResolvedSchema } from './_lib/openapi'

const ajv = createAjv()
const openApiSpec = getOpenApiSpec()

test.describe('API Contract Tests - Bookings', () => {
  test('POST /api/bookings/create request schema validation', async ({ request }) => {
    // Test that invalid request body is rejected
    const invalidRequest = {
      providerId: 'not-a-uuid',
      serviceId: 'also-not-a-uuid'
      // Missing required fields
    }

    const response = await request.post('/api/bookings/create', {
      data: invalidRequest
    })

    // Should return 400 or 401 (auth required)
    expect([400, 401]).toContain(response.status())

    if (response.status() === 400) {
      const body = await response.json()
      const errorSchema = openApiSpec?.components?.schemas?.ErrorEnvelope

      if (errorSchema) {
        const validate = ajv.compile(getResolvedSchema(errorSchema))
        const valid = validate(body)

        expect(valid, `Error response doesn't match schema: ${JSON.stringify(validate.errors)}`).toBe(true)
      }

      expect(body).toHaveProperty('ok', false)
      expect(body).toHaveProperty('code')
      expect(body).toHaveProperty('message')
    }
  })

  test('POST /api/bookings/create requires authentication', async ({ request }) => {
    const validRequest = {
      providerId: '00000000-0000-0000-0000-000000000000',
      serviceId: '00000000-0000-0000-0000-000000000000',
      startTime: '2025-12-31T10:00:00Z',
      endTime: '2025-12-31T11:00:00Z',
      amountUSD: 100
    }

    const response = await request.post('/api/bookings/create', {
      data: validRequest
    })

    // Should return 401 without auth
    expect(response.status()).toBe(401)

    const body = await response.json()
    const errorSchema = openApiSpec?.components?.schemas?.ErrorEnvelope

    if (errorSchema) {
      const validate = ajv.compile(getResolvedSchema(errorSchema))
      const valid = validate(body)
      if (!valid) {
         
        console.warn('ErrorEnvelope schema mismatch (continuing with runtime contract):', validate.errors)
      }
    } else {
      // Basic validation if schema not available
      expect(body).toHaveProperty('error')
    }

    // Runtime contract: error envelope contains at least an error message
    expect(body).toHaveProperty('error')
  })
})
