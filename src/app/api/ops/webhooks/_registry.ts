export type WebhookEvent =
  | 'health.degraded'
  | 'bookings.anomaly'
  | 'deployments.new'
  | 'ops.test'

export type WebhookRegistration = {
  url: string
  events: WebhookEvent[]
  createdAt: string
  id: string
}

const registrations: WebhookRegistration[] = []

function uid() {
  return `wh_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export function listRegistrations() {
  return registrations
}

export function registerWebhook(url: string, events: WebhookEvent[]): WebhookRegistration {
  const existing = registrations.find((r) => r.url === url)
  if (existing) {
    existing.events = events
    return existing
  }
  const record: WebhookRegistration = {
    url,
    events,
    createdAt: new Date().toISOString(),
    id: uid()
  }
  registrations.push(record)
  return record
}

export function samplePayload(type: WebhookEvent) {
  const base = {
    id: uid(),
    type,
    createdAt: new Date().toISOString(),
    source: 'opsai'
  }

  switch (type) {
    case 'health.degraded':
      return {
        ...base,
        data: {
          previous: 'green',
          current: 'amber',
          impactedServices: ['api', 'worker']
        }
      }
    case 'bookings.anomaly':
      return {
        ...base,
        data: {
          baseline: 120,
          current: 52,
          windowMinutes: 15,
          severity: 'high'
        }
      }
    case 'deployments.new':
      return {
        ...base,
        data: {
          id: uid(),
          service: 'web',
          version: '2025.12.07.1',
          startedAt: new Date().toISOString(),
          status: 'pending'
        }
      }
    default:
      return { ...base, data: { message: 'OpsAI webhook test' } }
  }
}
