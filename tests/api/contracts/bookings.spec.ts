import { test, expect } from '../../fixtures/base'
import Ajv from 'ajv'
import * as fs from 'fs'
import * as path from 'path'
import yaml from 'js-yaml'

const ajv = new Ajv({ strict: false })
let openApiSpec: any

// Load OpenAPI spec once
try {
  openApiSpec = yaml.load(
    fs.readFileSync(path.join(process.cwd(), 'openapi/bookiji.yaml'), 'utf-8')
  ) as any
} catch (error) {
  console.warn('Could not load OpenAPI spec:', error)
  openApiSpec = {}
}

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
        const validate = ajv.compile(errorSchema)
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
      const validate = ajv.compile(errorSchema)
      const valid = validate(body)
      expect(valid).toBe(true)
    } else {
      // Basic validation if schema not available
      expect(body).toHaveProperty('error')
    }
  })
})
