import { describe, expect, test } from 'vitest'
import {
  buildWebhookPayload,
  formatDeploymentFallback,
  OpsAIWebhookEventType
} from '../src/webhook'

describe('Webhook formatting', () => {
  test('buildWebhookPayload sets metadata', () => {
    const payload = buildWebhookPayload('health.degraded', { current: 'down' })
    expect(payload.id).toMatch(/^wh_/)
    expect(payload.type).toBe<OpsAIWebhookEventType>('health.degraded')
    expect(payload.source).toBe('opsai')
    expect(new Date(payload.createdAt).toString()).not.toBe('Invalid Date')
  })

  test('formatDeploymentFallback emits safe placeholder', () => {
    const fallback = formatDeploymentFallback()
    expect(fallback.id).toBe('none')
    expect(fallback.status).toBe('pending')
    expect(fallback.service).toBe('ops-fabric')
  })
})
