/**
 * Runtime Invariant Assertions
 * 
 * These assertions enforce invariants at runtime where state mutates.
 * Combined with static policy checks, they provide defense-in-depth.
 * 
 * See: docs/invariants/ for detailed invariant documentation
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type SupabaseAdmin = SupabaseClient<Database>

export class InvariantViolationError extends Error {
  code: string
  invariant: string

  constructor(invariant: string, message: string, code: string) {
    super(message)
    this.name = 'InvariantViolationError'
    this.code = code
    this.invariant = invariant
  }
}

/**
 * Assert: Booking state transition is valid
 * INV-3: No Direct State Transitions (bookings-lifecycle.md)
 */
export async function assertValidBookingStateTransition(
  supabase: SupabaseAdmin,
  bookingId: string,
  fromState: string,
  toState: string
): Promise<void> {
  // Allowed transitions
  const allowedTransitions: Record<string, string[]> = {
    hold_placed: ['confirmed', 'cancelled'],
    // Terminal state for v1 scope: once confirmed, Bookiji has handed off.
    // No post-booking state management (e.g. "completed", "no_show") is supported.
    confirmed: [],
    cancelled: []
  }

  if (!allowedTransitions[fromState]?.includes(toState)) {
    throw new InvariantViolationError(
      'INV-3',
      `Invalid booking state transition: ${fromState} → ${toState}`,
      'INVALID_STATE_TRANSITION'
    )
  }

  // Verify current state matches expected fromState
  const { data: booking } = await supabase
    .from('bookings')
    .select('state')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    throw new InvariantViolationError(
      'INV-3',
      `Booking ${bookingId} not found`,
      'BOOKING_NOT_FOUND'
    )
  }

  if (booking.state !== fromState) {
    throw new InvariantViolationError(
      'INV-3',
      `Booking state mismatch: expected ${fromState}, got ${booking.state}`,
      'STATE_MISMATCH'
    )
  }
}

/**
 * Assert: Payment intent is verified before booking creation
 * INV-1: Payment Intent Verification (payments-refunds.md)
 */
export function assertPaymentIntentVerified(
  paymentIntentId: string | null | undefined,
  verified: boolean
): void {
  if (!paymentIntentId) {
    throw new InvariantViolationError(
      'INV-1',
      'Payment intent ID is required',
      'MISSING_PAYMENT_INTENT'
    )
  }

  if (!verified) {
    throw new InvariantViolationError(
      'INV-1',
      `Payment intent ${paymentIntentId} not verified via Stripe API`,
      'PAYMENT_INTENT_NOT_VERIFIED'
    )
  }
}

/**
 * Assert: Slot is released when booking is cancelled
 * INV-4: Slot Release on Cancellation (bookings-lifecycle.md)
 */
export async function assertSlotReleasedOnCancellation(
  supabase: SupabaseAdmin,
  bookingId: string
): Promise<void> {
  const { data: booking } = await supabase
    .from('bookings')
    .select('slot_id, state')
    .eq('id', bookingId)
    .single()

  if (!booking || !booking.slot_id) {
    return // No slot to release
  }

  if (booking.state === 'cancelled') {
    // Verify slot is available
    const { data: slot } = await supabase
      .from('availability_slots')
      .select('is_available')
      .eq('id', booking.slot_id)
      .single()

    if (slot && !slot.is_available) {
      throw new InvariantViolationError(
        'INV-4',
        `Slot ${booking.slot_id} not released after booking ${bookingId} cancellation`,
        'SLOT_NOT_RELEASED'
      )
    }
  }
}

/**
 * Assert: Slot is claimed when booking is created
 * INV-1: Atomic Slot Claim (availability-slots.md)
 */
export async function assertSlotClaimedOnBooking(
  supabase: SupabaseAdmin,
  bookingId: string,
  slotId: string
): Promise<void> {
  const { data: slot } = await supabase
    .from('availability_slots')
    .select('is_available')
    .eq('id', slotId)
    .single()

  if (!slot) {
    throw new InvariantViolationError(
      'INV-1',
      `Slot ${slotId} not found`,
      'SLOT_NOT_FOUND'
    )
  }

  if (slot.is_available) {
    throw new InvariantViolationError(
      'INV-1',
      `Slot ${slotId} still available after booking ${bookingId} creation`,
      'SLOT_NOT_CLAIMED'
    )
  }
}






















