/**
 * Core Infrastructure Type Definitions
 * 
 * Canonical schemas for Bookiji's availability, reservation, and booking coordination system.
 * 
 * These types define the production-grade infrastructure for:
 * - Availability computation and exposure
 * - Reservation/hold management
 * - Payment orchestration
 * - State machine transitions
 * - Partner API contracts
 */

// ============================================================================
// AVAILABILITY MODEL
// ============================================================================

/**
 * Represents computed availability for a vendor over a time range.
 * 
 * Availability is:
 * - Deterministic (same inputs → same outputs)
 * - Recomputable (can regenerate from source data)
 * - Explainable (can show why a slot is/isn't available)
 * - Versioned (hash or revision ID for cache invalidation)
 */
export interface VendorAvailability {
  vendorId: string
  startTime: string // ISO 8601
  endTime: string // ISO 8601
  computedAt: string // ISO 8601
  computedVersion: string // Hash or revision ID
  slots: AvailabilitySlot[]
  metadata: {
    confidenceThreshold: number // 0.0 to 1.0
    computationTimeMs: number
    calendarSource: 'google' | 'outlook' | 'native'
    lastCalendarSync?: string // ISO 8601
  }
}

/**
 * A specific time slot that may be available for booking.
 * 
 * IMPORTANT: Availability is NEVER a guarantee. It's a computed snapshot.
 */
export interface AvailabilitySlot {
  startTime: string // ISO 8601
  endTime: string // ISO 8601
  isAvailable: boolean // Computed, not guaranteed
  confidence: number // 0.0 to 1.0
  reasons: string[] // Explanation of availability status
  computedAt: string // ISO 8601
  computedVersion: string // Hash/revision ID
  
  // Optional metadata
  bufferBefore?: number // Minutes before slot
  bufferAfter?: number // Minutes after slot
  minimumNotice?: number // Minutes advance notice required
}

/**
 * Confidence scoring levels for availability slots.
 */
export enum AvailabilityConfidence {
  GUARANTEED = 1.0, // Calendar explicitly free, all rules satisfied
  HIGH = 0.8, // Calendar free, but near buffer zone
  MEDIUM = 0.6, // Calendar free, but minimum notice not met
  LOW = 0.4, // Calendar free, but outside business hours
  VERY_LOW = 0.2, // Calendar shows tentative/busy
  UNAVAILABLE = 0.0 // Calendar explicitly busy
}

/**
 * Availability computation factors.
 */
export interface AvailabilityComputationFactors {
  workingHours: WorkingHours
  freeBusyBlocks: CalendarBlock[]
  buffers: {
    preBooking: number // Minutes before booking
    postBooking: number // Minutes after booking
  }
  slotDuration: number // Minimum bookable time (minutes)
  minimumNotice: number // How far in advance bookings allowed (minutes)
  bookingHorizon: number // How far out bookings allowed (days)
}

export interface WorkingHours {
  timezone: string
  days: {
    [day: string]: TimeRange[] // e.g., "monday": [{ start: "09:00", end: "17:00" }]
  }
}

export interface TimeRange {
  start: string // HH:mm format
  end: string // HH:mm format
}

export interface CalendarBlock {
  startTime: string // ISO 8601
  endTime: string // ISO 8601
  status: 'free' | 'busy' | 'tentative' | 'out_of_office'
  source: 'google' | 'outlook' | 'native'
  eventId?: string
}

// ============================================================================
// RESERVATION / HOLD MODEL
// ============================================================================

/**
 * Reservation states following strict state machine.
 */
