import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RollbackOptions {
  bookingId: string
  targetState?: 'quoted' | 'hold_placed' | 'provider_confirmed' | 'receipt_issued'
  reason?: string
  dryRun?: boolean
}

interface RollbackResult {
  success: boolean
  booking_id: string
  from_state: string
  to_state: string
  rollback_time: string
  audit_entries_created: number
  errors?: string[]
}

export class BookingRollbackCLI {
  /**
   * Rollback a booking to a previous state
   */
  static async rollback(options: RollbackOptions): Promise<RollbackResult> {
    const { bookingId, targetState = 'quoted', reason = 'CLI_ROLLBACK', dryRun = false } = options

    try {
      console.log(`🔄 Starting rollback for booking ${bookingId} to state: ${targetState}`)
      if (dryRun) console.log('🧪 DRY RUN MODE - No changes will be made')

      // Get current booking state
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (bookingError || !booking) {
        throw new Error(`Booking not found: ${bookingId}`)
      }

      const fromState = booking.state
      console.log(`📊 Current state: ${fromState}`)

      // Validate rollback is possible
      if (!this.canRollback(fromState, targetState)) {
        throw new Error(`Cannot rollback from ${fromState} to ${targetState}`)
      }

      // Get audit trail
      const { data: auditTrail, error: auditError } = await supabase
        .from('booking_audit_log')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (auditError) {
        throw new Error(`Failed to fetch audit trail: ${auditError.message}`)
      }

      console.log(`📝 Found ${auditTrail?.length || 0} audit entries`)

      if (dryRun) {
        console.log('🧪 DRY RUN: Would rollback to', targetState)
        return {
          success: true,
          booking_id: bookingId,
          from_state: fromState,
          to_state: targetState,
          rollback_time: new Date().toISOString(),
          audit_entries_created: 0
        }
      }

      // Start transaction
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          state: targetState,
          updated_at: new Date().toISOString(),
          // Clear fields based on target state
          ...(targetState === 'quoted' && {
            stripe_payment_intent_id: null,
            confirmed_at: null,
            cancelled_at: null,
            cancelled_reason: null,
            refunded_at: null,
            receipt_url: null
          }),
          ...(targetState === 'hold_placed' && {
            confirmed_at: null,
            cancelled_at: null,
            cancelled_reason: null,
            refunded_at: null,
            receipt_url: null
          }),
          ...(targetState === 'provider_confirmed' && {
            cancelled_at: null,
            cancelled_reason: null,
            refunded_at: null,
            receipt_url: null
          })
        })
        .eq('id', bookingId)

      if (updateError) {
        throw new Error(`Failed to update booking state: ${updateError.message}`)
      }

      // Log the rollback action
      const { error: auditError2 } = await supabase
        .from('booking_audit_log')
        .insert({
          booking_id: bookingId,
          from_state: fromState,
          to_state: targetState,
          action: 'rollback',
          actor_type: 'admin',
          actor_id: 'cli_rollback',
          metadata: {
            reason,
            rollback_time: new Date().toISOString(),
            original_state: fromState,
            target_state: targetState,
            audit_trail_count: auditTrail?.length || 0
          }
        })

      if (auditError2) {
        console.warn(`⚠️ Warning: Failed to log rollback audit entry: ${auditError2.message}`)
      }

      console.log(`✅ Successfully rolled back booking ${bookingId} from ${fromState} to ${targetState}`)

      return {
        success: true,
        booking_id: bookingId,
        from_state: fromState,
        to_state: targetState,
        rollback_time: new Date().toISOString(),
        audit_entries_created: 1
      }

    } catch (error) {
      console.error(`❌ Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      return {
        success: false,
        booking_id: bookingId,
        from_state: 'unknown',
        to_state: targetState,
        rollback_time: new Date().toISOString(),
        audit_entries_created: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Check if rollback is possible between states
   */
  private static canRollback(fromState: string, toState: string): boolean {
    const stateOrder = ['quoted', 'hold_placed', 'provider_confirmed', 'receipt_issued']
    
    const fromIndex = stateOrder.indexOf(fromState)
    const toIndex = stateOrder.indexOf(toState)
    
    if (fromIndex === -1 || toIndex === -1) {
      return false // Invalid states
    }
    
    // Can only rollback to earlier states
    return toIndex <= fromIndex
  }

  /**
   * Get rollback history for a booking
   */
  static async getRollbackHistory(bookingId: string) {
    try {
      const { data: auditEntries, error } = await supabase
        .from('booking_audit_log')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('action', 'rollback')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch rollback history: ${error.message}`)
      }

      return auditEntries || []
    } catch (error) {
      console.error(`Failed to get rollback history: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return []
    }
  }

  /**
   * Validate a booking ID format
   */
  static isValidBookingId(bookingId: string): boolean {
    // UUID v4 format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(bookingId)
  }
}

// CLI interface for direct usage
export async function cliRollback(args: string[]): Promise<void> {
  if (args.length < 1) {
    console.log('Usage: bkctl rollback <booking_id> [target_state] [--reason="reason"] [--dry-run]')
    console.log('Example: bkctl rollback 123e4567-e89b-12d3-a456-426614174000 quoted --reason="Testing rollback"')
    return
  }

  const bookingId = args[0]
  const targetState = (args[1] as 'quoted' | 'hold_placed' | 'provider_confirmed' | 'receipt_issued') || 'quoted'
  const reason = args.find(arg => arg.startsWith('--reason='))?.split('=')[1] || 'CLI_ROLLBACK'
  const dryRun = args.includes('--dry-run')

  if (!BookingRollbackCLI.isValidBookingId(bookingId)) {
    console.error('❌ Invalid booking ID format. Expected UUID v4.')
    return
  }

  console.log(`🚀 Starting rollback operation...`)
  console.log(`📋 Booking ID: ${bookingId}`)
  console.log(`🎯 Target State: ${targetState}`)
  console.log(`📝 Reason: ${reason}`)
  if (dryRun) console.log('🧪 Mode: DRY RUN')

  const startTime = Date.now()
  const result = await BookingRollbackCLI.rollback({
    bookingId,
    targetState,
    reason,
    dryRun
  })

  const duration = Date.now() - startTime

  if (result.success) {
    console.log(`✅ Rollback completed in ${duration}ms`)
    console.log(`📊 Result: ${result.from_state} → ${result.to_state}`)
    console.log(`📝 Audit entries created: ${result.audit_entries_created}`)
  } else {
    console.error(`❌ Rollback failed after ${duration}ms`)
    if (result.errors) {
      result.errors.forEach(error => console.error(`   - ${error}`))
    }
  }
}
