/**
 * LLM-Driven Event Source for SimCity
 *
 * This module implements an LLM Event Source that generates proposed events
 * while preserving system truth, invariants, and observability.
 *
 * Principles:
 * - LLM proposes events
 * - SimCity harness remains sole authority on execution, validation, and state mutation
 * - Impossible, invalid, and nonsensical events are ALLOWED and REQUIRED
 * - Failure is acceptable. Silent corruption is not.
 * - Invariants must NEVER be violated.
 */

import type { SimCityConfig, SimCityStatus } from './simcity'
import type { SimCityEventEnvelope } from './simcity-types'

/**
 * Strict event schema that LLM must output
 */
export type LLMProposedEvent = {
  event_id: string
  event_type:
    | 'CUSTOMER_REGISTER'
    | 'VENDOR_REGISTER'
    | 'CUSTOMER_SEARCH'
    | 'CUSTOMER_BOOK'
    | 'VENDOR_CONFIRM_BOOKING'
    | 'VENDOR_CANCEL_BOOKING'
    | 'CUSTOMER_RATE_VENDOR'
    | 'VENDOR_CREATE_AVAILABILITY'
    | 'VENDOR_SUBSCRIBE'
  actor: {
    kind: 'customer' | 'vendor' | 'admin'
    ref: string // string-id
  }
  params: Record<string, unknown> // any JSON
  intent: string // short human-readable explanation
  chaos_level: 'normal' | 'edge' | 'impossible'
}

/**
 * World snapshot exposed to LLM (compact, no secrets)
 */
export type LLMWorldSnapshot = {
  tick: number
  counts: {
    customers: number
    vendors: number
    bookings: number
    slots: number
  }
  recent_ids: {
    customers: string[]
    vendors: string[]
    bookings: string[]
  }
  feature_gates: {
    scheduling_requires_subscription: boolean
  }
  run_goals: {
    growth?: boolean
    churn?: boolean
    chaos?: boolean
  }
}

/**
 * Feasibility classification (internal, for metrics)
 */
export type EventFeasibility = 'FEASIBLE' | 'EXPECTED_REJECTION' | 'INVALID'

/**
 * Execution result
 */
export type EventExecutionResult = {
  success: boolean
  rejected: boolean
  error?: string
  error_code?: string
  rejection_reason?: string
  latency_ms: number
  invariant_status: 'ok' | 'violated' | 'unknown'
}

/**
 * Recorded event (proposed + outcome)
 */
export type RecordedLLMEvent = {
  proposed_event: LLMProposedEvent
  classification: EventFeasibility
  execution_result: EventExecutionResult
  tick: number
  recorded_at: string
}

/**
 * Validate LLM-proposed event against schema
 */
export function validateLLMEventSchema(raw: unknown): {
  valid: boolean
  event?: LLMProposedEvent
  error?: string
} {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Event must be an object' }
  }

  const obj = raw as Record<string, unknown>

  // Validate event_id
  if (typeof obj.event_id !== 'string' || !obj.event_id.startsWith('evt_')) {
    return { valid: false, error: 'event_id must be a string starting with "evt_"' }
  }

  // Validate event_type
  const validEventTypes = [
    'CUSTOMER_REGISTER',
    'VENDOR_REGISTER',
    'CUSTOMER_SEARCH',
    'CUSTOMER_BOOK',
    'VENDOR_CONFIRM_BOOKING',
    'VENDOR_CANCEL_BOOKING',
    'CUSTOMER_RATE_VENDOR',
    'VENDOR_CREATE_AVAILABILITY',
    'VENDOR_SUBSCRIBE',
  ]
  if (!validEventTypes.includes(obj.event_type as string)) {
    return { valid: false, error: `event_type must be one of: ${validEventTypes.join(', ')}` }
  }

  // Validate actor
  if (!obj.actor || typeof obj.actor !== 'object') {
    return { valid: false, error: 'actor must be an object' }
  }
  const actor = obj.actor as Record<string, unknown>
  if (!['customer', 'vendor', 'admin'].includes(actor.kind as string)) {
    return { valid: false, error: 'actor.kind must be "customer", "vendor", or "admin"' }
  }
  if (typeof actor.ref !== 'string') {
    return { valid: false, error: 'actor.ref must be a string' }
  }

  // Validate params (must be object)
  if (!obj.params || typeof obj.params !== 'object' || Array.isArray(obj.params)) {
    return { valid: false, error: 'params must be an object' }
  }

  // Validate intent
  if (typeof obj.intent !== 'string') {
    return { valid: false, error: 'intent must be a string' }
  }

  // Validate chaos_level
  if (!['normal', 'edge', 'impossible'].includes(obj.chaos_level as string)) {
    return { valid: false, error: 'chaos_level must be "normal", "edge", or "impossible"' }
  }

  return {
    valid: true,
    event: {
      event_id: obj.event_id as string,
      event_type: obj.event_type as LLMProposedEvent['event_type'],
      actor: {
        kind: actor.kind as 'customer' | 'vendor' | 'admin',
        ref: actor.ref as string,
      },
      params: obj.params as Record<string, unknown>,
      intent: obj.intent as string,
      chaos_level: obj.chaos_level as 'normal' | 'edge' | 'impossible',
    },
  }
}

