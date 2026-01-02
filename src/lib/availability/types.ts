/**
 * Types for availability slot conflict detection
 * Part of F-009: Slot conflict detection
 */

export type ConflictType = 
  | 'full_overlap' 
  | 'partial_overlap' 
  | 'contained' 
  | 'contains';

export interface SlotConflict {
  slotId: string;
  existingSlotId: string;
  conflictType: ConflictType;
  overlapStart: Date;
  overlapEnd: Date;
  existingSlot: {
    id: string;
    startTime: Date;
    endTime: Date;
  };
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: SlotConflict[];
}

export interface CreateSlotRequest {
  providerId: string;
  serviceId: string;
  startTime: Date;
  endTime: Date;
  recurrenceRule?: Record<string, unknown>;
}

export interface CreateSlotResult {
  success: boolean;
  slotId?: string;
  error?: string;
  errorCode?: 'CONFLICT_DETECTED' | 'DATABASE_ERROR' | 'VALIDATION_ERROR';
  conflicts?: SlotConflict[];
}
