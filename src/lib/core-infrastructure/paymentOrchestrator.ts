/**
 * Payment Orchestrator
 * 
 * Handles dual authorization and atomic capture for reservations.
 * 
 * Flow:
 * 1. Vendor authorization (deposit)
 * 2. Requester authorization (service payment)
 * 3. Atomic commit (capture both)
 * 4. Compensation on failure
 */

import Stripe from 'stripe'
import type {
  Reservation,
  PaymentState,
  PaymentOperationResult,
  CompensationResult,
  CompensationAction,
} from '@/types/core-infrastructure'

export interface PaymentOrchestratorConfig {
  stripe: Stripe
  stripeConnectAccountId: string // Vendor's Stripe Connect account
  vendorDepositAmount: number // Cents
  requesterAmount: number // Cents
  currency: string
}

export class PaymentOrchestrator {
  constructor(private config: PaymentOrchestratorConfig) {}

  /**
   * Create vendor payment intent (authorization only).
   */
  async authorizeVendor(
    reservation: Reservation,
    attempt: number = 1
  ): Promise<PaymentOperationResult> {
    const idempotencyKey = `vendor-auth-${reservation.id}-${attempt}`
    
    try {
      const paymentIntent = await this.config.stripe.paymentIntents.create(
        {
          amount: this.config.vendorDepositAmount,
          currency: this.config.currency,
          capture_method: 'manual', // Authorization only
          payment_method_types: ['card'],
          metadata: {
            reservation_id: reservation.id,
            partner_id: reservation.partnerId,
            vendor_id: reservation.vendorId,
            attempt: attempt.toString(),
          },
          on_behalf_of: this.config.stripeConnectAccountId,
          transfer_data: {
            destination: this.config.stripeConnectAccountId,
          },
        },
        {
          idempotencyKey,
        }
      )
      
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        retryable: false,
      }
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError
      return {
        success: false,
        error: stripeError.message,
        errorCode: stripeError.code,
        retryable: this.isRetryableStripeError(stripeError),
      }
    }
  }

  /**
   * Create requester payment intent (authorization only).
   */
  async authorizeRequester(
    reservation: Reservation,
    attempt: number = 1
  ): Promise<PaymentOperationResult> {
    const idempotencyKey = `requester-auth-${reservation.id}-${attempt}`
    
    try {
      const paymentIntent = await this.config.stripe.paymentIntents.create(
        {
          amount: this.config.requesterAmount,
          currency: this.config.currency,
          capture_method: 'manual', // Authorization only
          payment_method_types: ['card'],
          metadata: {
            reservation_id: reservation.id,
            partner_id: reservation.partnerId,
            requester_id: reservation.requesterId,
            attempt: attempt.toString(),
          },
        },
        {
          idempotencyKey,
        }
      )
      
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        retryable: false,
      }
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError
      return {
        success: false,
        error: stripeError.message,
        errorCode: stripeError.code,
        retryable: this.isRetryableStripeError(stripeError),
      }
    }
  }

  /**
   * Capture vendor authorization.
   */
  async captureVendor(
    paymentIntentId: string,
    reservation: Reservation,
    attempt: number = 1
  ): Promise<PaymentOperationResult> {
    const idempotencyKey = `vendor-capture-${reservation.id}-${attempt}`
    
    try {
      const paymentIntent = await this.config.stripe.paymentIntents.capture(
        paymentIntentId,
        {
          metadata: {
            reservation_id: reservation.id,
            booking_id: reservation.bookingId || '',
            attempt: attempt.toString(),
          },
        },
        {
          idempotencyKey,
        }
      )
      
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        retryable: false,
      }
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError
      return {
        success: false,
        error: stripeError.message,
        errorCode: stripeError.code,
        retryable: this.isRetryableStripeError(stripeError),
      }
    }
  }

  /**
   * Capture requester authorization.
   */
  async captureRequester(
    paymentIntentId: string,
    reservation: Reservation,
    attempt: number = 1
  ): Promise<PaymentOperationResult> {
    const idempotencyKey = `requester-capture-${reservation.id}-${attempt}`
    
    try {
      const paymentIntent = await this.config.stripe.paymentIntents.capture(
        paymentIntentId,
        {
          metadata: {
            reservation_id: reservation.id,
            booking_id: reservation.bookingId || '',
            attempt: attempt.toString(),
          },
        },
        {
          idempotencyKey,
        }
      )
      
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        retryable: false,
      }
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError
      return {
        success: false,
        error: stripeError.message,
        errorCode: stripeError.code,
        retryable: this.isRetryableStripeError(stripeError),
      }
    }
  }

  /**
   * Atomic commit: Capture both authorizations.
   * 
   * If either capture fails, execute compensation.
   */
  async atomicCommit(
    reservation: Reservation
  ): Promise<{
    success: boolean
    vendorCaptureId?: string
    requesterCaptureId?: string
    compensation?: CompensationResult
  }> {
    if (!reservation.paymentState?.vendorPaymentIntentId) {
      return {
        success: false,
        compensation: {
          success: false,
          actions: [],
          errors: ['Vendor payment intent not found'],
        },
      }
    }
    
    if (!reservation.paymentState?.requesterPaymentIntentId) {
      return {
        success: false,
        compensation: {
          success: false,
          actions: [],
          errors: ['Requester payment intent not found'],
        },
      }
    }
    
    // Capture vendor authorization
    const vendorResult = await this.captureVendor(
      reservation.paymentState.vendorPaymentIntentId,
      reservation,
      (reservation.paymentState.vendorCaptureAttempts || 0) + 1
    )
    
    // Capture requester authorization
    const requesterResult = await this.captureRequester(
      reservation.paymentState.requesterPaymentIntentId,
      reservation,
      (reservation.paymentState.requesterCaptureAttempts || 0) + 1
    )
    
    // Both succeeded
    if (vendorResult.success && requesterResult.success) {
      return {
        success: true,
        vendorCaptureId: vendorResult.paymentIntentId,
        requesterCaptureId: requesterResult.paymentIntentId,
      }
    }
    
    // One or both failed - execute compensation
    const compensation = await this.compensate(
      reservation,
      vendorResult.success,
      requesterResult.success
    )
    
    return {
      success: false,
      compensation,
    }
  }

  /**
   * Compensation logic: Reverse captures if needed.
   */
  async compensate(
    reservation: Reservation,
    vendorSucceeded: boolean,
    requesterSucceeded: boolean
  ): Promise<CompensationResult> {
    const actions: CompensationAction[] = []
    const errors: string[] = []
    
    // If vendor capture succeeded but requester failed, cancel vendor capture
    if (vendorSucceeded && reservation.paymentState?.vendorPaymentIntentId) {
      try {
        await this.config.stripe.paymentIntents.cancel(
          reservation.paymentState.vendorPaymentIntentId
        )
        actions.push({
          type: 'cancel_capture',
          paymentIntentId: reservation.paymentState.vendorPaymentIntentId,
          amount: reservation.paymentState.vendorAmount,
          result: 'success',
        })
      } catch (error) {
        const stripeError = error as Stripe.errors.StripeError
        actions.push({
          type: 'cancel_capture',
          paymentIntentId: reservation.paymentState!.vendorPaymentIntentId!,
          amount: reservation.paymentState!.vendorAmount,
          result: 'failed',
          error: stripeError.message,
        })
        errors.push(`Failed to cancel vendor capture: ${stripeError.message}`)
      }
    }
    
    // If requester capture succeeded but vendor failed, cancel requester capture
    if (requesterSucceeded && reservation.paymentState?.requesterPaymentIntentId) {
      try {
        await this.config.stripe.paymentIntents.cancel(
          reservation.paymentState.requesterPaymentIntentId
        )
        actions.push({
          type: 'cancel_capture',
          paymentIntentId: reservation.paymentState.requesterPaymentIntentId,
          amount: reservation.paymentState.requesterAmount,
          result: 'success',
        })
      } catch (error) {
        const stripeError = error as Stripe.errors.StripeError
        actions.push({
          type: 'cancel_capture',
          paymentIntentId: reservation.paymentState!.requesterPaymentIntentId!,
          amount: reservation.paymentState!.requesterAmount,
          result: 'failed',
          error: stripeError.message,
        })
        errors.push(`Failed to cancel requester capture: ${stripeError.message}`)
      }
    }
    
    // Release authorizations if not captured
    if (!vendorSucceeded && reservation.paymentState?.vendorPaymentIntentId) {
      try {
        await this.config.stripe.paymentIntents.cancel(
          reservation.paymentState.vendorPaymentIntentId
        )
        actions.push({
          type: 'release_auth',
          paymentIntentId: reservation.paymentState.vendorPaymentIntentId,
          result: 'success',
        })
      } catch (error) {
        const stripeError = error as Stripe.errors.StripeError
        actions.push({
          type: 'release_auth',
          paymentIntentId: reservation.paymentState!.vendorPaymentIntentId!,
          result: 'failed',
          error: stripeError.message,
        })
        errors.push(`Failed to release vendor auth: ${stripeError.message}`)
      }
    }
    
    if (!requesterSucceeded && reservation.paymentState?.requesterPaymentIntentId) {
      try {
        await this.config.stripe.paymentIntents.cancel(
          reservation.paymentState.requesterPaymentIntentId
        )
        actions.push({
          type: 'release_auth',
          paymentIntentId: reservation.paymentState.requesterPaymentIntentId,
          result: 'success',
        })
      } catch (error) {
        const stripeError = error as Stripe.errors.StripeError
        actions.push({
          type: 'release_auth',
          paymentIntentId: reservation.paymentState!.requesterPaymentIntentId!,
          result: 'failed',
          error: stripeError.message,
        })
        errors.push(`Failed to release requester auth: ${stripeError.message}`)
      }
    }
    
    return {
      success: errors.length === 0,
      actions,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * Check if Stripe error is retryable.
   */
  private isRetryableStripeError(error: Stripe.errors.StripeError): boolean {
    // Network errors
    if (error.type === 'StripeConnectionError') {
      return true
    }
    
    // Rate limit errors
    if (error.type === 'StripeRateLimitError') {
      return true
    }
    
    // API errors (may be transient)
    if (error.type === 'StripeAPIError') {
      const statusCode = (error as Stripe.errors.StripeAPIError).statusCode
      return statusCode === 500 || statusCode === 502 || statusCode === 503 || statusCode === 504
    }
    
    return false
  }
}
