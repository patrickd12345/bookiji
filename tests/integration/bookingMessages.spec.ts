import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/bookings/[id]/messages/route';
import { NextRequest } from 'next/server';

// Mock the Supabase auth helpers
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn()
}));

// Mock the cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({}))
}));

// In-memory stores for mocking Supabase
const bookings = [{ id: 'b1', customer_id: 'c1', provider_id: 'p1' }];
const messages: any[] = [];

// Mock the Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn((table: string) => {
    if (table === 'bookings') {
      return {
        select: () => ({
          eq: (field: string, value: string) => ({
            single: async () => ({ data: bookings.find(b => b.id === value), error: null }),
          }),
        }),
      };
    }
    if (table === 'booking_messages') {
      return {
        select: () => ({
          eq: (_: string, bookingId: string) => ({
            order: () => ({
              limit: async () => ({ data: messages.filter(m => m.booking_id === bookingId), error: null }),
            }),
          }),
        }),
        insert: (payload: any) => ({
          select: () => ({
            single: async () => {
              const msg = { id: `m${messages.length + 1}`, created_at: new Date().toISOString(), ...payload };
              messages.push(msg);
              return { data: msg, error: null };
            },
          }),
        }),
      };
    }
    return {};
  }),
};

// Set up the mock to return our client
const { createRouteHandlerClient } = await import('@supabase/auth-helpers-nextjs');
vi.mocked(createRouteHandlerClient).mockReturnValue(mockSupabaseClient as any);

const BASE = 'http://localhost:3000';

describe('booking messages API', () => {
  beforeEach(() => {
    messages.length = 0;
    vi.clearAllMocks();
  });

  it('allows participants to post and read messages', async () => {
    // Mock authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'c1' } },
      error: null
    });

    const postReq = new NextRequest(
      new Request(`${BASE}/api/bookings/b1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: 'hello' }),
      })
    );
    const postRes = await POST(postReq, { params: Promise.resolve({ id: 'b1' }) });
    expect(postRes.status).toBe(201);

    const getReq = new NextRequest(new Request(`${BASE}/api/bookings/b1/messages`));
    const getRes = await GET(getReq, { params: Promise.resolve({ id: 'b1' }) });
    const data = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(data.messages).toHaveLength(1);
    expect(data.messages[0].body).toBe('hello');
  });

  it('denies outsiders', async () => {
    // Mock authenticated user who is not a participant
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'x2' } },
      error: null
    });

    const getReq = new NextRequest(new Request(`${BASE}/api/bookings/b1/messages`));
    const res = await GET(getReq, { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(403);
  });
});
