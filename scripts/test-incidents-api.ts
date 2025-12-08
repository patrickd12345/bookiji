#!/usr/bin/env node
/**
 * Test script for IncidentsAI endpoints
 * Creates test data and tests the API endpoints
 */

import { createIncident } from './incidents-store'
import { createEvent } from './ops-events-store'

console.log('🧪 Testing IncidentsAI system...\n')

// Create test incidents
const incident1 = createIncident({
  title: 'High latency on /api/quote endpoint',
  description: 'P95 latency has exceeded 500ms threshold',
  severity: 'high',
  source: 'monitoring',
  signals: [
    {
      type: 'latency_spike',
      value: 750,
      threshold: 500,
      timestamp: new Date().toISOString(),
      source: 'health-check',
      metadata: { endpoint: '/api/quote' }
    }
  ],
  affectedServices: ['/api/quote'],
  affectedUsers: 150,
  metadata: {},
  tags: ['latency']
})

const incident2 = createIncident({
  title: 'Stripe DLQ depth increasing',
  description: 'Dead letter queue has 45 messages',
  severity: 'critical',
  source: 'monitoring',
  signals: [
    {
      type: 'dlq_growth',
      value: 45,
      threshold: 10,
      timestamp: new Date().toISOString(),
      source: 'stripe-webhook',
      metadata: {}
    }
  ],
  affectedServices: ['stripe-webhook'],
  affectedUsers: 45,
  metadata: {},
  tags: ['payments']
})

console.log('✅ Created test incidents:')
console.log(`  1. ${incident1.id} - ${incident1.title}`)
console.log(`  2. ${incident2.id} - ${incident2.title}\n`)

// Create test events
const event1 = createEvent({
  type: 'health-check',
  severity: 'error',
  title: 'Latency threshold exceeded',
  source: 'health-check',
  service: '/api/quote',
  relatedIncidentIds: [incident1.id],
  data: { latency: 750 },
  tags: ['latency']
})

const event2 = createEvent({
  type: 'webhook',
  severity: 'critical',
  title: 'Stripe webhook failure',
  source: 'stripe',
  service: '/api/payments/webhook',
  relatedIncidentIds: [incident2.id],
  data: { error: 'timeout' },
  tags: ['stripe']
})

console.log('✅ Created test events')
console.log(`  Event 1: ${event1.id}`)
console.log(`  Event 2: ${event2.id}\n`)

console.log('✨ Test data created successfully!')
console.log('\n📋 Next steps:')
console.log('  1. Start dev server: pnpm dev')
console.log('  2. Test endpoints:')
console.log('     - GET /api/ops/incidents/list')
console.log('     - GET /api/ops/incidents/ai-triage')
console.log('     - GET /api/ops/incidents/[id]')
console.log('     - GET /api/ops/events?incidentId=[id]')





