# Design: Calendar Sync Architecture (ICS + 2-Way)

**Task ID:** F-005  
**Status:** ✅ Complete  
**Created:** 2025-01-16  
**Duration:** 6 days  
**Target Date:** 2026-01-12  
**Dependencies:** F-002 (Requirements: Calendar sync 2-way)

---

## Overview

This document provides the technical architecture for implementing 2-way calendar synchronization between Bookiji and external calendar systems (Google Calendar, Outlook, ICS), enabling vendors to manage availability through their preferred calendar while keeping Bookiji bookings in sync.

---

## Architecture Principles

1. **Bidirectional Sync:** Changes flow both ways (Bookiji ↔ Calendar)
2. **Idempotency:** All sync operations are idempotent
3. **Eventual Consistency:** Sync happens asynchronously, eventual consistency is acceptable
4. **Resilience:** Sync failures don't break booking system
5. **Performance:** Sync operations are fast and non-blocking

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Bookiji Platform                     │
│                                                          │
│  ┌──────────────┐         ┌──────────────┐            │
│  │   Booking    │────────▶│   Calendar   │            │
│  │   System     │         │   Sync       │            │
│  │              │◀────────│   Service    │            │
│  └──────────────┘         └──────┬───────┘            │
│                                   │                    │
└───────────────────────────────────┼────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │   Google    │ │   Outlook   │ │    ICS      │
            │  Calendar   │ │  Calendar   │ │   Files     │
            └─────────────┘ └─────────────┘ └─────────────┘
```

### Component Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Calendar Sync Service                       │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Calendar Adapter Interface               │   │
│  │  (GoogleCalendarAdapter, OutlookAdapter, ICS)    │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                                │
│  ┌───────────────────────┼───────────────────────────┐   │
│  │  Two-Way Sync Engine  │  ICS Import/Export       │   │
│  │  - Read free/busy     │  - Generate ICS          │   │
│  │  - Write events       │  - Parse ICS              │   │
│  │  - Update events      │  - Validate format        │   │
│  │  - Delete events      │                           │   │
│  └───────────────────────┼───────────────────────────┘   │
│                          │                                │
│  ┌───────────────────────┴───────────────────────────┐   │
│  │         Sync Status & Error Handling              │   │
│  │  - Track sync status                              │   │
│  │  - Handle errors                                  │   │
│  │  - Retry logic                                    │   │
│  └───────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

---

## Database Design

### Schema Changes

#### 1. Calendar Sync Status Table

```sql
CREATE TABLE calendar_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  calendar_type TEXT NOT NULL CHECK (calendar_type IN ('google', 'outlook', 'ics')),
  calendar_id TEXT, -- Google Calendar ID, Outlook Calendar ID, etc.
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error', 'partial')),
  last_sync_error TEXT,
  sync_frequency_minutes INTEGER DEFAULT 5,
  auto_sync_enabled BOOLEAN DEFAULT true,
  oauth_token_encrypted TEXT, -- Encrypted OAuth token
  oauth_refresh_token_encrypted TEXT,
  oauth_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vendor_id, calendar_type)
);

CREATE INDEX idx_calendar_sync_status_vendor 
ON calendar_sync_status(vendor_id);
CREATE INDEX idx_calendar_sync_status_last_sync 
ON calendar_sync_status(last_sync_at) 
WHERE is_connected = true;
```

#### 2. Calendar Events Mapping Table

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  calendar_type TEXT NOT NULL CHECK (calendar_type IN ('google', 'outlook')),
  external_event_id TEXT NOT NULL, -- Google Calendar event ID, etc.
  external_calendar_id TEXT, -- Calendar ID where event exists
  event_etag TEXT, -- For optimistic concurrency
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_status TEXT CHECK (sync_status IN ('synced', 'pending', 'error')),
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, calendar_type),
  UNIQUE(external_event_id, calendar_type, external_calendar_id)
);

CREATE INDEX idx_calendar_events_booking 
ON calendar_events(booking_id);
CREATE INDEX idx_calendar_events_vendor 
ON calendar_events(vendor_id);
CREATE INDEX idx_calendar_events_external 
ON calendar_events(external_event_id, calendar_type);
```

