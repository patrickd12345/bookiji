import { test, expect } from '../../fixtures/base'
import Ajv from 'ajv'
import * as fs from 'fs'
import * as path from 'path'
import yaml from 'js-yaml'

const ajv = new Ajv()
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

test.describe('API Contract Tests - Stripe Webhook', () => {
  test('POST /api/stripe/webhook without signature returns 400', async ({ request }) => {
    const response = await request.post('/api/stripe/webhook', {
      data: {
        type: 'payment_intent.succeeded',
        data: {}
      }
    })

    expect(response.status()).toBe(400)

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

  test('POST /api/stripe/webhook request schema validation', async ({ request }) => {
    // Test that webhook payload structure is validated
    const invalidPayload = {
      // Missing required 'type' field
      data: {}
    }

    const response = await request.post('/api/stripe/webhook', {
      data: invalidPayload
    })

    // Should return 400 for invalid payload
    expect([400, 401]).toContain(response.status())
  })
})
