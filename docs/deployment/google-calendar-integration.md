# Google Calendar Integration Blueprint for Bookiji

## 1. Overview
Bookiji integrates with Google Calendar to automatically ingest vendor availability and keep booking slots up to date in real time.

---

## 2. OAuth2 Flow
- Vendor clicks "Connect Google Calendar" during onboarding.
- Redirect to Google OAuth2 consent screen.
- Request read-only access to calendar events (`https://www.googleapis.com/auth/calendar.readonly`).
- On success, store access token (securely, encrypted, per vendor).
- Allow vendor to disconnect at any time from dashboard.

---

## 3. Event Parsing Logic
- Fetch all events from the vendor's selected calendar(s).
- Parse each event:
  - If event is marked as "busy" or not available, block that slot in Bookiji.
  - If event is marked as "free" or slot is open, show as available in Bookiji.
  - Recurring events are parsed and respected.
- Bookiji bookings are written as separate events (optional, advanced).

---

## 4. Data Model
- **Vendor**
  - id
  - name
  - connected_calendar_id
  - access_token (encrypted)
- **AvailabilitySlot**
  - id
  - vendor_id
  - start_time
  - end_time
  - service_type
  - source (Google, Bookiji-native, etc.)
  - status (available, booked, blocked)

---

## 5. Sync Frequency
- Poll Google Calendar every 5 minutes for updates (or use push notifications if available).
- On each sync:
  - Update Bookiji slots to match vendor's real-time calendar.
  - Remove slots that are no longer available.
  - Add new open slots as they appear.

---

## 6. Error Handling
- If token expires, prompt vendor to reconnect.
- If Google API is down, show a warning and retry later.
- Log all sync errors for monitoring.

---

## 7. Summary Diagram

```mermaid
graph TD;
  A[Vendor Onboarding] --> B[Connect Google Calendar]
  B --> C[OAuth2 Consent]
  C --> D[Bookiji Receives Access Token]
  D --> E[Fetch Calendar Events]
  E --> F[Parse Events for Availability]
  F --> G[Display Real-Time Slots in Bookiji]
  G --> H[Customer Books Slot]
  H --> I[Bookiji Updates Vendor Calendar (optional)]
```

---

## 8. Security & Privacy
- Only read access is requested.
- Tokens are encrypted and never shared.
- Vendors can disconnect at any time.

---

*This blueprint ensures Bookiji can offer real-time, zero-friction onboarding for vendors using Google Calendar.* 