export type ReservationState =
  | 'INTENT_CREATED' // Initial creation, not yet held
  | 'HELD' // Slot held, awaiting vendor confirmation
  | 'AWAITING_VENDOR_CONFIRMATION' // Vendor notified, awaiting response
  | 'CONFIRMED_BY_VENDOR' // Vendor approved
  | 'AWAITING_VENDOR_AUTH' // Vendor payment authorization pending
  | 'VENDOR_AUTHORIZED' // Vendor deposit authorized
  | 'AWAITING_REQUESTER_AUTH' // Requester payment authorization pending
  | 'AUTHORIZED_BOTH' // Both authorizations complete
  | 'COMMIT_IN_PROGRESS' // Atomic commit executing
  | 'COMMITTED' // Finalized booking
  | 'FAILED_VENDOR_TIMEOUT' // Vendor didn't confirm in time
  | 'FAILED_VENDOR_AUTH' // Vendor authorization failed
  | 'FAILED_REQUESTER_AUTH' // Requester authorization failed
  | 'FAILED_AVAILABILITY_CHANGED' // Slot no longer available
  | 'FAILED_COMMIT' // Commit failed (requires compensation)
  | 'EXPIRED' // TTL exceeded
  | 'CANCELLED' // Explicitly cancelled

/**
 * A reservation represents a partner's intent to book a slot.
 * 
 * Reservations are SOFT HOLDS with staged TTLs.
 */
export interface Reservation {
  id: string // UUID
  partnerId: string // Partner API key identifier
  vendorId: string
  requesterId: string // Partner's requester identifier
  slotStartTime: string // ISO 8601
  slotEndTime: string // ISO 8601
  state: ReservationState
  createdAt: string // ISO 8601
  expiresAt: string // ISO 8601 (calculated based on state)
  
  // State timestamps
  heldAt?: string
  vendorNotifiedAt?: string
  vendorConfirmedAt?: string
  vendorAuthAt?: string
  requesterAuthAt?: string
  authorizedBothAt?: string
  commitStartedAt?: string
  committedAt?: string
  failedAt?: string
  cancelledAt?: string
  
  // TTL stages
  ttlStage: 'initial' | 'vendor_confirmed' | 'authorized_both'
  ttlMinutes: number // Current TTL in minutes
  
  // Payment state
  paymentState?: PaymentState
  
  // Booking reference (if committed)
  bookingId?: string
  
  // Failure information
  failureReason?: string
  failureCode?: string
  
  // Metadata
  metadata?: Record<string, unknown>
  idempotencyKey?: string // Partner-provided idempotency key
}

/**
 * Staged TTL configuration.
 */
export interface ReservationTTLConfig {
  initialHold: number // Minutes (default: 10)
  afterVendorConfirmation: number // Minutes (default: 30)
  afterBothAuths: number // Minutes (default: 15)
}

/**
 * State transition log entry (append-only).
 */
export interface StateTransitionLog {
  id: string // UUID
  reservationId: string
  fromState: ReservationState
  toState: ReservationState
  triggeredBy: 'system' | 'vendor' | 'requester' | 'partner' | 'timeout' | 'reconciliation'
  reason?: string
  metadata?: Record<string, unknown>
  timestamp: string // ISO 8601
  idempotencyKey?: string
}

// ============================================================================
// PAYMENT MODEL
// ============================================================================

/**
 * Payment state tracking for dual authorization.
 */
export interface PaymentState {
  // Vendor payment
  vendorPaymentIntentId?: string
  vendorPaymentIntentStatus?: StripePaymentIntentStatus
  vendorAuthorizedAt?: string // ISO 8601
  vendorCaptureId?: string
  vendorCaptureAttempts: number
  vendorLastCaptureError?: string
  
  // Requester payment
  requesterPaymentIntentId?: string
  requesterPaymentIntentStatus?: StripePaymentIntentStatus
  requesterAuthorizedAt?: string // ISO 8601
  requesterCaptureId?: string
  requesterCaptureAttempts: number
  requesterLastCaptureError?: string
  
  // Amounts
  vendorAmount: number // Cents
  requesterAmount: number // Cents
  currency: string
  
  // External references
  stripeAccountId?: string // Vendor's Stripe Connect account ID
}

export type StripePaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'succeeded'
  | 'canceled'

/**
 * Payment operation result.
 */
export interface PaymentOperationResult {
  success: boolean
  paymentIntentId?: string
  error?: string
  errorCode?: string
  retryable: boolean
}

/**
 * Compensation action result.
 */
