# Dispute & No-Show System Implementation

## Overview

Complete implementation of dispute management and automatic no-show detection system for Bookiji platform.

## Features Implemented

### 1. Database Schema ✅

**Tables Created:**
- `disputes` - Comprehensive dispute tracking with resolution workflow
- `no_show_events` - Automatic no-show detection and tracking
- `provider_compensations` - Provider compensation for no-shows and disputes

**Key Features:**
- Full RLS policies for security
- Indexes for performance
- Database functions for automatic processing
- Triggers for updated_at timestamps

### 2. Admin API Endpoints ✅

**Endpoints:**
- `GET /api/admin/disputes` - List all disputes with filtering and pagination
- `GET /api/admin/disputes/stats` - Get dispute statistics
- `POST /api/admin/disputes/[id]/resolve` - Resolve disputes with refund processing

**Features:**
- Admin authentication required
- Pagination (default 50, max 200)
- Filtering by status and type
- Automatic refund processing
- Provider compensation handling

### 3. Automatic No-Show Detection ✅

**Cron Job:**
- `GET /api/cron/detect-no-shows` - Runs every 15 minutes
- Detects confirmed bookings that are past scheduled time
- 15-minute grace period before marking as no-show
- Only checks bookings from last 24 hours

**Automatic Actions:**
1. Creates `no_show_events` record
2. Updates booking status to `no_show`
3. Automatically creates dispute for customer
4. Sends admin notifications
5. Prepares provider compensation

### 4. Dispute Types Supported

- `no_show` - Customer didn't attend appointment
- `service_quality` - Issues with service provided
- `payment_issue` - Payment-related problems
- `scheduling_conflict` - Scheduling disagreements
- `other` - Other dispute types

### 5. Resolution Types

- `refund` - Full refund to customer
- `partial_refund` - Partial refund
- `reschedule` - Reschedule appointment
- `credit` - Account credit
- `rejected` - Dispute rejected
- `other` - Other resolution

### 6. Provider Compensation

**Automatic Compensation:**
- No-shows: Provider receives full booking amount
- Dispute resolutions: Configurable compensation
- Status tracking: pending → processing → paid

## Database Functions

### `detect_no_shows()`
Returns bookings that should be marked as no-shows:
- Status = 'confirmed'
- Past scheduled time + 15 minutes
- Within last 24 hours
- Not already marked as no-show

### `auto_create_no_show_dispute(booking_id, no_show_event_id)`
Automatically creates dispute for no-show:
- Creates dispute with type 'no_show'
- Links to no-show event
- Sets requested resolution to 'refund'
- Returns dispute ID

### `resolve_dispute(dispute_id, admin_id, resolution, ...)`
Comprehensive dispute resolution:
- Updates dispute status
- Processes refunds if needed
- Creates provider compensation for no-shows
- Updates booking status
- Returns success status

## Workflow

### No-Show Detection Flow

```
1. Cron job runs every 15 minutes
2. Detects confirmed bookings past scheduled time
3. Creates no_show_events record
4. Updates booking status to 'no_show'
5. Auto-creates dispute
6. Prepares provider compensation
7. Sends notifications
```

### Dispute Resolution Flow

```
1. Admin reviews dispute in /admin/disputes
2. Admin selects resolution type and amount
3. System processes resolution:
   - Updates dispute status
   - Processes refund if needed
   - Creates provider compensation
   - Updates booking status
4. Sends notifications to all parties
```

## API Usage Examples

### List Disputes
```bash
GET /api/admin/disputes?status=pending&type=no_show&page=1&limit=50
```

### Get Stats
```bash
GET /api/admin/disputes/stats
```

### Resolve Dispute
```bash
POST /api/admin/disputes/{id}/resolve
{
  "status": "resolved",
  "resolution": "Full refund approved",
  "resolution_amount": 10.00,
  "resolution_type": "refund",
  "admin_notes": "Customer confirmed no-show"
}
```

## Configuration

### Vercel Cron
Added to `vercel.json`:
```json
{
  "path": "/api/cron/detect-no-shows",
  "schedule": "*/15 * * * *"
}
```

### Environment Variables
- `VERCEL_CRON_SECRET` - Required for cron job authentication

## Security

- All admin endpoints require admin authentication
- RLS policies enforce data access control
- Cron jobs verify authorization header
- User can only create disputes for their own bookings

## Next Steps

1. **Deploy Migration**: Run `supabase db push` to apply migration
2. **Configure Cron**: Ensure Vercel cron is set up
3. **Test Flow**: Test no-show detection and dispute resolution
4. **Monitor**: Watch for no-show events and dispute patterns
5. **Tune**: Adjust grace period (currently 15 minutes) if needed

## Files Created/Modified

### New Files
- `supabase/migrations/20251123234429_disputes_and_no_show_system.sql`
- `src/app/api/admin/disputes/route.ts`
- `src/app/api/admin/disputes/stats/route.ts`
- `src/app/api/admin/disputes/[id]/resolve/route.ts`
- `src/app/api/cron/detect-no-shows/route.ts`

### Modified Files
- `vercel.json` - Added no-show detection cron

## Testing

### Manual Testing
1. Create a confirmed booking
2. Wait for scheduled time + 15 minutes
3. Trigger cron job manually or wait for scheduled run
4. Verify no-show event created
5. Verify dispute auto-created
6. Test dispute resolution in admin panel

### Test Endpoints
```bash
# Test no-show detection (requires auth)
curl -X GET "http://localhost:3000/api/cron/detect-no-shows" \
  -H "Authorization: Bearer $VERCEL_CRON_SECRET"

# Test dispute listing (requires admin)
curl -X GET "http://localhost:3000/api/admin/disputes"
```

## Notes

- Grace period is 15 minutes - adjust in `detect_no_shows()` function if needed
- No-shows automatically create disputes - customers can still file disputes manually
- Provider compensation is created but payment processing needs Stripe integration
- All timestamps use UTC timezone

