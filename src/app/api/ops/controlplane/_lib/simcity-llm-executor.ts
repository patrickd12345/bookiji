/**
 * LLM Event Executor
 *
 * Executes proposed LLM events by calling existing APIs/services.
 * This preserves system truth - all execution goes through real code paths.
 */

import type { LLMProposedEvent, EventExecutionResult } from './simcity-llm-events'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

/**
 * Execute a proposed LLM event
 *
 * This function:
 * - Maps event types to existing API endpoints/services
 * - Executes through real code paths (preserves RLS, validation, etc.)
 * - Records execution results
 * - Never mutates state directly
 *
 * @param event - Proposed event to execute
 * @returns Execution result with success/rejection/error details
 */
export async function executeLLMEvent(event: LLMProposedEvent): Promise<EventExecutionResult> {
  const startTime = Date.now()

  try {
    // Route to appropriate executor based on event type
    switch (event.event_type) {
      case 'CUSTOMER_REGISTER':
        return await executeCustomerRegister(event, startTime)
      case 'VENDOR_REGISTER':
        return await executeVendorRegister(event, startTime)
      case 'CUSTOMER_SEARCH':
        return await executeCustomerSearch(event, startTime)
      case 'CUSTOMER_BOOK':
        return await executeCustomerBook(event, startTime)
      case 'VENDOR_CONFIRM_BOOKING':
        return await executeVendorConfirmBooking(event, startTime)
      case 'VENDOR_CANCEL_BOOKING':
        return await executeVendorCancelBooking(event, startTime)
      case 'CUSTOMER_RATE_VENDOR':
        return await executeCustomerRateVendor(event, startTime)
      case 'VENDOR_CREATE_AVAILABILITY':
        return await executeVendorCreateAvailability(event, startTime)
      case 'VENDOR_SUBSCRIBE':
        return await executeVendorSubscribe(event, startTime)
      default:
        return {
          success: false,
          rejected: true,
          rejection_reason: `Unknown event type: ${event.event_type}`,
          latency_ms: Date.now() - startTime,
          invariant_status: 'ok',
        }
    }
  } catch (error) {
    return {
      success: false,
      rejected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      error_code: 'EXECUTION_ERROR',
      latency_ms: Date.now() - startTime,
      invariant_status: 'unknown',
    }
  }
}

/**
 * Execute CUSTOMER_REGISTER event
 */
async function executeCustomerRegister(
  event: LLMProposedEvent,
  startTime: number
): Promise<EventExecutionResult> {
  const config = getSupabaseConfig()
  const supabase = createClient(config.url, config.publishableKey)

  try {
    const email = (event.params.email as string) || `simcity+${event.actor.ref}@example.com`
    const password = (event.params.password as string) || 'SimCity123!'
    const full_name = (event.params.full_name as string) || `SimCity Customer ${event.actor.ref}`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role: 'customer',
        },
      },
    })

    if (error) {
      return {
        success: false,
        rejected: true,
        rejection_reason: error.message,
        error_code: error.status?.toString() || 'AUTH_ERROR',
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok', // Auth errors don't violate invariants
      }
    }

    return {
      success: !!data.user,
      rejected: false,
      latency_ms: Date.now() - startTime,
      invariant_status: 'ok',
    }
  } catch (error) {
    return {
      success: false,
      rejected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      error_code: 'EXECUTION_ERROR',
      latency_ms: Date.now() - startTime,
      invariant_status: 'unknown',
    }
  }
}

/**
 * Execute VENDOR_REGISTER event
 */
