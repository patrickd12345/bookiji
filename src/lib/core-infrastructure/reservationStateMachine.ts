/**
 * Reservation State Machine
 * 
 * Explicit state machine implementation for reservation lifecycle.
 * 
 * Rules:
 * - No timeless states (every state has a deadline)
 * - Every transition is append-only logged
 * - State transitions are guarded and idempotent
 * - No skipping states
 * - No backwards transitions (except explicit cancellation)
 */

import type {
  Reservation,
  ReservationState,
  StateTransitionLog,
} from '@/types/core-infrastructure'

/**
 * Valid state transitions map.
 */
const VALID_TRANSITIONS: Record<ReservationState, ReservationState[]> = {
  INTENT_CREATED: ['HELD'],
  HELD: ['AWAITING_VENDOR_CONFIRMATION', 'EXPIRED', 'CANCELLED'],
  AWAITING_VENDOR_CONFIRMATION: [
    'CONFIRMED_BY_VENDOR',
    'FAILED_VENDOR_TIMEOUT',
    'EXPIRED',
    'CANCELLED',
  ],
  CONFIRMED_BY_VENDOR: ['AWAITING_VENDOR_AUTH', 'EXPIRED', 'CANCELLED'],
  AWAITING_VENDOR_AUTH: [
    'VENDOR_AUTHORIZED',
    'FAILED_VENDOR_AUTH',
    'EXPIRED',
    'CANCELLED',
  ],
  VENDOR_AUTHORIZED: [
    'AWAITING_REQUESTER_AUTH',
    'EXPIRED',
    'CANCELLED',
  ],
  AWAITING_REQUESTER_AUTH: [
    'AUTHORIZED_BOTH',
    'FAILED_REQUESTER_AUTH',
    'EXPIRED',
    'CANCELLED',
  ],
  AUTHORIZED_BOTH: [
    'COMMIT_IN_PROGRESS',
    'FAILED_AVAILABILITY_CHANGED',
    'EXPIRED',
    'CANCELLED',
  ],
  COMMIT_IN_PROGRESS: ['COMMITTED', 'FAILED_COMMIT'],
  COMMITTED: [], // Terminal state
  FAILED_VENDOR_TIMEOUT: [], // Terminal state
  FAILED_VENDOR_AUTH: [], // Terminal state
  FAILED_REQUESTER_AUTH: [], // Terminal state
  FAILED_AVAILABILITY_CHANGED: [], // Terminal state
  FAILED_COMMIT: [], // Terminal state
  EXPIRED: [], // Terminal state
  CANCELLED: [], // Terminal state
}

/**
 * State deadlines (in minutes from state entry).
 */
const STATE_DEADLINES: Partial<Record<ReservationState, number>> = {
  HELD: 10,
  AWAITING_VENDOR_CONFIRMATION: 10,
  CONFIRMED_BY_VENDOR: 30,
  AWAITING_VENDOR_AUTH: 30,
  VENDOR_AUTHORIZED: 30,
  AWAITING_REQUESTER_AUTH: 30,
  AUTHORIZED_BOTH: 15,
  COMMIT_IN_PROGRESS: 15,
}

/**
 * Check if a state transition is valid.
 */
export function isValidTransition(
  from: ReservationState,
  to: ReservationState
): boolean {
  // Cancellation is always allowed (except from terminal states)
  if (to === 'CANCELLED') {
    return !isTerminalState(from)
  }
  
  const allowedTransitions = VALID_TRANSITIONS[from] || []
  return allowedTransitions.includes(to)
}

/**
 * Check if a state is terminal (no further transitions allowed).
 */
export function isTerminalState(state: ReservationState): boolean {
  return VALID_TRANSITIONS[state]?.length === 0
}

/**
 * Check if a state is a failure state.
 */
export function isFailureState(state: ReservationState): boolean {
  return state.startsWith('FAILED_') || state === 'EXPIRED'
}

/**
 * Calculate expiration time for a state.
 */
export function calculateExpirationTime(
  state: ReservationState,
  enteredAt: string // ISO 8601
): string | null {
  const deadlineMinutes = STATE_DEADLINES[state]
  if (!deadlineMinutes) {
    return null // No deadline for this state
  }
  
  const entered = new Date(enteredAt)
  const expiration = new Date(entered.getTime() + deadlineMinutes * 60 * 1000)
  return expiration.toISOString()
}

/**
 * Check if a reservation has expired.
 */
export function isExpired(reservation: Reservation): boolean {
  if (isTerminalState(reservation.state)) {
    return false // Terminal states don't expire
  }
  
  if (!reservation.expiresAt) {
    return false // No expiration set
  }
  
  return new Date(reservation.expiresAt) < new Date()
}

/**
 * State transition result.
 */
export interface TransitionResult {
  success: boolean
  newState?: ReservationState
  error?: string
  transitionLog?: StateTransitionLog
}

/**
 * Attempt a state transition.
 */
