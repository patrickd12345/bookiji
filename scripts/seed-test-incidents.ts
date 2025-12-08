#!/usr/bin/env tsx
/**
 * Seed script to create test incidents and events for IncidentsAI testing
 */

import { createIncident } from './incidents-store'
import { createEvent } from './ops-events-store'

// Clear existing data by creating fresh files
const incidents = [
  {
    title: 'High latency on /api/quote endpoint',
    description: 'P95 latency has exceeded 500ms threshold for the past 15 minutes. Multiple users reporting slow quote generation.',
    severity: 'high' as const,
    source: 'monitoring' as const,
    signals: [
      {
        type: 'latency_spike',
        value: 750,
        threshold: 500,
        timestamp: new Date().toISOString(),
        source: 'health-check',
        metadata: { endpoint: '/api/quote', percentile: 'p95' }
      },
      {
        type: 'error_rate',
        value: 2.5,
        threshold: 1.0,
        timestamp: new Date().toISOString(),
        source: 'health-check',
        metadata: { endpoint: '/api/quote' }
      }
    ],
    affectedServices: ['/api/quote'],
    affectedUsers: 150,
    impact: 'Users experiencing 2-3 second delays when requesting quotes',
    metadata: {
      deploymentSha: 'abc123',
      region: 'us-east-1'
    },
    tags: ['latency', 'api', 'performance']
  },
  {
    title: 'Stripe DLQ depth increasing',
    description: 'Dead letter queue for Stripe webhooks has grown to 45 messages. Processing rate is slower than incoming rate.',
    severity: 'critical' as const,
    source: 'monitoring' as const,
    signals: [
      {
        type: 'dlq_growth',
        value: 45,
        threshold: 10,
        timestamp: new Date().toISOString(),
        source: 'stripe-webhook',
        metadata: { queue: 'stripe-dlq' }
      },
      {
        type: 'processing_rate',
        value: 2,
        threshold: 5,
        timestamp: new Date().toISOString(),
        source: 'stripe-webhook',
        metadata: { unit: 'messages/sec' }
      }
    ],
    affectedServices: ['stripe-webhook', '/api/payments/webhook'],
    affectedUsers: 45,
    impact: 'Payment confirmations may be delayed. Risk of double-charges if not addressed.',
    metadata: {
      queueName: 'stripe-dlq',
      lastProcessed: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    },
    tags: ['payments', 'webhook', 'dlq']
  },
  {
    title: 'Map provider fallback activated',
    description: 'Primary map provider (Google Maps) is experiencing intermittent failures. System has automatically switched to fallback provider.',
    severity: 'medium' as const,
    source: 'automated-detection' as const,
    signals: [
      {
        type: 'provider_failure',
        value: 'google-maps',
        threshold: 'available',
        timestamp: new Date().toISOString(),
        source: 'map-adapter',
        metadata: { provider: 'google-maps', status: 'degraded' }
      },
      {
        type: 'fallback_activation',
        value: 'mapbox',
        timestamp: new Date().toISOString(),
        source: 'map-adapter',
        metadata: { fallbackProvider: 'mapbox' }
      }
    ],
    affectedServices: ['/api/search/providers', 'map-service'],
    affectedUsers: 25,
    impact: 'Provider discovery may have slightly different results. No user-facing errors expected.',
    metadata: {
      primaryProvider: 'google-maps',
      fallbackProvider: 'mapbox',
      activationTime: new Date().toISOString()
    },
    tags: ['maps', 'provider', 'fallback']
  },
  {
    title: 'Increased error rate in analytics tracking',
    description: 'Analytics event storage is failing for ~5% of events. Non-critical but may impact reporting accuracy.',
    severity: 'low' as const,
    source: 'monitoring' as const,
    signals: [
      {
        type: 'error_rate',
        value: 5.2,
        threshold: 1.0,
        timestamp: new Date().toISOString(),
        source: 'analytics',
        metadata: { endpoint: '/api/analytics/track' }
      }
    ],
    affectedServices: ['/api/analytics/track'],
    affectedUsers: 0, // No direct user impact
    impact: 'Some analytics events may not be recorded. Reporting dashboards may show incomplete data.',
    metadata: {
      errorType: 'database_timeout',
      affectedTable: 'analytics_events'
    },
    tags: ['analytics', 'non-critical']
  }
]

const events = [
  {
    type: 'health-check' as const,
    severity: 'error' as const,
    title: 'Latency threshold exceeded',
    description: '/api/quote P95 latency: 750ms (threshold: 500ms)',
    source: 'health-check',
    service: '/api/quote',
    data: {
      endpoint: '/api/quote',
      latency: 750,
      threshold: 500,
      percentile: 'p95'
    },
    tags: ['latency', 'api']
  },
  {
    type: 'webhook' as const,
    severity: 'critical' as const,
    title: 'Stripe webhook processing failure',
    description: 'Failed to process payment_intent.succeeded event',
    source: 'stripe',
    service: '/api/payments/webhook',
    data: {
      eventType: 'payment_intent.succeeded',
      error: 'database_timeout',
      retryCount: 3
    },
    tags: ['stripe', 'webhook', 'payment']
  },
  {
    type: 'metric-threshold' as const,
    severity: 'warning' as const,
    title: 'DLQ depth alert',
    description: 'Stripe DLQ has 45 messages (threshold: 10)',
    source: 'monitoring',
    service: 'stripe-webhook',
    data: {
      queue: 'stripe-dlq',
      depth: 45,
      threshold: 10
    },
    tags: ['dlq', 'stripe']
  }
]

console.log('🌱 Seeding test incidents and events...')

// Create incidents
const createdIncidents = incidents.map((incident) => {
  return createIncident(incident)
})

console.log(`✅ Created ${createdIncidents.length} incidents`)

// Create events and link them to incidents
const firstIncidentId = createdIncidents[0]?.id
const secondIncidentId = createdIncidents[1]?.id

if (firstIncidentId) {
  createEvent({
    ...events[0],
    relatedIncidentIds: [firstIncidentId]
  })
  console.log('✅ Created event linked to incident 1')
}

if (secondIncidentId) {
  createEvent({
    ...events[1],
    relatedIncidentIds: [secondIncidentId]
  })
  createEvent({
    ...events[2],
    relatedIncidentIds: [secondIncidentId]
  })
  console.log('✅ Created events linked to incident 2')
}

console.log('✨ Seeding complete!')
console.log(`\nIncident IDs:`)
createdIncidents.forEach((incident, idx) => {
  console.log(`  ${idx + 1}. ${incident.id} - ${incident.title}`)
})






