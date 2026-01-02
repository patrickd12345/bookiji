import { CalendarAdapter } from './types';

export class MockCalendarAdapter implements CalendarAdapter {
  private store: Record<string, any> = {};

  async connect(code: string) {
    return {
      provider: 'google',
      provider_calendar_id: 'mock-cal',
      access_token: 'mock',
      refresh_token: 'mock',
      token_expiry: new Date(),
    } as any;
  }

  async disconnect(id: string) {
    return;
  }

  async getCalendarList() {
    return [{ id: 'mock-cal', name: 'Mock Calendar' }];
  }

  async getEvents(start: Date, end: Date) {
    return Object.values(this.store).map((e: any) => ({
      id: e.id,
      title: e.title,
      start: new Date(e.start),
      end: new Date(e.end),
      isAllDay: false,
      status: 'busy' as const,
      description: e.description,
      location: e.location,
    }));
  }

  async refreshToken(connectionId: string) {
    return {
      access_token: 'mock-refreshed',
      refresh_token: 'mock-refresh',
      token_expiry: new Date(Date.now() + 3600 * 1000),
    };
  }

  async getFreebusy(start: Date, end: Date) {
    return { busy: [] };
  }

  async createEvent(event: any) {
    const id = `mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const stored = { id, ...event, last_modified: new Date().toISOString() };
    this.store[id] = stored;
    return { id: stored.id, external_id: stored.id, ...stored };
  }

  async updateEvent(event: any) {
    const id = event.id || event.external_id;
    if (!id || !this.store[id]) {
      throw new Error('Event not found');
    }
    const updated = { ...this.store[id], ...event, last_modified: new Date().toISOString() };
    this.store[id] = updated;
    return { id, ...updated };
  }

  async deleteEvent(eventId: string) {
    if (!this.store[eventId]) return false;
    delete this.store[eventId];
    return true;
  }
}

