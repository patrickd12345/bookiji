
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AtomicSlotOperations } from '../../../src/lib/availability/atomicSlotOperations';
import { AvailabilityConflictDetector } from '../../../src/lib/availability/conflictDetector';

// Mock getServerSupabase
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockFilter = vi.fn();
const mockSingle = vi.fn();

const mockSupabase = {
  rpc: mockRpc,
  from: mockFrom,
};

mockFrom.mockReturnValue({
  select: mockSelect,
});
mockSelect.mockReturnValue({
  eq: mockEq,
});
mockEq.mockReturnValue({
  eq: mockEq, // Chaining for provider_id
  filter: mockFilter,
});
mockFilter.mockReturnValue({
  filter: mockFilter, // Chaining
});

vi.mock('@/lib/supabaseServer', () => ({
  getServerSupabase: () => mockSupabase,
}));

describe('AtomicSlotOperations', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSlotAtomically', () => {
    it('should validate times before calling DB', async () => {
      const request = {
        providerId: 'provider1',
        serviceId: 'service1',
        startTime: new Date(Date.now() - 10000), // Past
        endTime: new Date(Date.now() + 10000),
      };

      const result = await AtomicSlotOperations.createSlotAtomically(request);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('should return success when DB returns success', async () => {
      mockRpc.mockResolvedValue({
        data: [{ success: true, slot_id: 'slot123' }],
        error: null,
      });

      const request = {
        providerId: 'provider1',
        serviceId: 'service1',
        startTime: new Date(Date.now() + 10000),
        endTime: new Date(Date.now() + 20000),
      };

      const result = await AtomicSlotOperations.createSlotAtomically(request);

      expect(result.success).toBe(true);
      expect(result.slotId).toBe('slot123');
      expect(mockRpc).toHaveBeenCalledWith('create_slot_atomically', expect.any(Object));
    });

    it('should return conflicts when DB returns conflicts', async () => {
      const conflictStart = new Date(Date.now() + 10000);
      const conflictEnd = new Date(Date.now() + 20000);

      mockRpc.mockResolvedValue({
        data: [{
          success: false,
          error_message: 'Conflict',
          conflicts: [{
            id: 'existing1',
            start_time: conflictStart.toISOString(),
            end_time: conflictEnd.toISOString(),
          }]
        }],
        error: null,
      });

      const request = {
        providerId: 'provider1',
        serviceId: 'service1',
        startTime: conflictStart,
        endTime: conflictEnd,
      };

      const result = await AtomicSlotOperations.createSlotAtomically(request);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CONFLICT_DETECTED');
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts?.[0].existingSlotId).toBe('existing1');
    });

    it('should handle exclusion constraint violation', async () => {
        // First RPC call fails with constraint violation
        mockRpc.mockResolvedValue({
            data: null,
            error: { code: '23P01', message: 'exclusion constraint' }
        });

        // Fallback query for conflicts
        const conflictStart = new Date(Date.now() + 10000);
        const conflictEnd = new Date(Date.now() + 20000);

        // Setup mock chain for conflict query
        const mockFilterLt = vi.fn().mockReturnValue({
             filter: vi.fn().mockResolvedValue({
                data: [{
                    id: 'existing_constraint',
                    start_time: conflictStart.toISOString(),
                    end_time: conflictEnd.toISOString()
                }],
                error: null
             })
        });

        const mockFilterGt = vi.fn().mockReturnValue({
            filter: mockFilterLt // Reuse or mock proper chain
        });

        // Re-mock implementation for this specific test to handle the chain
        mockFrom.mockReturnValue({
            select: () => ({
                eq: () => ({
                    eq: () => ({
                        filter: () => ({ // lt
                            filter: () => ({ // gt
                                // Return the promise directly here as supabase would
                                then: (resolve: any) => resolve({
                                    data: [{
                                        id: 'existing_constraint',
                                        start_time: conflictStart.toISOString(),
                                        end_time: conflictEnd.toISOString()
                                    }],
                                    error: null
                                })
                            })
                        })
                    })
                })
            })
        });

        const request = {
            providerId: 'provider1',
            serviceId: 'service1',
            startTime: conflictStart,
            endTime: conflictEnd,
        };

        const result = await AtomicSlotOperations.createSlotAtomically(request);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('CONFLICT_DETECTED');
        expect(result.conflicts?.[0].existingSlotId).toBe('existing_constraint');
    });

    it('should handle general database errors', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Some DB Error', code: '50000' },
      });

      const request = {
        providerId: 'provider1',
        serviceId: 'service1',
        startTime: new Date(Date.now() + 10000),
        endTime: new Date(Date.now() + 20000),
      };

      const result = await AtomicSlotOperations.createSlotAtomically(request);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('DATABASE_ERROR');
    });
  });
});
