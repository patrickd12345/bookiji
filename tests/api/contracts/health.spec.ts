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

test.describe('API Contract Tests - Health Endpoint', () => {
  test('GET /api/health matches OpenAPI schema', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json()

    // Get schema from OpenAPI spec
    const schema = openApiSpec?.paths?.['/api/health']?.get?.responses?.['200']?.content?.['application/json']?.schema

    if (schema) {
      // Validate response matches schema
      const validate = ajv.compile(schema)
      const valid = validate(body)

      expect(valid, `Schema validation failed: ${JSON.stringify(validate.errors)}`).toBe(true)
    }

    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('timestamp')
    expect(['healthy', 'unhealthy']).toContain(body.status)
  })

  test('GET /api/health returns 200 status', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
  })
})
