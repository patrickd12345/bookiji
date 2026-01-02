/**
 * Integration tests for Vendor Availability API
 * Part of F-009: Slot conflict detection
 * 
 * Tests:
 * - Conflict detection in API
 * - Concurrent slot creation prevention
 * - Error responses
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/vendor/availability/route';
import { getSupabaseMock } from '../../utils/supabase-mocks';

// Mock Supabase
vi.mock('@/lib/supabaseServer', () => ({
  getServerSupabase: () => getSupabaseMock(),
}));

vi.mock('@/lib/availability/atomicSlotOperations', () => ({
  AtomicSlotOperations: {
    createSlotAtomically: vi.fn(),
  },
}));

describe('POST /api/vendor/availability', () => {
  let mockSupabase: ReturnType<typeof getSupabaseMock>;
  let mockCreateSlot: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = getSupabaseMock();
    mockCreateSlot = vi.fn();

    // Setup default mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'vendor-123',
          email: 'vendor@example.com',
        },
      },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'services') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'service-1', provider_id: 'vendor-123' },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'availability_slots') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'slot-1',
                    provider_id: 'vendor-123',
                    start_time: '2026-01-20T10:00:00Z',
                    end_time: '2026-01-20T11:00:00Z',
                    is_available: true,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {} as any;
    });
  });

  it('should create slot successfully when no conflicts', async () => {
    const { AtomicSlotOperations } = await import(
      '@/lib/availability/atomicSlotOperations'
    );

    (AtomicSlotOperations.createSlotAtomically as any).mockResolvedValue({
      success: true,
      slotId: 'slot-1',
    });

    const req = new NextRequest('http://localhost/api/vendor/availability', {
      method: 'POST',
      body: JSON.stringify({
        service_id: 'service-1',
        start_time: '2026-01-20T10:00:00Z',
        end_time: '2026-01-20T11:00:00Z',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.slot_id).toBe('slot-1');
  });

  it('should return 409 with conflicts when overlap detected', async () => {
    const { AtomicSlotOperations } = await import(
      '@/lib/availability/atomicSlotOperations'
    );

    (AtomicSlotOperations.createSlotAtomically as any).mockResolvedValue({
      success: false,
      error: 'Conflicts detected',
      errorCode: 'CONFLICT_DETECTED',
      conflicts: [
        {
          slotId: 'new',
          existingSlotId: 'slot-2',
          conflictType: 'partial_overlap',
          overlapStart: new Date('2026-01-20T10:30:00Z'),
          overlapEnd: new Date('2026-01-20T11:00:00Z'),
          existingSlot: {
            id: 'slot-2',
            startTime: new Date('2026-01-20T10:30:00Z'),
            endTime: new Date('2026-01-20T11:30:00Z'),
          },
        },
      ],
    });

    const req = new NextRequest('http://localhost/api/vendor/availability', {
      method: 'POST',
      body: JSON.stringify({
        service_id: 'service-1',
        start_time: '2026-01-20T10:00:00Z',
        end_time: '2026-01-20T11:00:00Z',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.success).toBe(false);
    expect(data.error).toBe('CONFLICT_DETECTED');
    expect(data.conflicts).toHaveLength(1);
    expect(data.conflicts[0].slot_id).toBe('slot-2');
    expect(data.conflicts[0].conflict_type).toBe('partial_overlap');
    expect(data.resolution_options).toContain('keep_existing');
  });

  it('should return 401 when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated', status: 401 },
    });

    const req = new NextRequest('http://localhost/api/vendor/availability', {
      method: 'POST',
      body: JSON.stringify({
        service_id: 'service-1',
        start_time: '2026-01-20T10:00:00Z',
        end_time: '2026-01-20T11:00:00Z',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('UNAUTHORIZED');
  });

  it('should return 400 for missing required fields', async () => {
    const req = new NextRequest('http://localhost/api/vendor/availability', {
      method: 'POST',
      body: JSON.stringify({
        service_id: 'service-1',
        // Missing start_time and end_time
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('VALIDATION_ERROR');
  });

  it('should return 403 when vendor does not own service', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'services') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'service-1', provider_id: 'other-vendor' },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {} as any;
    });

    const req = new NextRequest('http://localhost/api/vendor/availability', {
      method: 'POST',
      body: JSON.stringify({
        service_id: 'service-1',
        start_time: '2026-01-20T10:00:00Z',
        end_time: '2026-01-20T11:00:00Z',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('FORBIDDEN');
  });
});
