import { google } from 'googleapis';
import type { CalendarAdapter, CalendarEvent, CalendarCredentials, CalendarSystemConfig } from './types';
import { createBrowserClient } from '@supabase/ssr'
import { CalendarProvider, ExternalCalendarConfig } from './types'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env/supabaseEnv'

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Google Calendar API interfaces
interface GoogleCalendarItem {
  id: string;
  primary?: boolean;
  summary?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  transparency?: string;
  description?: string;
  location?: string;
}

interface GoogleCalendarResponse {
  data: {
    items: GoogleCalendarEvent[];
  };
}

interface GoogleFreebusySlot {
  start: string;
  end: string;
}

interface GoogleFreebusyResponse {
  data: {
    calendars: {
      primary: {
        busy: GoogleFreebusySlot[];
      };
    };
  };
}

interface GoogleCalendarListResponse {
  data: {
    items: GoogleCalendarItem[];
  };
}

export class GoogleCalendarAdapter implements CalendarAdapter {
  private oauth2Client: unknown;
  private calendar!: {
    events: {
      list: (params: {
        calendarId: string;
        timeMin: string;
        timeMax: string;
        singleEvents: boolean;
        orderBy: string;
      }) => Promise<GoogleCalendarResponse>;
    };
    freebusy: {
      query: (params: {
        requestBody: {
          timeMin: string;
          timeMax: string;
          items: Array<{ id: string }>;
        };
      }) => Promise<GoogleFreebusyResponse>;
    };
    calendarList: {
      list: () => Promise<GoogleCalendarListResponse>;
    };
    // Add write operations
    events: {
      list: (params: {
        calendarId: string;
        timeMin: string;
        timeMax: string;
        singleEvents: boolean;
        orderBy: string;
      }) => Promise<GoogleCalendarResponse>;
      insert: (params: {
        calendarId: string;
        requestBody: {
          summary: string;
          description?: string;
          location?: string;
          start: { dateTime: string };
          end: { dateTime: string };
        };
      }) => Promise<{ data: GoogleCalendarEvent }>;
      update: (params: {
        calendarId: string;
        eventId: string;
        requestBody: {
          summary: string;
          description?: string;
          location?: string;
          start: { dateTime: string };
          end: { dateTime: string };
        };
      }) => Promise<{ data: GoogleCalendarEvent }>;
      delete: (params: {
        calendarId: string;
        eventId: string;
      }) => Promise<void>;
    };
  };
  private credentials: CalendarCredentials | null = null;
  private config: CalendarSystemConfig;
  private supabase = createBrowserClient(
    getSupabaseUrl(),
    getSupabaseAnonKey()
  )
  private oauthConfig: GoogleOAuthConfig