#### 3. Add Calendar Fields to Bookings

```sql
ALTER TABLE bookings
ADD COLUMN google_calendar_event_id TEXT,
ADD COLUMN calendar_synced_at TIMESTAMPTZ;

CREATE INDEX idx_bookings_calendar_sync 
ON bookings(google_calendar_event_id) 
WHERE google_calendar_event_id IS NOT NULL;
```

---

## Calendar Adapter Pattern

### Adapter Interface

```typescript
// src/lib/calendar-adapters/types.ts

export interface CalendarAdapter {
  // Connection
  connect(credentials: CalendarCredentials): Promise<ConnectionResult>;
  disconnect(vendorId: string): Promise<void>;
  getConnectionStatus(vendorId: string): Promise<ConnectionStatus>;
  
  // Read operations
  getFreeBusy(
    vendorId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<FreeBusyResult>;
  
  // Write operations
  createEvent(
    vendorId: string,
    event: CalendarEvent
  ): Promise<EventCreationResult>;
  
  updateEvent(
    vendorId: string,
    eventId: string,
    event: CalendarEvent
  ): Promise<EventUpdateResult>;
  
  deleteEvent(
    vendorId: string,
    eventId: string
  ): Promise<EventDeletionResult>;
  
  // Sync operations
  syncFreeBusy(
    vendorId: string
  ): Promise<SyncResult>;
}
```

### Google Calendar Adapter

```typescript
// src/lib/calendar-adapters/google.ts (enhance existing)

export class GoogleCalendarAdapter implements CalendarAdapter {
  // Enhance existing adapter with write operations
  async createEvent(vendorId: string, event: CalendarEvent): Promise<EventCreationResult> {
    // Use Google Calendar Events API
    // Create event with booking details
    // Store event ID in calendar_events table
    // Return result
  }
  
  async updateEvent(vendorId: string, eventId: string, event: CalendarEvent): Promise<EventUpdateResult> {
    // Use Google Calendar Events API
    // Update event with new details
    // Handle etag for optimistic concurrency
    // Return result
  }
  
  async deleteEvent(vendorId: string, eventId: string): Promise<EventDeletionResult> {
    // Use Google Calendar Events API
    // Delete event
    // Remove from calendar_events table
    // Return result
  }
}
```

### ICS Adapter

```typescript
// src/lib/calendar-adapters/ics.ts (new)

export class ICSAdapter {
  // Export
  async exportSchedule(
    vendorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string> { // Returns ICS file content
    // Generate RFC 5545 compliant ICS file
    // Include all availability slots
    // Include all bookings
    // Include timezone information
    // Return ICS string
  }
  
  // Import
  async importSchedule(
    vendorId: string,
    icsContent: string
  ): Promise<ImportResult> {
    // Parse ICS file
    // Validate format
    // Extract events
    // Create availability slots from free events
    // Handle recurring events (RRULE)
    // Return import result with conflicts
  }
  
  // Generate invite
  async generateInvite(
    booking: Booking
  ): Promise<string> { // Returns ICS invite content
    // Generate ICS invite file
    // Include booking details
    // Include customer as attendee
    // Return ICS string
  }
}
```

---

## Two-Way Sync Engine

### Sync Service

