
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleCalendarAdapter } from './google';
import { CalendarSystemConfig } from './types';

// Mock dependencies
const mockEvents = {
  list: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockFreebusy = {
  query: vi.fn(),
};

const mockCalendarList = {
  list: vi.fn(),
};

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn(),
      })),
    },
    calendar: vi.fn(),
  },
}));

// Mock supabase client
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })),
      update: vi.fn(() => ({ eq: vi.fn() })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
    })),
  })),
}));

describe('GoogleCalendarAdapter', () => {
  let adapter: GoogleCalendarAdapter;
  const config: CalendarSystemConfig = {
    id: 'test-config',
    name: 'Google Calendar',
    type: 'google',
    authType: 'oauth2',
  };
  const oauthConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'test-redirect-uri',
  };

  beforeEach(async () => {
    // Setup the mock return value for google.calendar
    // We can't easily use await import inside sync beforeEach or rely on hoisting of vi.mock to work with import inline easily in some envs
    // But since we mocked googleapis above, we can just access the mock

    // Actually, accessing the mock directly from the require/import cache or global scope is tricky in vitest without importing it
    // But since we defined the mock with vi.mock factory, the imported module is the mock.

    const { google } = await import('googleapis');
    (google.calendar as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        events: mockEvents,
        freebusy: mockFreebusy,
        calendarList: mockCalendarList,
    });

    adapter = new GoogleCalendarAdapter(config, oauthConfig);
  });

  it('should create an event', async () => {
    const eventInput = {
      title: 'Test Event',
      start: new Date('2023-01-01T10:00:00Z'),
      end: new Date('2023-01-01T11:00:00Z'),
      description: 'Test Description',
      location: 'Test Location',
      isAllDay: false,
      status: 'busy' as const,
    };

    mockEvents.insert.mockResolvedValue({
      data: {
        id: 'new-event-id',
        summary: eventInput.title,
        start: { dateTime: eventInput.start.toISOString() },
        end: { dateTime: eventInput.end.toISOString() },
        description: eventInput.description,
        location: eventInput.location,
        transparency: 'opaque',
      },
    });

    const result = await adapter.createEvent(eventInput);

    expect(mockEvents.insert).toHaveBeenCalledWith({
      calendarId: 'primary',
      requestBody: {
        summary: eventInput.title,
        description: eventInput.description,
        location: eventInput.location,
        start: { dateTime: eventInput.start.toISOString() },
        end: { dateTime: eventInput.end.toISOString() },
      },
    });

    expect(result).toEqual({
      id: 'new-event-id',
      title: eventInput.title,
      start: eventInput.start,
      end: eventInput.end,
      isAllDay: false,
      status: 'busy',
      description: eventInput.description,
      location: eventInput.location,
    });
  });

  it('should update an event', async () => {
    const eventInput = {
      id: 'existing-event-id',
      title: 'Updated Event',
      start: new Date('2023-01-02T10:00:00Z'),
      end: new Date('2023-01-02T11:00:00Z'),
      description: 'Updated Description',
      location: 'Updated Location',
      isAllDay: false,
      status: 'free' as const,
    };

    mockEvents.update.mockResolvedValue({
      data: {
        id: eventInput.id,
        summary: eventInput.title,
        start: { dateTime: eventInput.start.toISOString() },
        end: { dateTime: eventInput.end.toISOString() },
        description: eventInput.description,
        location: eventInput.location,
        transparency: 'transparent',
      },
    });

    const result = await adapter.updateEvent(eventInput);

    expect(mockEvents.update).toHaveBeenCalledWith({
      calendarId: 'primary',
      eventId: eventInput.id,
      requestBody: {
        summary: eventInput.title,
        description: eventInput.description,
        location: eventInput.location,
        start: { dateTime: eventInput.start.toISOString() },
        end: { dateTime: eventInput.end.toISOString() },
      },
    });

    expect(result).toEqual({
      id: eventInput.id,
      title: eventInput.title,
      start: eventInput.start,
      end: eventInput.end,
      isAllDay: false,
      status: 'free',
      description: eventInput.description,
      location: eventInput.location,
    });
  });

  it('should delete an event', async () => {
    const eventId = 'delete-event-id';
    mockEvents.delete.mockResolvedValue({});

    const result = await adapter.deleteEvent(eventId);

    expect(mockEvents.delete).toHaveBeenCalledWith({
      calendarId: 'primary',
      eventId: eventId,
    });
    expect(result).toBe(true);
  });
});