export function transitionState(
  reservation: Reservation,
  toState: ReservationState,
  triggeredBy: StateTransitionLog['triggeredBy'],
  reason?: string,
  metadata?: Record<string, unknown>,
  idempotencyKey?: string
): TransitionResult {
  // Check if already in target state (idempotent)
  if (reservation.state === toState) {
    return {
      success: true,
      newState: toState,
      transitionLog: {
        id: crypto.randomUUID(),
        reservationId: reservation.id,
        fromState: reservation.state,
        toState: toState,
        triggeredBy,
        reason: reason || 'Idempotent transition',
        metadata,
        timestamp: new Date().toISOString(),
        idempotencyKey,
      },
    }
  }
  
  // Check if current state is terminal
  if (isTerminalState(reservation.state)) {
    return {
      success: false,
      error: `Cannot transition from terminal state: ${reservation.state}`,
    }
  }
  
  // Check if transition is valid
  if (!isValidTransition(reservation.state, toState)) {
    return {
      success: false,
      error: `Invalid transition: ${reservation.state} → ${toState}`,
    }
  }
  
  // Check if expired (unless transitioning to EXPIRED)
  if (isExpired(reservation) && toState !== 'EXPIRED') {
    return {
      success: false,
      error: 'Reservation has expired',
    }
  }
  
  // Create transition log
  const transitionLog: StateTransitionLog = {
    id: crypto.randomUUID(),
    reservationId: reservation.id,
    fromState: reservation.state,
    toState: toState,
    triggeredBy,
    reason,
    metadata,
    timestamp: new Date().toISOString(),
    idempotencyKey,
  }
  
  return {
    success: true,
    newState: toState,
    transitionLog,
  }
}

/**
 * Get next valid states for a given state.
 */
export function getNextValidStates(
  state: ReservationState
): ReservationState[] {
  return VALID_TRANSITIONS[state] || []
}

/**
 * Get state deadline in minutes.
 */
export function getStateDeadline(state: ReservationState): number | null {
  return STATE_DEADLINES[state] || null
}

/**
 * Update reservation with new state and timestamps.
 */
export function updateReservationForState(
  reservation: Reservation,
  newState: ReservationState,
  transitionLog: StateTransitionLog
): Reservation {
  const now = new Date().toISOString()
  const updated: Reservation = {
    ...reservation,
    state: newState,
  }
  
  // Update state-specific timestamps
  switch (newState) {
    case 'HELD':
      updated.heldAt = now
      updated.ttlStage = 'initial'
      updated.ttlMinutes = 10
      break
    case 'AWAITING_VENDOR_CONFIRMATION':
      updated.vendorNotifiedAt = now
      break
    case 'CONFIRMED_BY_VENDOR':
      updated.vendorConfirmedAt = now
      updated.ttlStage = 'vendor_confirmed'
      updated.ttlMinutes = 30
      break
    case 'VENDOR_AUTHORIZED':
      updated.vendorAuthAt = now
      break
    case 'AUTHORIZED_BOTH':
      updated.authorizedBothAt = now
      updated.requesterAuthAt = now
      updated.ttlStage = 'authorized_both'
      updated.ttlMinutes = 15
      break
    case 'COMMIT_IN_PROGRESS':
      updated.commitStartedAt = now
      break
    case 'COMMITTED':
      updated.committedAt = now
      break
    case 'FAILED_VENDOR_TIMEOUT':
    case 'FAILED_VENDOR_AUTH':
    case 'FAILED_REQUESTER_AUTH':
    case 'FAILED_AVAILABILITY_CHANGED':
    case 'FAILED_COMMIT':
      updated.failedAt = now
      updated.failureReason = transitionLog.reason
      break
    case 'EXPIRED':
      updated.failedAt = now
      updated.failureReason = 'TTL exceeded'
      break
    case 'CANCELLED':
      updated.cancelledAt = now
      break
  }
  
  // Calculate expiration time
  const expirationTime = calculateExpirationTime(newState, now)
  if (expirationTime) {
    updated.expiresAt = expirationTime
  }
  
  return updated
}

/**
 * State machine guard: Check if transition is allowed with business rules.
 */
export interface TransitionGuard {
  check(reservation: Reservation, toState: ReservationState): Promise<{
    allowed: boolean
    reason?: string
  }>
}

/**
 * Default guard implementations.
 */
export const guards: Record<string, TransitionGuard> = {
  /**
   * Guard: Cannot commit if availability changed.
   */
  availabilityCheck: {
    async check(reservation, toState) {
      if (toState === 'COMMIT_IN_PROGRESS') {
        // TODO: Implement availability revalidation
        // For now, always allow (should be implemented)
        return { allowed: true }
      }
      return { allowed: true }
    },
  },
  
  /**
   * Guard: Cannot authorize if payment intents not created.
   */
  paymentIntentCheck: {
    async check(reservation, toState) {
      if (toState === 'VENDOR_AUTHORIZED' && !reservation.paymentState?.vendorPaymentIntentId) {
        return {
          allowed: false,
          reason: 'Vendor payment intent not created',
        }
      }
      if (toState === 'AUTHORIZED_BOTH' && !reservation.paymentState?.requesterPaymentIntentId) {
        return {
          allowed: false,
          reason: 'Requester payment intent not created',
        }
      }
      return { allowed: true }
    },
  },
}