```typescript
// src/lib/calendarSync/twoWaySync.ts

export class TwoWaySyncEngine {
  // Sync free/busy from calendar to Bookiji
  async syncFreeBusyToBookiji(vendorId: string): Promise<SyncResult> {
    // 1. Get free/busy from calendar
    // 2. Update availability_slots based on busy blocks
    // 3. Mark busy slots as unavailable
    // 4. Update sync status
    // 5. Return result
  }
  
  // Sync bookings from Bookiji to calendar
  async syncBookingsToCalendar(vendorId: string): Promise<SyncResult> {
    // 1. Get pending bookings (not yet synced)
    // 2. Create calendar events for each booking
    // 3. Store event IDs in calendar_events table
    // 4. Update sync status
    // 5. Return result
  }
  
  // Full 2-way sync
  async syncBidirectional(vendorId: string): Promise<SyncResult> {
    // 1. Sync free/busy to Bookiji
    // 2. Sync bookings to calendar
    // 3. Handle conflicts
    // 4. Update sync status
    // 5. Return combined result
  }
}
```

### Sync Workflow

```
1. Vendor connects calendar (OAuth)
   ↓
2. Store credentials (encrypted)
   ↓
3. Initial sync (free/busy + existing bookings)
   ↓
4. Periodic sync (every 5 minutes)
   ├─ Read free/busy → Update availability
   └─ Write new bookings → Create events
   ↓
5. Real-time sync triggers
   ├─ Booking created → Create event
   ├─ Booking updated → Update event
   └─ Booking cancelled → Delete event
```

---

## ICS Import/Export

### ICS Export Implementation

```typescript
// src/lib/icsGenerator.ts

import { writeFileSync } from 'ics';

export class ICSGenerator {
  async generateScheduleICS(
    vendorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    // 1. Fetch availability slots
    // 2. Fetch bookings
    // 3. Generate VEVENT components
    // 4. Generate VTIMEZONE components
    // 5. Format as RFC 5545 ICS file
    // 6. Return ICS string
  }
  
  async generateBookingInvite(booking: Booking): Promise<string> {
    // 1. Create VEVENT for booking
    // 2. Add customer as attendee
    // 3. Add vendor as organizer
    // 4. Include booking details
    // 5. Return ICS invite string
  }
}
```

### ICS Import Implementation

```typescript
// src/lib/icsParser.ts

import { parse } from 'ical';

export class ICSParser {
  async parseICSFile(
    icsContent: string
  ): Promise<ParsedICSEvents> {
    // 1. Parse ICS file
    // 2. Extract VEVENT components
    // 3. Parse RRULE for recurring events
    // 4. Convert to availability slots
    // 5. Validate timezone
    // 6. Return parsed events
  }
  
  async importToAvailability(
    vendorId: string,
    events: ParsedICSEvents
  ): Promise<ImportResult> {
    // 1. Check for conflicts
    // 2. Create availability slots
    // 3. Handle recurring patterns
    // 4. Return import result
  }
}
```

---

## API Design

### Calendar Connection Endpoints

```typescript
// Connect Google Calendar
POST /api/vendor/calendar/connect/google
→ Redirects to Google OAuth
→ Callback: /api/auth/google/callback

// Disconnect
POST /api/vendor/calendar/disconnect
{
  "calendar_type": "google"
}

// Get connection status
GET /api/vendor/calendar/status
→ Returns connection status, last sync time, errors
```

### Sync Endpoints

```typescript
// Trigger manual sync
POST /api/vendor/calendar/sync
{
  "direction": "bidirectional" | "to_calendar" | "from_calendar"
}

// Get sync status
GET /api/vendor/calendar/sync-status
→ Returns detailed sync status, errors, next sync time
```

### ICS Endpoints

```typescript
// Export schedule as ICS
GET /api/vendor/calendar/export.ics
?start_date=2026-01-01
&end_date=2026-12-31
→ Returns ICS file download

// Import ICS file
POST /api/vendor/calendar/import
Content-Type: multipart/form-data
file: <ICS file>
→ Returns import result with conflicts
```

### Booking-to-Calendar Sync

```typescript
// Automatically triggered on booking events
// No direct API endpoint needed
// Handled by webhook/event system

// Booking created → Create calendar event
// Booking updated → Update calendar event  
// Booking cancelled → Delete calendar event
```

---

## Cron Job Design

