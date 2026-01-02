# Requirements: Calendar Sync 2-Way

**Task ID:** F-002  
**Status:** ✅ Complete  
**Created:** 2025-01-16  
**Duration:** 2 days  
**Target Date:** 2026-01-06

---

## Overview

This document defines requirements for implementing 2-way calendar synchronization between Bookiji and external calendar systems (Google Calendar, Outlook, ICS), enabling vendors to manage availability through their preferred calendar while keeping Bookiji bookings in sync.

---

## Business Requirements

### BR-001: 2-Way Free/Busy Sync
**Priority:** 🔴 CRITICAL

Vendors must be able to sync their external calendar (Google Calendar, Outlook) with Bookiji so that:
- Bookiji reads free/busy status from external calendar
- Bookiji writes bookings to external calendar
- Changes in external calendar reflect in Bookiji availability
- Changes in Bookiji bookings reflect in external calendar

**Acceptance Criteria:**
- Vendor can connect Google Calendar account
- Vendor can connect Outlook calendar account
- Free/busy status syncs every 5 minutes (or on-demand)
- Bookings created in Bookiji appear in external calendar
- Bookings updated/cancelled in Bookiji update external calendar
- External calendar events block Bookiji availability

### BR-002: ICS Import/Export
**Priority:** 🟡 HIGH

Vendors must be able to import and export their schedule as ICS files for compatibility with any calendar system.

**Acceptance Criteria:**
- Vendor can export Bookiji schedule as ICS file
- Vendor can import ICS file to create availability
- ICS files are RFC 5545 compliant
- Import handles recurring events correctly
- Import validates and rejects invalid ICS files

### BR-003: Calendar Event Management
**Priority:** 🟡 HIGH

Bookiji bookings must be properly represented as calendar events with all necessary details.

**Acceptance Criteria:**
- Booking events include: title, description, time, location, attendees
- Booking events include calendar invite links
- Booking events can be updated when booking changes
- Booking events can be cancelled when booking is cancelled
- Events include proper timezone information

### BR-004: Sync Status Visibility
**Priority:** 🟢 MEDIUM

Vendors must be able to see the status of their calendar sync and troubleshoot issues.

**Acceptance Criteria:**
- Dashboard shows sync status (connected, syncing, error)
- Dashboard shows last sync time
- Dashboard shows sync errors with actionable messages
- Vendor can trigger manual sync
- Vendor can disconnect calendar connection

---

## Functional Requirements

### FR-001: Google Calendar 2-Way Sync

**Description:** Synchronize with Google Calendar bidirectionally.

**Requirements:**
1. **OAuth2 Connection**
   - Vendor initiates connection via OAuth2 flow
   - Request calendar read/write permissions
   - Store encrypted access/refresh tokens
   - Handle token refresh automatically

2. **Read Free/Busy (Existing - Enhance)**
   - Poll Google Calendar every 5 minutes
   - Use Google Calendar FreeBusy API
   - Parse busy blocks and update availability
   - Handle timezone conversions
   - Cache results for performance

3. **Write Bookings (New)**
   - Create calendar event when booking confirmed
   - Include booking details in event description
   - Add customer email as attendee (if provided)
   - Generate calendar invite links
   - Handle event creation errors

4. **Update/Cancel Events (New)**
   - Update event when booking rescheduled
   - Delete event when booking cancelled
   - Handle event not found errors
   - Log all calendar operations

### FR-002: Outlook Calendar Sync (Future)

**Description:** Support Outlook calendar integration (similar to Google Calendar).

**Priority:** Lower than Google Calendar, can be implemented after Google Calendar is stable.

### FR-003: ICS Export

**Description:** Export vendor schedule as ICS file.

**Requirements:**
1. **Export Endpoint**
   - `GET /api/vendor/calendar/export.ics`
   - Generate RFC 5545 compliant ICS file
   - Include all availability slots
   - Include all bookings
   - Include timezone information

2. **Export Options**
   - Date range selection
   - Include/exclude blocked time
   - Include/exclude past events
   - Custom event descriptions

3. **File Generation**
   - Use ICS library (e.g., `ics` npm package)
   - Properly format dates (UTC conversion)
   - Include VEVENT components
   - Include VTIMEZONE components

### FR-004: ICS Import

**Description:** Import ICS file to create availability slots.

**Requirements:**
1. **Import Endpoint**
   - `POST /api/vendor/calendar/import`
   - Accept ICS file upload
   - Parse ICS file (RFC 5545)
   - Validate file format

2. **Slot Creation**
   - Create availability slots from free events
   - Handle recurring events (RRULE)
   - Handle timezone conversions
   - Skip invalid or past events

3. **Conflict Handling**
   - Detect conflicts with existing slots
   - Allow vendor to choose: replace, merge, or skip
   - Log all imported slots

4. **Error Handling**
   - Reject invalid ICS files
   - Handle parsing errors gracefully
   - Provide clear error messages
   - Log import failures

### FR-005: Calendar Invite Generation

**Description:** Generate calendar invites for bookings.

**Requirements:**
1. **Invite Creation**
   - Generate ICS invite file
   - Include booking details
   - Include customer email as attendee
   - Include vendor email as organizer

2. **Email Integration**
   - Send invite via email to customer
   - Include "Add to Calendar" links
   - Support Google Calendar, Outlook, Apple Calendar
   - Handle email delivery failures