/**
 * Classify event feasibility before execution
 */
export function classifyEventFeasibility(
  event: LLMProposedEvent,
  worldSnapshot: LLMWorldSnapshot
): EventFeasibility {
  // INVALID: Malformed or clearly nonsensical
  if (event.chaos_level === 'impossible') {
    // Check for obvious impossibilities
    if (
      (event.event_type === 'VENDOR_CONFIRM_BOOKING' || event.event_type === 'VENDOR_CANCEL_BOOKING') &&
      (!event.params.booking_id || typeof event.params.booking_id !== 'string')
    ) {
      return 'INVALID'
    }
    if (
      event.event_type === 'CUSTOMER_BOOK' &&
      (!event.params.vendor_id || typeof event.params.vendor_id !== 'string')
    ) {
      return 'INVALID'
    }
    // Some impossible events might still be structurally valid
    return 'EXPECTED_REJECTION'
  }

  // EXPECTED_REJECTION: Plausible but likely to fail
  if (event.chaos_level === 'edge') {
    // Edge cases that might fail:
    // - Booking without registration
    if (event.event_type === 'CUSTOMER_BOOK' && !worldSnapshot.recent_ids.customers.includes(event.actor.ref)) {
      return 'EXPECTED_REJECTION'
    }
    // - Confirming non-existent booking
    if (
      event.event_type === 'VENDOR_CONFIRM_BOOKING' &&
      !worldSnapshot.recent_ids.bookings.includes(event.params.booking_id as string)
    ) {
      return 'EXPECTED_REJECTION'
    }
    // - Acting without subscription when required
    if (
      event.event_type === 'VENDOR_CREATE_AVAILABILITY' &&
      worldSnapshot.feature_gates.scheduling_requires_subscription
    ) {
      // We don't track subscription status in snapshot, so this is plausible
      return 'EXPECTED_REJECTION'
    }
    return 'EXPECTED_REJECTION'
  }

  // FEASIBLE: Normal events that should succeed
  return 'FEASIBLE'
}

/**
 * Generate world snapshot for LLM
 */
export function generateWorldSnapshot(
  status: SimCityStatus,
  config: SimCityConfig
): LLMWorldSnapshot {
  // Extract counts from events (simplified - in real implementation, query DB)
  const events = status.events || []
  const customerEvents = events.filter((e) => e.event.domain === 'customer' || e.event.type === 'customer.register')
  const vendorEvents = events.filter((e) => e.event.domain === 'vendor' || e.event.type === 'vendor.register')
  const bookingEvents = events.filter((e) => e.event.domain === 'booking' || e.event.type === 'booking.created')

  // Extract recent IDs (last 10 of each)
  const recentCustomers: string[] = []
  const recentVendors: string[] = []
  const recentBookings: string[] = []

  for (const event of events.slice(-50).reverse()) {
    if (event.event.type === 'customer.register' && recentCustomers.length < 10) {
      const id = (event.event.payload as { customer_id?: string })?.customer_id
      if (id && typeof id === 'string') recentCustomers.push(id)
    }
    if (event.event.type === 'vendor.register' && recentVendors.length < 10) {
      const id = (event.event.payload as { vendor_id?: string })?.vendor_id
      if (id && typeof id === 'string') recentVendors.push(id)
    }
    if (event.event.type === 'booking.created' && recentBookings.length < 10) {
      const id = (event.event.payload as { booking_id?: string })?.booking_id
      if (id && typeof id === 'string') recentBookings.push(id)
    }
  }

  return {
    tick: status.tick,
    counts: {
      customers: customerEvents.length,
      vendors: vendorEvents.length,
      bookings: bookingEvents.length,
      slots: 0, // Would need to query availability table
    },
    recent_ids: {
      customers: recentCustomers,
      vendors: recentVendors,
      bookings: recentBookings,
    },
    feature_gates: {
      scheduling_requires_subscription: true, // Default assumption
    },
    run_goals: {
      growth: config.scenarios?.includes('growth') ?? false,
      churn: config.scenarios?.includes('churn') ?? false,
      chaos: config.scenarios?.includes('chaos') ?? true,
    },
  }
}
