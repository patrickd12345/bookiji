
import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST } from '../../../src/app/api/vendor/availability/route';
import { NextRequest } from 'next/server';
import { AtomicSlotOperations } from '../../../src/lib/availability/atomicSlotOperations';

// Mock AtomicSlotOperations
vi.mock('@/lib/availability/atomicSlotOperations', () => ({
  AtomicSlotOperations: {
    createSlotAtomically: vi.fn(),
  },
}));

// Mock Supabase Auth and Service Check
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
};

mockFrom.mockReturnValue({
  select: mockSelect,
});
mockSelect.mockReturnValue({
  eq: mockEq,
});
mockEq.mockReturnValue({
  single: mockSingle,
  eq: mockEq, // Chain
});

vi.mock('@/lib/supabaseServer', () => ({
  getServerSupabase: () => mockSupabase,
}));

describe('POST /api/vendor/availability', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const validBody = {
    service_id: 'service-123',
    start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    end_time: new Date(Date.now() + 90000000).toISOString(),
  };

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/vendor/availability', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('should return 401 if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: 'Auth error' });

    const res = await POST(createRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('UNAUTHORIZED');
  });

  it('should return 403 if user does not own service', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    // Service owned by different user
    mockSingle.mockResolvedValue({ data: { provider_id: 'user-2' }, error: null });

    const res = await POST(createRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('FORBIDDEN');
  });

  it('should return 409 if conflicts detected', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockSingle.mockResolvedValue({ data: { provider_id: 'user-1' }, error: null }); // Owns service

    const conflictMock = {
      success: false,
      errorCode: 'CONFLICT_DETECTED',
      conflicts: [
        {
            existingSlotId: 'slot-99',
            existingSlot: {
                startTime: new Date(),
                endTime: new Date()
            },
            conflictType: 'full_overlap',
            overlapStart: new Date(),
            overlapEnd: new Date()
        }
      ]
    };

    // @ts-ignore
    AtomicSlotOperations.createSlotAtomically.mockResolvedValue(conflictMock);

    const res = await POST(createRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('CONFLICT_DETECTED');
    expect(data.conflicts).toHaveLength(1);
  });

  it('should return 201 on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockSingle.mockResolvedValue({ data: { provider_id: 'user-1' }, error: null }); // Owns service

    // @ts-ignore
    AtomicSlotOperations.createSlotAtomically.mockResolvedValue({
      success: true,
      slotId: 'new-slot-123'
    });

    // Mock fetch of created slot
    mockSingle.mockResolvedValueOnce({ data: { provider_id: 'user-1' }, error: null }) // Service check
              .mockResolvedValueOnce({ data: { id: 'new-slot-123', status: 'available' }, error: null }); // Slot fetch

    const res = await POST(createRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.slot_id).toBe('new-slot-123');
  });

  it('should validate date formats', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const invalidBody = {
        ...validBody,
        start_time: 'not-a-date'
    };

    const res = await POST(createRequest(invalidBody));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('VALIDATION_ERROR');
  });
});
