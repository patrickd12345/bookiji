
import { describe, it, expect } from 'vitest';
import { AvailabilityConflictDetector } from '../../../src/lib/availability/conflictDetector';

describe('AvailabilityConflictDetector', () => {
  describe('classifyConflict', () => {
    it('should identify full_overlap', () => {
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T11:00:00Z');
      const conflict = AvailabilityConflictDetector.classifyConflict(
        { start, end },
        { start, end }
      );
      expect(conflict).toBe('full_overlap');
    });

    it('should identify contained (new inside existing)', () => {
      const newStart = new Date('2025-01-01T10:15:00Z');
      const newEnd = new Date('2025-01-01T10:45:00Z');
      const existStart = new Date('2025-01-01T10:00:00Z');
      const existEnd = new Date('2025-01-01T11:00:00Z');

      const conflict = AvailabilityConflictDetector.classifyConflict(
        { start: newStart, end: newEnd },
        { start: existStart, end: existEnd }
      );
      expect(conflict).toBe('contained');
    });

    it('should identify contains (existing inside new)', () => {
      const newStart = new Date('2025-01-01T10:00:00Z');
      const newEnd = new Date('2025-01-01T11:00:00Z');
      const existStart = new Date('2025-01-01T10:15:00Z');
      const existEnd = new Date('2025-01-01T10:45:00Z');

      const conflict = AvailabilityConflictDetector.classifyConflict(
        { start: newStart, end: newEnd },
        { start: existStart, end: existEnd }
      );
      expect(conflict).toBe('contains');
    });

    it('should identify partial_overlap (new starts before existing)', () => {
      // New: 10:00 - 11:00
      // Exist: 10:30 - 11:30
      const newStart = new Date('2025-01-01T10:00:00Z');
      const newEnd = new Date('2025-01-01T11:00:00Z');
      const existStart = new Date('2025-01-01T10:30:00Z');
      const existEnd = new Date('2025-01-01T11:30:00Z');

      const conflict = AvailabilityConflictDetector.classifyConflict(
        { start: newStart, end: newEnd },
        { start: existStart, end: existEnd }
      );
      expect(conflict).toBe('partial_overlap');
    });

    it('should identify partial_overlap (new ends after existing)', () => {
      // New: 10:30 - 11:30
      // Exist: 10:00 - 11:00
      const newStart = new Date('2025-01-01T10:30:00Z');
      const newEnd = new Date('2025-01-01T11:30:00Z');
      const existStart = new Date('2025-01-01T10:00:00Z');
      const existEnd = new Date('2025-01-01T11:00:00Z');

      const conflict = AvailabilityConflictDetector.classifyConflict(
        { start: newStart, end: newEnd },
        { start: existStart, end: existEnd }
      );
      expect(conflict).toBe('partial_overlap');
    });
  });

  describe('calculateOverlap', () => {
    it('should return correct overlap range', () => {
      // New: 10:00 - 11:00
      // Exist: 10:30 - 11:30
      // Overlap: 10:30 - 11:00
      const newStart = new Date('2025-01-01T10:00:00Z');
      const newEnd = new Date('2025-01-01T11:00:00Z');
      const existStart = new Date('2025-01-01T10:30:00Z');
      const existEnd = new Date('2025-01-01T11:30:00Z');

      const result = AvailabilityConflictDetector.calculateOverlap(
        { start: newStart, end: newEnd },
        { start: existStart, end: existEnd }
      );

      expect(result).not.toBeNull();
      expect(result?.start.getTime()).toBe(existStart.getTime());
      expect(result?.end.getTime()).toBe(newEnd.getTime());
    });

    it('should return null for adjacent slots (no overlap)', () => {
      // New: 10:00 - 11:00
      // Exist: 11:00 - 12:00
      const newStart = new Date('2025-01-01T10:00:00Z');
      const newEnd = new Date('2025-01-01T11:00:00Z');
      const existStart = new Date('2025-01-01T11:00:00Z');
      const existEnd = new Date('2025-01-01T12:00:00Z');

      const result = AvailabilityConflictDetector.calculateOverlap(
        { start: newStart, end: newEnd },
        { start: existStart, end: existEnd }
      );

      expect(result).toBeNull();
    });
  });

  describe('validateSlotTimes', () => {
    it('should return null for valid times', () => {
        // Future date
        const start = new Date(Date.now() + 100000);
        const end = new Date(Date.now() + 200000);
        expect(AvailabilityConflictDetector.validateSlotTimes(start, end)).toBeNull();
    });

    it('should reject start time >= end time', () => {
        const start = new Date(Date.now() + 200000);
        const end = new Date(Date.now() + 100000);
        expect(AvailabilityConflictDetector.validateSlotTimes(start, end)).toBe('Start time must be before end time');
    });

    it('should reject past start time', () => {
        const start = new Date(Date.now() - 100000);
        const end = new Date(Date.now() + 100000);
        expect(AvailabilityConflictDetector.validateSlotTimes(start, end)).toBe('Start time must be in the future');
    });
  });
});
