/**
 * Availability Conflict Detector
 * 
 * Pure conflict detection logic for availability slots.
 * Part of F-009: Slot conflict detection
 * 
 * This module provides:
 * - Conflict detection algorithm
 * - Conflict type classification
 * - Pure functions (no side effects)
 */

import type { ConflictType, SlotConflict, ConflictDetectionResult } from './types';

export class AvailabilityConflictDetector {
  /**
   * Classify conflict type between two time ranges
   * 
   * @param newSlot - The new slot being created
   * @param existingSlot - The existing slot that conflicts
   * @returns The type of conflict
   */
  static classifyConflict(
    newSlot: { start: Date; end: Date },
    existingSlot: { start: Date; end: Date }
  ): ConflictType {
    const newStart = newSlot.start.getTime();
    const newEnd = newSlot.end.getTime();
    const existingStart = existingSlot.start.getTime();
    const existingEnd = existingSlot.end.getTime();

    // Exact match (same start and end)
    if (newStart === existingStart && newEnd === existingEnd) {
      return 'full_overlap';
    }

    // New slot is completely contained within existing slot
    if (newStart >= existingStart && newEnd <= existingEnd) {
      return 'contained';
    }

    // New slot completely contains existing slot
    if (existingStart >= newStart && existingEnd <= newEnd) {
      return 'contains';
    }

    // Partial overlap (any other case where they overlap)
    // Overlap condition: newStart < existingEnd && newEnd > existingStart
    if (newStart < existingEnd && newEnd > existingStart) {
      return 'partial_overlap';
    }

    // This should never happen if called correctly (only when there's an overlap)
    return 'partial_overlap';
  }

  /**
   * Calculate overlap time range between two slots
   * 
   * @param slot1 - First slot
   * @param slot2 - Second slot
   * @returns Overlap start and end times, or null if no overlap
   */
  static calculateOverlap(
    slot1: { start: Date; end: Date },
    slot2: { start: Date; end: Date }
  ): { start: Date; end: Date } | null {
    const start1 = slot1.start.getTime();
    const end1 = slot1.end.getTime();
    const start2 = slot2.start.getTime();
    const end2 = slot2.end.getTime();

    // Check if they overlap
    if (start1 >= end2 || start2 >= end1) {
      return null; // No overlap
    }

    // Calculate overlap
    const overlapStart = new Date(Math.max(start1, start2));
    const overlapEnd = new Date(Math.min(end1, end2));

    return { start: overlapStart, end: overlapEnd };
  }

  /**
   * Detect conflicts from database query results
   * 
   * This is a pure function that processes database results into conflict objects.
   * The actual database query is done elsewhere.
   * 
   * @param newSlot - The slot being created
   * @param conflictingSlots - Array of conflicting slots from database
   * @returns Conflict detection result
   */
  static detectConflictsFromResults(
    newSlot: { startTime: Date; endTime: Date },
    conflictingSlots: Array<{
      id: string;
      start_time: string | Date;
      end_time: string | Date;
    }>
  ): ConflictDetectionResult {
    const conflicts: SlotConflict[] = [];

    for (const existingSlot of conflictingSlots) {
      const existingStart = existingSlot.start_time instanceof Date
        ? existingSlot.start_time
        : new Date(existingSlot.start_time);
      const existingEnd = existingSlot.end_time instanceof Date
        ? existingSlot.end_time
        : new Date(existingSlot.end_time);

      const conflictType = this.classifyConflict(
        { start: newSlot.startTime, end: newSlot.endTime },
        { start: existingStart, end: existingEnd }
      );

      const overlap = this.calculateOverlap(
        { start: newSlot.startTime, end: newSlot.endTime },
        { start: existingStart, end: existingEnd }
      );

      if (overlap) {
        conflicts.push({
          slotId: 'new', // Placeholder, will be set by caller
          existingSlotId: existingSlot.id,
          conflictType,
          overlapStart: overlap.start,
          overlapEnd: overlap.end,
          existingSlot: {
            id: existingSlot.id,
            startTime: existingStart,
            endTime: existingEnd,
          },
        });
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Validate slot time range
   * 
   * @param startTime - Slot start time
   * @param endTime - Slot end time
   * @returns Error message if invalid, null if valid
   */
  static validateSlotTimes(startTime: Date, endTime: Date): string | null {
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return 'Invalid date format';
    }

    if (startTime >= endTime) {
      return 'Start time must be before end time';
    }

    if (startTime <= new Date()) {
      return 'Start time must be in the future';
    }

    return null;
  }
}
