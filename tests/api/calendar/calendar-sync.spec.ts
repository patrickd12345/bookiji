
import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST } from '../../../src/app/api/calendar/sync/route';

// Mock Flags
vi.mock('@/lib/calendar-sync/flags', () => ({
  isCalendarSyncEnabled: vi.fn().mockReturnValue(true),
}));

// Mock Googleapis
const mockFreeBusyQuery = vi.fn();
const mockCalendarListList = vi.fn();
const mockOAuth2Client = {
  setCredentials: vi.fn(),
  on: vi.fn(),
};

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(() => mockOAuth2Client),
    },
    calendar: vi.fn(() => ({
      calendarList: {
        list: mockCalendarListList,
      },
      freebusy: {
        query: mockFreeBusyQuery,
      },
    })),
  },
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
};
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();

mockSupabase.from.mockReturnValue({
  select: mockSelect,
  update: mockUpdate,
});
mockSelect.mockReturnValue({
  eq: mockEq,
});
mockEq.mockReturnValue({
  single: mockSingle,
  eq: mockEq // Chainable for update
});
mockUpdate.mockReturnValue({
  eq: mockEq
});

vi.mock('@/lib/supabaseServerClient', () => ({
  createSupabaseServerClient: () => mockSupabase,
}));

describe('Integration: POST /api/calendar/sync', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any) => {
    return new Request('http://localhost:3000/api/calendar/sync', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('should return 400 if profileId is missing', async () => {
    const req = createRequest({});
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing profileId');
  });

  it('should return 404 if credentials not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: 'Not found' });
    const req = createRequest({ profileId: 'user-1' });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toBe('Could not find calendar credentials for this user.');
  });

  it('should perform sync successfully', async () => {
    // Setup Mock Data
    const profileId = 'user-123';

    // Mock DB Credentials
    mockSingle.mockResolvedValue({
      data: {
        access_token: 'at-123',
        refresh_token: 'rt-123',
        expiry_date: new Date().toISOString(),
      },
      error: null,
    });

    // Mock Calendar List
    mockCalendarListList.mockResolvedValue({
      data: {
        items: [
          { id: 'primary-cal-id', primary: true },
        ],
      },
    });

    // Mock FreeBusy
    mockFreeBusyQuery.mockResolvedValue({
      data: {
        calendars: {
          'primary-cal-id': {
            busy: [
              { start: '2025-01-01T10:00:00Z', end: '2025-01-01T11:00:00Z' },
            ],
          },
        },
      },
    });

    const req = createRequest({ profileId });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toContain('Sync successful');
    expect(json.busy).toHaveLength(1);

    // Verify flow
    expect(mockSupabase.from).toHaveBeenCalledWith('provider_google_calendar');
    expect(mockOAuth2Client.setCredentials).toHaveBeenCalled();
    expect(mockCalendarListList).toHaveBeenCalled();
    expect(mockFreeBusyQuery).toHaveBeenCalled();
  });

  it('should handle Google API errors', async () => {
     // Mock DB Credentials
    mockSingle.mockResolvedValue({
      data: { access_token: 'at', refresh_token: 'rt', expiry_date: new Date().toISOString() },
      error: null,
    });

    // Mock API Error
    mockCalendarListList.mockRejectedValue(new Error('Google API Down'));

    const req = createRequest({ profileId: 'user-1' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Failed to sync calendar.');
  });
});