3. **Invite Updates**
   - Update invite when booking rescheduled
   - Cancel invite when booking cancelled
   - Handle attendee responses (optional)

### FR-006: Sync Status Dashboard

**Description:** Dashboard for monitoring calendar sync status.

**Requirements:**
1. **Status Display**
   - Connection status (connected, disconnected, error)
   - Last sync time
   - Next sync time
   - Sync frequency

2. **Error Display**
   - List of sync errors
   - Error messages with context
   - Suggested actions for errors
   - Error history

3. **Manual Actions**
   - Trigger manual sync button
   - Disconnect calendar button
   - Reconnect calendar button
   - View sync logs

---

## Technical Requirements

### TR-001: Database Schema

**New Tables:**
- `calendar_sync_status` - Track sync status per vendor
- `calendar_events` - Map Bookiji bookings to calendar events (optional, can use metadata)

**Schema Changes:**
- Add `google_calendar_event_id` to `bookings` table
- Add `calendar_sync_enabled` to `profiles` table
- Add `last_calendar_sync` to `profiles` table

### TR-002: API Endpoints

**New Endpoints:**
- `POST /api/vendor/calendar/sync` - Trigger manual sync
- `GET /api/vendor/calendar/sync-status` - Get sync status
- `GET /api/vendor/calendar/export.ics` - Export ICS file
- `POST /api/vendor/calendar/import` - Import ICS file
- `POST /api/vendor/calendar/disconnect` - Disconnect calendar

**Enhanced Endpoints:**
- `POST /api/calendar/sync` - Enhance for 2-way sync
- `POST /api/bookings/confirm` - Write to calendar after confirmation
- `PUT /api/bookings/:id` - Update calendar event on reschedule
- `DELETE /api/bookings/:id` - Delete calendar event on cancel

### TR-003: External APIs

**Google Calendar API:**
- FreeBusy API (read free/busy)
- Events API (create, update, delete events)
- CalendarList API (list calendars)
- OAuth2 for authentication

**ICS Libraries:**
- ICS file generation library
- ICS file parsing library
- RFC 5545 compliance

### TR-004: Performance Requirements

- Calendar sync: < 5 seconds per vendor
- ICS export: < 2 seconds for 1 year of data
- ICS import: < 10 seconds for 1000 events
- Event creation: < 1 second per event

### TR-005: Security Requirements

- OAuth tokens encrypted at rest
- Calendar API keys stored securely
- ICS file uploads validated and sanitized
- Rate limiting on calendar API calls
- Vendor can only sync own calendar

---

## Non-Functional Requirements

### NFR-001: Reliability
- 99.9% sync success rate
- Automatic retry on transient failures
- Graceful degradation if calendar API unavailable
- No data loss on sync failures

### NFR-002: Scalability
- Support 10,000+ vendors with calendar sync
- Handle 100+ concurrent sync operations
- Efficient polling (batch operations where possible)

### NFR-003: Usability
- Simple calendar connection flow
- Clear sync status indicators
- Helpful error messages
- Easy disconnect/reconnect

### NFR-004: Maintainability
- Well-documented code
- Comprehensive logging
- Error tracking and alerting
- Test coverage for all scenarios

---

## Dependencies

### Internal Dependencies
- Existing Google Calendar OAuth flow (`src/app/api/auth/google/`)
- Existing calendar sync endpoint (`src/app/api/calendar/sync/route.ts`)
- Booking system (`src/lib/bookingEngine.ts`)
- Availability system

### External Dependencies
- Google Calendar API
- Google OAuth2
- ICS parsing/generation libraries
- Email service (for invites)

---

## Out of Scope

- Outlook calendar integration (future phase)
- Apple Calendar native integration
- Calendar event attendee management
- Calendar event reminders
- Multi-calendar support (one calendar per vendor)

---

## Success Criteria

### Definition of Done
- ✅ Google Calendar 2-way sync working
- ✅ ICS export functional
- ✅ ICS import functional
- ✅ Calendar invites generated and sent
- ✅ Sync status dashboard complete
- ✅ All tests passing
- ✅ Performance requirements met
- ✅ Documentation complete

### Metrics
- 95%+ sync success rate
- < 5 second sync time
- Zero data loss on sync
- < 1% error rate

---

## Risks & Mitigation

### Risk 1: Google Calendar API Rate Limits
**Risk:** Google Calendar API has rate limits that may be exceeded  
**Mitigation:** Implement rate limiting, caching, batch operations, exponential backoff

### Risk 2: Token Expiration
**Risk:** OAuth tokens expire and need refresh  
**Mitigation:** Automatic token refresh, clear error messages, easy reconnection

### Risk 3: Timezone Complexity
**Risk:** Timezone conversions may cause errors  
**Mitigation:** Use proper timezone libraries, test all timezone scenarios, store UTC in database

### Risk 4: ICS File Parsing Errors
**Risk:** Invalid ICS files may cause import failures  
**Mitigation:** Validate files before parsing, handle errors gracefully, provide clear error messages

---

## References

- Current calendar sync: `src/app/api/calendar/sync/route.ts`
- Google Calendar adapter: `src/lib/calendar-adapters/google.ts`
- Google OAuth: `src/app/api/auth/google/`
- Test plan: `tests/plan/calendar-loyalty-integration.md`

---

**Last Updated:** 2025-01-16  
**Next Steps:** Design phase (F-005) - Calendar sync architecture design
