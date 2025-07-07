import { google } from 'googleapis';
import type { CalendarAdapter, CalendarEvent, CalendarCredentials, CalendarSystemConfig } from './types';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { CalendarProvider, ExternalCalendarConfig } from './types'

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class GoogleCalendarAdapter implements CalendarAdapter {
  private oauth2Client: unknown;
  private calendar: unknown;
  private credentials: CalendarCredentials | null = null;
  private config: CalendarSystemConfig;
  private supabase = createClientComponentClient()
  private oauthConfig: GoogleOAuthConfig

  constructor(config: CalendarSystemConfig, oauthConfig: GoogleOAuthConfig) {
    this.config = config;
    this.oauthConfig = oauthConfig;
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
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
      const primaryCalendar = items.find((cal: Record<string, any>) => cal.primary)

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

      return response.data.items.map((event: Record<string, any>) => ({
        id: event.id,
        title: event.summary || 'Busy',
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date),
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
        busy: busySlots.map((slot: Record<string, any>) => ({
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
      return response.data.items.map((cal: Record<string, any>) => ({
        id: cal.id,
        name: cal.summary
      }));
    } catch (error) {
      console.error('Failed to fetch Google Calendar list:', error);
      throw error;
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