  constructor(config: CalendarSystemConfig, oauthConfig: GoogleOAuthConfig) {
    this.config = config;
    this.oauthConfig = oauthConfig;
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    // Initialize the calendar client using the OAuth2 client
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client as any }) as any;
  }

  async connect(code: string, email?: string): Promise<ExternalCalendarConfig> {
    try {
      // Exchange code for tokens
      const response = await fetch('/api/auth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email })
      })

      if (!response.ok) {
        throw new Error('Failed to exchange code for tokens')
      }

      const { access_token, refresh_token, expiry_date, provider_email, provider_user_id } = await response.json()

      // Get primary calendar ID
      const calendarResponse = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
        headers: { Authorization: `Bearer ${access_token}` }
      })

      if (!calendarResponse.ok) {
        throw new Error('Failed to fetch calendar list')
      }

      const { items } = await calendarResponse.json()
      const primaryCalendar = items.find((cal: GoogleCalendarItem) => cal.primary)

      if (!primaryCalendar) {
        throw new Error('No primary calendar found')
      }

      // Store connection in database
      const { data: connection, error } = await this.supabase
        .from('external_calendar_connections')
        .insert({
          provider: CalendarProvider.GOOGLE,
          provider_user_id,
          provider_email: email || provider_email,
          provider_calendar_id: primaryCalendar.id,
          access_token,
          refresh_token,
          token_expiry: new Date(expiry_date),
          sync_enabled: true
        })
        .select()
        .single()

      if (error) throw error

      return connection
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error)
      throw error
    }
  }

  async disconnect(connectionId: string): Promise<void> {
    try {
      // Get connection details
      const { data: connection, error: fetchError } = await this.supabase
        .from('external_calendar_connections')
        .select('access_token')
        .eq('id', connectionId)
        .single()

      if (fetchError) throw fetchError

      // Revoke Google access
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `token=${connection.access_token}`
      })

      // Delete connection from database
      const { error: deleteError } = await this.supabase
        .from('external_calendar_connections')
        .delete()
        .eq('id', connectionId)

      if (deleteError) throw deleteError
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error)
      throw error
    }
  }

  async refreshToken(connectionId: string): Promise<CalendarCredentials> {
    try {
      const { data: connection, error: fetchError } = await this.supabase
        .from('external_calendar_connections')
        .select('refresh_token')
        .eq('id', connectionId)
        .single()

      if (fetchError) throw fetchError

      const response = await fetch('/api/auth/google/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: connection.refresh_token })
      })

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }

      const { access_token, refresh_token, expiry_date } = await response.json()

      // Update connection in database
      const { error: updateError } = await this.supabase
        .from('external_calendar_connections')
        .update({
          access_token,
          refresh_token,
          token_expiry: new Date(expiry_date)
        })
        .eq('id', connectionId)

      if (updateError) throw updateError

      return {
        access_token,
        refresh_token,
        token_expiry: new Date(expiry_date)
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
      throw error
    }
  }

  async getEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items.map((event: GoogleCalendarEvent) => ({
        id: event.id,
        title: event.summary || 'Busy',
        start: new Date(event.start.dateTime || event.start.date || new Date()),
        end: new Date(event.end.dateTime || event.end.date || new Date()),
        isAllDay: !event.start.dateTime,
        status: event.transparency === 'transparent' ? 'free' : 'busy',
        description: event.description,
        location: event.location
      }));
    } catch (error) {
      console.error('Failed to fetch Google Calendar events:', error);
      throw error;
    }
  }

  async getFreebusy(start: Date, end: Date): Promise<{ busy: { start: Date; end: Date }[] }> {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const busySlots = response.data.calendars.primary.busy || [];
      return {
        busy: busySlots.map((slot: GoogleFreebusySlot) => ({
          start: new Date(slot.start),
          end: new Date(slot.end)
        }))
      };
    } catch (error) {
      console.error('Failed to fetch Google Calendar freebusy:', error);
      throw error;
    }
  }

  async getCalendarList(): Promise<{ id: string; name: string }[]> {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items.map((cal: GoogleCalendarItem) => ({
        id: cal.id,
        name: cal.summary || ''
      }));
    } catch (error) {
      console.error('Failed to fetch Google Calendar list:', error);
      throw error;
    }
  }

  setCredentials(credentials: CalendarCredentials): void {
    const oauth2Client = this.oauth2Client as any;
    oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        expiry_date: credentials.token_expiry.getTime(),
    });
  }

  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: event.title,
          description: event.description,
          location: event.location,
          start: { dateTime: event.start.toISOString() },
          end: { dateTime: event.end.toISOString() },
        },
      });

      const newEvent = response.data;
      return {
        id: newEvent.id,
        title: newEvent.summary || 'Busy',
        start: new Date(newEvent.start.dateTime || newEvent.start.date || new Date()),
        end: new Date(newEvent.end.dateTime || newEvent.end.date || new Date()),
        isAllDay: !newEvent.start.dateTime,
        status: newEvent.transparency === 'transparent' ? 'free' : 'busy',
        description: newEvent.description,
        location: newEvent.location
      };
    } catch (error) {
      console.error('Failed to create Google Calendar event:', error);
      throw error;
    }
  }

  async updateEvent(event: CalendarEvent): Promise<CalendarEvent> {
    try {
      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: event.id,
        requestBody: {
          summary: event.title,
          description: event.description,
          location: event.location,
          start: { dateTime: event.start.toISOString() },
          end: { dateTime: event.end.toISOString() },
        },
      });

      const updatedEvent = response.data;
      return {
        id: updatedEvent.id,
        title: updatedEvent.summary || 'Busy',
        start: new Date(updatedEvent.start.dateTime || updatedEvent.start.date || new Date()),
        end: new Date(updatedEvent.end.dateTime || updatedEvent.end.date || new Date()),
        isAllDay: !updatedEvent.start.dateTime,
        status: updatedEvent.transparency === 'transparent' ? 'free' : 'busy',
        description: updatedEvent.description,
        location: updatedEvent.location
      };
    } catch (error) {
      console.error('Failed to update Google Calendar event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
      return true;
    } catch (error) {
      console.error('Failed to delete Google Calendar event:', error);
      return false;
    }
  }
}

export class GoogleCalendarAdapterFactory {
  createAdapter(config: CalendarSystemConfig): CalendarAdapter {
    const oauthConfig: GoogleOAuthConfig = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || ''
    }
    return new GoogleCalendarAdapter(config, oauthConfig);
  }
} 