async function executeVendorRegister(
  event: LLMProposedEvent,
  startTime: number
): Promise<EventExecutionResult> {
  const config = getSupabaseConfig()
  const supabase = createClient(config.url, config.publishableKey)

  try {
    const email = (event.params.email as string) || `simcity+vendor+${event.actor.ref}@example.com`
    const password = (event.params.password as string) || 'SimCity123!'
    const business_name = (event.params.business_name as string) || `SimCity Vendor ${event.actor.ref}`

    // First create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: business_name,
          role: 'vendor',
        },
      },
    })

    if (authError) {
      return {
        success: false,
        rejected: true,
        rejection_reason: authError.message,
        error_code: authError.status?.toString() || 'AUTH_ERROR',
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok',
      }
    }

    if (!authData.user) {
      return {
        success: false,
        rejected: true,
        rejection_reason: 'Failed to create auth user',
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok',
      }
    }

    // Then create vendor profile via API
    // Use relative URL for internal API calls (works on any subdomain)
    const response = await fetch('/api/vendor/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_name,
        business_description: event.params.business_description || 'Generated by SimCity',
        city: event.params.city || 'SimCity',
        service_types: event.params.service_types || [],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        rejected: true,
        rejection_reason: errorText,
        error_code: response.status.toString(),
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok',
      }
    }

    return {
      success: true,
      rejected: false,
      latency_ms: Date.now() - startTime,
      invariant_status: 'ok',
    }
  } catch (error) {
    return {
      success: false,
      rejected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      error_code: 'EXECUTION_ERROR',
      latency_ms: Date.now() - startTime,
      invariant_status: 'unknown',
    }
  }
}

/**
 * Execute CUSTOMER_SEARCH event
 */
async function executeCustomerSearch(
  event: LLMProposedEvent,
  startTime: number
): Promise<EventExecutionResult> {
  try {
    // Use relative URL for internal API calls
    const response = await fetch(
      '/api/search/providers',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: event.params.query || '',
          location: event.params.location || {},
          service_type: event.params.service_type || null,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        rejected: true,
        rejection_reason: errorText,
        error_code: response.status.toString(),
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok',
      }
    }

    return {
      success: true,
      rejected: false,
      latency_ms: Date.now() - startTime,
      invariant_status: 'ok',
    }
  } catch (error) {
    return {
      success: false,
      rejected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      error_code: 'EXECUTION_ERROR',
      latency_ms: Date.now() - startTime,
      invariant_status: 'unknown',
    }
  }
}

/**
 * Execute CUSTOMER_BOOK event
 */
async function executeCustomerBook(
  event: LLMProposedEvent,
  startTime: number
): Promise<EventExecutionResult> {
  try {
    // Use relative URL for internal API calls
    const response = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In real implementation, would need to set auth headers for customer
        'X-SimCity-Actor': JSON.stringify(event.actor),
      },
      body: JSON.stringify({
        vendor_id: event.params.vendor_id,
        slot_id: event.params.slot_id,
        service_type: event.params.service_type,
        notes: event.params.notes || '',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        rejected: true,
        rejection_reason: errorText,
        error_code: response.status.toString(),
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok',
      }
    }

    return {
      success: true,
      rejected: false,
      latency_ms: Date.now() - startTime,
      invariant_status: 'ok',
    }
  } catch (error) {
    return {
      success: false,
      rejected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      error_code: 'EXECUTION_ERROR',
      latency_ms: Date.now() - startTime,
      invariant_status: 'unknown',
    }
  }
}

/**
 * Execute VENDOR_CONFIRM_BOOKING event
 */
async function executeVendorConfirmBooking(
  event: LLMProposedEvent,
  startTime: number
): Promise<EventExecutionResult> {
  try {
    const bookingId = event.params.booking_id as string
    if (!bookingId) {
      return {
        success: false,
        rejected: true,
        rejection_reason: 'booking_id is required',
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok',
      }
    }

    const response = await fetch(
      // Use relative URL for internal API calls
      '/api/bookings/confirm',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SimCity-Actor': JSON.stringify(event.actor),
        },
        body: JSON.stringify({
          booking_id: bookingId,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        rejected: true,
        rejection_reason: errorText,
        error_code: response.status.toString(),
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok',
      }
    }

    return {
      success: true,
      rejected: false,
      latency_ms: Date.now() - startTime,
      invariant_status: 'ok',
    }
  } catch (error) {
    return {
      success: false,
      rejected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      error_code: 'EXECUTION_ERROR',
      latency_ms: Date.now() - startTime,
      invariant_status: 'unknown',
    }
  }
}

/**
 * Execute VENDOR_CANCEL_BOOKING event
 */
