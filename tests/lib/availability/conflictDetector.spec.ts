/**
 * Unit tests for AvailabilityConflictDetector
 * Part of F-009: Slot conflict detection
 */

import { describe, it, expect } from 'vitest';
import { AvailabilityConflictDetector } from '@/lib/availability/conflictDetector';

describe('AvailabilityConflictDetector', () => {
  describe('classifyConflict', () => {
    it('should classify full overlap (exact match)', () => {
      const newSlot = {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      };
      const existingSlot = {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      };

      const result = AvailabilityConflictDetector.classifyConflict(
        newSlot,
        existingSlot
      );

      expect(result).toBe('full_overlap');
    });

    it('should classify contained (new slot inside existing)', () => {
      const newSlot = {
        start: new Date('2026-01-20T10:30:00Z'),
        end: new Date('2026-01-20T10:45:00Z'),
      };
      const existingSlot = {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      };

      const result = AvailabilityConflictDetector.classifyConflict(
        newSlot,
        existingSlot
      );

      expect(result).toBe('contained');
    });

    it('should classify contains (new slot wraps existing)', () => {
      const newSlot = {
        start: new Date('2026-01-20T09:00:00Z'),
        end: new Date('2026-01-20T12:00:00Z'),
      };
      const existingSlot = {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      };

      const result = AvailabilityConflictDetector.classifyConflict(
        newSlot,
        existingSlot
      );

      expect(result).toBe('contains');
    });

    it('should classify partial overlap (start overlap)', () => {
      const newSlot = {
        start: new Date('2026-01-20T09:30:00Z'),
        end: new Date('2026-01-20T10:30:00Z'),
      };
      const existingSlot = {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      };

      const result = AvailabilityConflictDetector.classifyConflict(
        newSlot,
        existingSlot
      );

      expect(result).toBe('partial_overlap');
    });

    it('should classify partial overlap (end overlap)', () => {
      const newSlot = {
        start: new Date('2026-01-20T10:30:00Z'),
        end: new Date('2026-01-20T11:30:00Z'),
      };
      const existingSlot = {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      };

      const result = AvailabilityConflictDetector.classifyConflict(
        newSlot,
        existingSlot
      );

      expect(result).toBe('partial_overlap');
    });

    it('should not classify conflict for non-overlapping slots', () => {
      const newSlot = {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      };
      const existingSlot = {
        start: new Date('2026-01-20T12:00:00Z'),
        end: new Date('2026-01-20T13:00:00Z'),
      };

      const overlap = AvailabilityConflictDetector.calculateOverlap(
        newSlot,
        existingSlot
      );

      expect(overlap).toBeNull();
    });
  });

  describe('calculateOverlap', () => {
    it('should calculate overlap for partially overlapping slots', () => {
      const slot1 = {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      };
      const slot2 = {
        start: new Date('2026-01-20T10:30:00Z'),
        end: new Date('2026-01-20T11:30:00Z'),
      };

      const overlap = AvailabilityConflictDetector.calculateOverlap(slot1, slot2);

      expect(overlap).not.toBeNull();
      expect(overlap?.start).toEqual(new Date('2026-01-20T10:30:00Z'));
      expect(overlap?.end).toEqual(new Date('2026-01-20T11:00:00Z'));
    });

    it('should return null for non-overlapping slots', () => {
      const slot1 = {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      };
      const slot2 = {
        start: new Date('2026-01-20T12:00:00Z'),
        end: new Date('2026-01-20T13:00:00Z'),
      };

      const overlap = AvailabilityConflictDetector.calculateOverlap(slot1, slot2);

      expect(overlap).toBeNull();
    });

    it('should handle adjacent slots (no overlap)', () => {
      const slot1 = {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      };
      const slot2 = {
        start: new Date('2026-01-20T11:00:00Z'),
        end: new Date('2026-01-20T12:00:00Z'),
      };

      const overlap = AvailabilityConflictDetector.calculateOverlap(slot1, slot2);

      expect(overlap).toBeNull();
    });
  });

  describe('validateSlotTimes', () => {
    it('should return null for valid future slot', () => {
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const result = AvailabilityConflictDetector.validateSlotTimes(start, end);

      expect(result).toBeNull();
    });

    it('should return error for start >= end', () => {
      const start = new Date('2026-01-20T11:00:00Z');
      const end = new Date('2026-01-20T10:00:00Z');

      const result = AvailabilityConflictDetector.validateSlotTimes(start, end);

      expect(result).toBe('Start time must be before end time');
    });

    it('should return error for past start time', () => {
      const start = new Date(Date.now() - 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const result = AvailabilityConflictDetector.validateSlotTimes(start, end);

      expect(result).toBe('Start time must be in the future');
    });

    it('should return error for invalid dates', () => {
      const start = new Date('invalid');
      const end = new Date('invalid');

      const result = AvailabilityConflictDetector.validateSlotTimes(start, end);

      expect(result).toBe('Invalid date format');
    });
  });

  describe('detectConflictsFromResults', () => {
    it('should detect and classify conflicts from database results', () => {
      const newSlot = {
        startTime: new Date('2026-01-20T10:00:00Z'),
        endTime: new Date('2026-01-20T11:00:00Z'),
      };

      const conflictingSlots = [
        {
          id: 'slot-1',
          start_time: '2026-01-20T10:30:00Z',
          end_time: '2026-01-20T11:30:00Z',
        },
      ];

      const result = AvailabilityConflictDetector.detectConflictsFromResults(
        newSlot,
        conflictingSlots
      );

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].conflictType).toBe('partial_overlap');
      expect(result.conflicts[0].existingSlotId).toBe('slot-1');
    });

    it('should return no conflicts for empty results', () => {
      const newSlot = {
        startTime: new Date('2026-01-20T10:00:00Z'),
        endTime: new Date('2026-01-20T11:00:00Z'),
      };

      const result = AvailabilityConflictDetector.detectConflictsFromResults(
        newSlot,
        []
      );

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });
  });
});