export interface CompensationResult {
  success: boolean
  actions: CompensationAction[]
  errors?: string[]
}

export interface CompensationAction {
  type: 'release_auth' | 'cancel_capture' | 'refund'
  paymentIntentId: string
  amount?: number
  result: 'success' | 'failed' | 'skipped'
  error?: string
}

// ============================================================================
// BOOKING MODEL
// ============================================================================

/**
 * Finalized booking (after atomic commit).
 */
export interface Booking {
  id: string // UUID
  reservationId: string
  vendorId: string
  requesterId: string
  partnerId: string
  slotStartTime: string // ISO 8601
  slotEndTime: string // ISO 8601
  committedAt: string // ISO 8601
  
  // Payment references
  vendorPaymentIntentId: string
  requesterPaymentIntentId: string
  vendorCaptureId: string
  requesterCaptureId: string
  
  // Amounts
  vendorAmount: number // Cents
  requesterAmount: number // Cents
  currency: string
  
  // Status
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  cancelledAt?: string // ISO 8601
  cancellationReason?: string
}

// ============================================================================
// PARTNER API CONTRACT
// ============================================================================

/**
 * Partner API request/response types.
 */

export interface GetAvailabilityRequest {
  vendorId: string
  startTime: string // ISO 8601
  endTime: string // ISO 8601
  slotDuration?: number // Minutes
  includeConfidence?: boolean
}

export interface GetAvailabilityResponse {
  vendorId: string
  startTime: string
  endTime: string
  computedAt: string
  computedVersion: string
  slots: AvailabilitySlot[]
  metadata: {
    confidenceThreshold: number
    computationTimeMs: number
  }
}

export interface CreateReservationRequest {
  vendorId: string
  slotStartTime: string // ISO 8601
  slotEndTime: string // ISO 8601
  requesterId: string
  metadata?: Record<string, unknown>
  idempotencyKey?: string
}

export interface CreateReservationResponse {
  reservationId: string
  state: ReservationState
  expiresAt: string
  vendorConfirmationRequired: boolean
  estimatedConfirmationTime: string
  webhookUrl?: string
}

export interface GetReservationResponse {
  reservationId: string
  state: ReservationState
  vendorId: string
  slotStartTime: string
  slotEndTime: string
  requesterId: string
  createdAt: string
  expiresAt: string
  stateHistory: StateTransitionLog[]
  paymentState?: PaymentState
  bookingId?: string
  failureReason?: string
}

/**
 * API error response.
 */
export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
    retryable: boolean
    retryAfter?: number // Seconds
  }
}

/**
 * Webhook event types.
 */
export type WebhookEventType =
  | 'reservation.created'
  | 'reservation.vendor_confirmed'
  | 'reservation.vendor_authorized'
  | 'reservation.authorized_both'
  | 'reservation.committed'
  | 'reservation.failed'
  | 'reservation.expired'
  | 'reservation.cancelled'

export interface WebhookEvent {
  event: WebhookEventType
  reservationId: string
  timestamp: string // ISO 8601
  data: Reservation | PaymentState | { reason: string; code: string }
  signature: string // HMAC signature for verification
}

// ============================================================================
// IDEMPOTENCY & RETRIES
// ============================================================================

/**
 * Idempotency key record.
 */
export interface IdempotencyKey {
  key: string
  operation: string
  reservationId?: string
  result: unknown
  createdAt: string // ISO 8601
  expiresAt: string // ISO 8601 (TTL: 24 hours)
}

/**
 * Retry configuration.
 */
export interface RetryConfig {
  maxAttempts: number // Default: 5
  initialDelayMs: number // Default: 1000
  maxDelayMs: number // Default: 60000
  jitterPercent: number // Default: 20
  backoffMultiplier: number // Default: 2
}

/**
 * Retryable error check.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('ECONNRESET') || 
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')) {
      return true
    }
    
    // HTTP status codes
    if (error.message.includes('500') || 
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504')) {
      return true
    }
  }
  
  return false
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Result type for operations that can fail.
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

/**
 * Async result type.
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>