async function executeVendorCancelBooking(
  event: LLMProposedEvent,
  startTime: number
): Promise<EventExecutionResult> {
  try {
    const bookingId = event.params.booking_id as string
    if (!bookingId) {
      return {
        success: false,
        rejected: true,
        rejection_reason: 'booking_id is required',
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok',
      }
    }

    const response = await fetch(
      // Use relative URL for internal API calls
      '/api/bookings/cancel',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SimCity-Actor': JSON.stringify(event.actor),
        },
        body: JSON.stringify({
          booking_id: bookingId,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        rejected: true,
        rejection_reason: errorText,
        error_code: response.status.toString(),
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok',
      }
    }

    return {
      success: true,
      rejected: false,
      latency_ms: Date.now() - startTime,
      invariant_status: 'ok',
    }
  } catch (error) {
    return {
      success: false,
      rejected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      error_code: 'EXECUTION_ERROR',
      latency_ms: Date.now() - startTime,
      invariant_status: 'unknown',
    }
  }
}

/**
 * Execute CUSTOMER_RATE_VENDOR event
 */
async function executeCustomerRateVendor(
  event: LLMProposedEvent,
  startTime: number
): Promise<EventExecutionResult> {
  try {
    const bookingId = event.params.booking_id as string
    const rating = event.params.rating as number
    const comment = (event.params.comment as string) || ''

    if (!bookingId || !rating) {
      return {
        success: false,
        rejected: true,
        rejection_reason: 'booking_id and rating are required',
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok',
      }
    }

    const response = await fetch(
      // Use relative URL for internal API calls
      `/api/ratings/booking/${bookingId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SimCity-Actor': JSON.stringify(event.actor),
        },
        body: JSON.stringify({
          rating,
          comment,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        rejected: true,
        rejection_reason: errorText,
        error_code: response.status.toString(),
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok',
      }
    }

    return {
      success: true,
      rejected: false,
      latency_ms: Date.now() - startTime,
      invariant_status: 'ok',
    }
  } catch (error) {
    return {
      success: false,
      rejected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      error_code: 'EXECUTION_ERROR',
      latency_ms: Date.now() - startTime,
      invariant_status: 'unknown',
    }
  }
}

/**
 * Execute VENDOR_CREATE_AVAILABILITY event
 */
async function executeVendorCreateAvailability(
  event: LLMProposedEvent,
  startTime: number
): Promise<EventExecutionResult> {
  try {
    const response = await fetch(
      // Use relative URL for internal API calls
      '/api/availability/generate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SimCity-Actor': JSON.stringify(event.actor),
        },
        body: JSON.stringify({
          start_time: event.params.start_time,
          end_time: event.params.end_time,
          service_type: event.params.service_type,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        rejected: true,
        rejection_reason: errorText,
        error_code: response.status.toString(),
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok',
      }
    }

    return {
      success: true,
      rejected: false,
      latency_ms: Date.now() - startTime,
      invariant_status: 'ok',
    }
  } catch (error) {
    return {
      success: false,
      rejected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      error_code: 'EXECUTION_ERROR',
      latency_ms: Date.now() - startTime,
      invariant_status: 'unknown',
    }
  }
}

/**
 * Execute VENDOR_SUBSCRIBE event
 */
async function executeVendorSubscribe(
  event: LLMProposedEvent,
  startTime: number
): Promise<EventExecutionResult> {
  try {
    const response = await fetch(
      // Use relative URL for internal API calls
      '/api/billing/create-checkout-session',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SimCity-Actor': JSON.stringify(event.actor),
        },
        body: JSON.stringify({
          price_id: event.params.price_id || 'default',
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        rejected: true,
        rejection_reason: errorText,
        error_code: response.status.toString(),
        latency_ms: Date.now() - startTime,
        invariant_status: 'ok',
      }
    }

    return {
      success: true,
      rejected: false,
      latency_ms: Date.now() - startTime,
      invariant_status: 'ok',
    }
  } catch (error) {
    return {
      success: false,
      rejected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      error_code: 'EXECUTION_ERROR',
      latency_ms: Date.now() - startTime,
      invariant_status: 'unknown',
    }
  }
}
