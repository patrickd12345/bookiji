/**
 * Atomic Slot Operations
 * 
 * Database operations for creating/updating availability slots atomically.
 * Part of F-009: Slot conflict detection
 * 
 * This module provides:
 * - Atomic slot creation with conflict detection
 * - Integration with database functions
 * - Error handling and result formatting
 */

import { getServerSupabase } from '@/lib/supabaseServer';
import type { CreateSlotRequest, CreateSlotResult, SlotConflict } from './types';
import { AvailabilityConflictDetector } from './conflictDetector';

export class AtomicSlotOperations {
  /**
   * Create a slot atomically with conflict detection
   * 
   * Uses the database function `create_slot_atomically` which:
   * 1. Checks for conflicts
   * 2. Creates the slot if no conflicts
   * 3. Returns conflicts if any exist
   * 
   * @param request - Slot creation request
   * @returns Result with success status, slot ID, or conflicts
   */
  static async createSlotAtomically(
    request: CreateSlotRequest
  ): Promise<CreateSlotResult> {
    const supabase = getServerSupabase();

    // Validate times
    const validationError = AvailabilityConflictDetector.validateSlotTimes(
      request.startTime,
      request.endTime
    );
    if (validationError) {
      return {
        success: false,
        error: validationError,
        errorCode: 'VALIDATION_ERROR',
      };
    }

    try {
      // Call database function
      const { data, error } = await supabase.rpc('create_slot_atomically', {
        p_provider_id: request.providerId,
        p_service_id: request.serviceId,
        p_start_time: request.startTime.toISOString(),
        p_end_time: request.endTime.toISOString(),
        p_recurrence_rule: request.recurrenceRule || null,
      });

      if (error) {
        // Check if it's a constraint violation
        if (error.code === '23P01' || error.message.includes('exclusion')) {
          // Exclusion constraint violation - try to get conflict details
          return await this.handleConstraintViolation(request);
        }

        return {
          success: false,
          error: error.message,
          errorCode: 'DATABASE_ERROR',
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'No result from database function',
          errorCode: 'DATABASE_ERROR',
        };
      }

      const result = data[0];

      if (!result.success) {
        // Conflicts detected
        const conflicts = await this.formatConflicts(
          request,
          result.conflicts || []
        );

        return {
          success: false,
          error: result.error_message || 'Conflicts detected',
          errorCode: 'CONFLICT_DETECTED',
          conflicts,
        };
      }

      return {
        success: true,
        slotId: result.slot_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'DATABASE_ERROR',
      };
    }
  }

  /**
   * Handle constraint violation by querying for conflicts
   * 
   * This is a fallback if the database function doesn't return conflict details
   */
  private static async handleConstraintViolation(
    request: CreateSlotRequest
  ): Promise<CreateSlotResult> {
    const supabase = getServerSupabase();

    // Query for overlapping slots
    const { data: conflicts, error } = await supabase
      .from('availability_slots')
      .select('id, start_time, end_time')
      .eq('provider_id', request.providerId)
      .eq('is_available', true)
      .filter('start_time', 'lt', request.endTime.toISOString())
      .filter('end_time', 'gt', request.startTime.toISOString());

    if (error) {
      return {
        success: false,
        error: `Constraint violation: ${error.message}`,
        errorCode: 'DATABASE_ERROR',
      };
    }

    const formattedConflicts = await this.formatConflicts(
      request,
      conflicts || []
    );

    return {
      success: false,
      error: 'Slot overlap detected by database constraint',
      errorCode: 'CONFLICT_DETECTED',
      conflicts: formattedConflicts,
    };
  }

  /**
   * Format conflicts from database results
   */
  private static async formatConflicts(
    request: CreateSlotRequest,
    conflicts: Array<{
      slot_id?: string;
      id?: string;
      start_time: string | Date;
      end_time: string | Date;
    }>
  ): Promise<SlotConflict[]> {
    const formatted: SlotConflict[] = [];

    for (const conflict of conflicts) {
      const existingStart = conflict.start_time instanceof Date
        ? conflict.start_time
        : new Date(conflict.start_time);
      const existingEnd = conflict.end_time instanceof Date
        ? conflict.end_time
        : new Date(conflict.end_time);

      const conflictType = AvailabilityConflictDetector.classifyConflict(
        { start: request.startTime, end: request.endTime },
        { start: existingStart, end: existingEnd }
      );

      const overlap = AvailabilityConflictDetector.calculateOverlap(
        { start: request.startTime, end: request.endTime },
        { start: existingStart, end: existingEnd }
      );

      if (overlap) {
        formatted.push({
          slotId: 'new',
          existingSlotId: conflict.slot_id || conflict.id || 'unknown',
          conflictType,
          overlapStart: overlap.start,
          overlapEnd: overlap.end,
          existingSlot: {
            id: conflict.slot_id || conflict.id || 'unknown',
            startTime: existingStart,
            endTime: existingEnd,
          },
        });
      }
    }

    return formatted;
  }
}