### Sync Scheduler

```typescript
// scripts/calendar-sync-scheduler.ts

export async function scheduleCalendarSyncs() {
  // 1. Get all vendors with connected calendars
  // 2. For each vendor:
  //    - Check if sync is due (last_sync + frequency)
  //    - Queue sync job
  // 3. Process sync jobs in parallel (with rate limiting)
  // 4. Update sync status
  // 5. Log results
}
```

### Cron Configuration

```sql
-- Supabase cron job
SELECT cron.schedule(
  'calendar-sync-every-5-min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT sync_calendars_for_due_vendors();
  $$
);
```

---

## Error Handling & Retry Logic

### Error Types

```typescript
enum CalendarSyncError {
  OAUTH_TOKEN_EXPIRED = 'OAUTH_TOKEN_EXPIRED',
  CALENDAR_API_ERROR = 'CALENDAR_API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_ICS_FORMAT = 'INVALID_ICS_FORMAT',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED'
}
```

### Retry Strategy

```typescript
async function syncWithRetry(
  operation: () => Promise<SyncResult>,
  maxRetries: number = 3
): Promise<SyncResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (isRetryableError(error) && i < maxRetries - 1) {
        await delay(exponentialBackoff(i));
        continue;
      }
      throw error;
    }
  }
}
```

---

## Performance Considerations

### Rate Limiting

- Google Calendar API: 1,000,000 queries/day, 100 queries/100 seconds/user
- Implement rate limiting per vendor
- Queue sync operations if rate limit exceeded
- Use exponential backoff

### Caching

- Cache free/busy results for 1 minute
- Cache calendar connection status
- Invalidate cache on sync

### Batch Operations

- Batch multiple event creations
- Batch free/busy queries for multiple vendors
- Use batch API endpoints where available

---

## Security Considerations

### OAuth Token Storage

- Encrypt tokens at rest
- Use Supabase Vault or similar
- Never log tokens
- Automatic token refresh

### API Key Management

- Store Google OAuth credentials securely
- Rotate credentials periodically
- Use environment variables
- Never commit to repository

---

## Testing Strategy

### Unit Tests
- Calendar adapter methods
- ICS parser/generator
- Sync engine logic
- Error handling

### Integration Tests
- Google Calendar API integration
- ICS import/export
- OAuth flow
- Sync workflows

### E2E Tests
- Vendor connects calendar
- Booking creates calendar event
- Calendar event blocks availability
- ICS import creates slots

---

## Migration Plan

### Phase 1: Database Schema
1. Create calendar_sync_status table
2. Create calendar_events table
3. Add columns to bookings table
4. Create indexes

### Phase 2: Google Calendar Write
1. Enhance GoogleCalendarAdapter
2. Implement event creation
3. Implement event update/delete
4. Test with real Google Calendar

### Phase 3: ICS Import/Export
1. Implement ICS generator
2. Implement ICS parser
3. Create import/export endpoints
4. Test with various ICS files

### Phase 4: Sync Engine
1. Implement two-way sync
2. Create cron job
3. Add sync status dashboard
4. Test end-to-end

---

## Rollback Plan

If issues arise:
1. Disable calendar sync (feature flag)
2. Stop cron jobs
3. Disconnect all calendar connections
4. Revert database changes if needed

---

## Success Criteria

- ✅ 95%+ sync success rate
- ✅ < 5 second sync time per vendor
- ✅ Zero data loss on sync
- ✅ ICS import/export working correctly
- ✅ Calendar events created for all bookings

---

## References

- Requirements: `docs/requirements/calendar-sync-2way.md`
- Existing adapter: `src/lib/calendar-adapters/google.ts`
- OAuth flow: `src/app/api/auth/google/`
- Test plan: `tests/plan/calendar-loyalty-integration.md`

---

**Last Updated:** 2025-01-16  
**Next Steps:** Build phase (F-015) - Implement 2-way free/busy sync
