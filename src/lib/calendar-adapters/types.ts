export type BusySlot = {
  start: Date;
  end: Date;
};

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  status: 'busy' | 'free' | 'tentative';
  description?: string;
  location?: string;
}

export enum CalendarProvider {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  APPLE = 'apple',
  CUSTOM = 'custom'
}

export interface ExternalCalendarConfig {
  provider: CalendarProvider;
  provider_user_id?: string; // External system's user ID
  provider_calendar_id: string;
  provider_email?: string; // Can be different from Bookiji email
  access_token: string;
  refresh_token: string;
  token_expiry: Date;
  sync_enabled: boolean;
  last_synced?: Date;
  sync_from_date?: Date;
  sync_frequency_minutes?: number;
}

export interface CalendarCredentials {
  access_token: string;
  refresh_token: string;
  token_expiry: Date;
  provider_user_id?: string;
  provider_email?: string;
}

export interface ExternalEvent {
  external_id: string;
  provider: CalendarProvider;
  provider_calendar_id: string;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  attendees?: string[];
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  last_modified: Date;
  raw_data?: any; // Store provider-specific data
}

export interface SyncResult {
  added: number;
  updated: number;
  deleted: number;
  errors: Array<{
    event_id?: string;
    error: string;
    type: 'add' | 'update' | 'delete';
  }>;
}

export interface CalendarSystemConfig {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'ical' | 'exchange' | 'custom';
  apiEndpoint?: string;
  apiVersion?: string;
  authType: 'oauth2' | 'api_key' | 'none';
}

export interface CalendarAdapter {
  connect(code: string, email?: string): Promise<ExternalCalendarConfig>;
  disconnect(connectionId: string): Promise<void>;
  refreshToken(connectionId: string): Promise<CalendarCredentials>;
  getCalendarList(): Promise<{ id: string; name: string }[]>;
  getEvents(start: Date, end: Date): Promise<CalendarEvent[]>;
  getFreebusy(start: Date, end: Date): Promise<{ busy: { start: Date; end: Date }[] }>;
  
  // Optional methods that may not be supported by all systems
  createEvent?(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent>;
  updateEvent?(event: CalendarEvent): Promise<CalendarEvent>;
  deleteEvent?(eventId: string): Promise<boolean>;
  
  // System-specific operations
  refreshCredentials?(): Promise<CalendarCredentials>;
}

export interface CalendarAdapterFactory {
  createAdapter(config: CalendarSystemConfig): CalendarAdapter;
} 