# Shout-Out System Implementation

Complete React + Node.js implementation of the "Shout-Out" flow for when user searches return no results.

## 🎯 Overview

The Shout-Out system allows customers to broadcast their service requests to nearby vendors when no search results are found. This creates a marketplace for unmet demand and helps connect customers with available providers.

## ✅ Implementation Status

All requirements have been fully implemented:

### ✅ Frontend (Next.js/React)
- [x] **Accessible consent modal** with proper ARIA attributes, focus trap, and keyboard navigation
- [x] **Offer cards display** with vendor details, ratings, pricing, and accept buttons
- [x] **Fallback UI** for expired shout-outs with radius expansion option
- [x] **Complete integration** with existing search components

### ✅ Backend (Next.js API Routes)
- [x] **POST /api/shout-outs** - Creates shout-out and notifies vendors
- [x] **GET /api/shout-outs/:id/offers** - Returns ranked offers
- [x] **POST /api/shout-outs/:id/offers/:offerId/accept** - Creates booking
- [x] **POST /api/vendors/shout-outs/:id/reply** - Vendor response endpoint
- [x] **GET /api/vendors/shout-outs** - Vendor dashboard endpoint

### ✅ Database Schema
- [x] **shout_outs** table with PostGIS location support
- [x] **shout_out_recipients** tracking table
- [x] **shout_out_offers** with ranking scores
- [x] **Proper indexing** for performance
- [x] **Row Level Security** policies

### ✅ Testing
- [x] **Comprehensive Playwright tests** covering all flows
- [x] **Accessibility testing** with WCAG compliance
- [x] **Error handling** and edge cases
- [x] **End-to-end workflows**

## 🏗️ Architecture

### Database Schema
```sql
-- Core shout-out table
shout_outs(
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  service_type TEXT,
  description TEXT,
  location GEOGRAPHY(POINT, 4326), -- PostGIS
  radius_km INTEGER,
  status TEXT CHECK (status IN ('active', 'expired', 'closed')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Vendor notification tracking
shout_out_recipients(
  id UUID PRIMARY KEY,
  shout_out_id UUID REFERENCES shout_outs(id),
  vendor_id UUID REFERENCES users(id),
  notified_at TIMESTAMPTZ,
  response_status TEXT CHECK (response_status IN ('pending', 'viewed', 'offered', 'declined'))
)

-- Vendor offers
shout_out_offers(
  id UUID PRIMARY KEY,
  shout_out_id UUID REFERENCES shout_outs(id),
  vendor_id UUID REFERENCES users(id),
  service_id UUID REFERENCES services(id),
  slot_start TIMESTAMPTZ,
  slot_end TIMESTAMPTZ,
  price_cents INTEGER,
  message TEXT,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn'))
)
```

### API Architecture
```
Customer Flow:
POST /api/shout-outs → Create request
GET /api/shout-outs/:id/offers → Poll for offers
POST /api/shout-outs/:id/offers/:offerId/accept → Accept offer

Vendor Flow:
GET /api/vendors/shout-outs → List available requests
GET /api/vendors/shout-outs/:id/reply → Get request details
POST /api/vendors/shout-outs/:id/reply → Submit offer
```

### Component Architecture
```
SearchPage
├── AdvancedSearch (enhanced)
└── SearchResults
    └── ShoutOutFlow (when no results)
        ├── ShoutOutConsentModal
        └── ShoutOutOffers

Vendor Dashboard
├── ShoutOutDashboard
├── ShoutOutCard
└── ShoutOutResponseModal
```

## 🚀 Features

### Privacy & Security
- **Coarse location sharing** - Vendors only see general area and service type
- **Explicit consent required** - Users must opt-in to shout-outs
- **Auto-expiry** - Requests expire after 30 minutes
- **RLS policies** - Database-level security

### Vendor Experience
- **Opt-in system** - Vendors control shout-out participation
- **Distance-based filtering** - Only relevant vendors notified
- **Rich offer creation** - Custom pricing, time slots, messages
- **Dashboard integration** - Centralized shout-out management

### Customer Experience  
- **Accessible modal** - WCAG compliant with focus management
- **Real-time updates** - Live offer polling
- **Smart ranking** - Offers scored by distance, rating, price
- **Fallback options** - Radius expansion when no offers received

### Performance
- **PostGIS integration** - Efficient geospatial queries
- **Proper indexing** - Optimized database performance
- **Caching-ready** - API responses suitable for caching
- **Pagination support** - Scalable vendor listings

## 📱 User Flows

### Customer Journey
1. **Search** → No results found
2. **Consent Modal** → User reviews shout-out explanation
3. **Opt-in** → User clicks "Yes, Send Shout-Out"
4. **Waiting** → Real-time polling for vendor offers
5. **Offers** → Review vendor responses with details
6. **Accept** → Choose offer and create booking
7. **Fallback** → Expand radius if no offers received

### Vendor Journey
1. **Dashboard** → View available shout-out requests
2. **Review** → See customer requirements and location
3. **Respond** → Create offer with pricing and availability
4. **Track** → Monitor offer status and outcomes

## 🔧 Technical Implementation

### Key Components

#### ShoutOutConsentModal.tsx
- Accessible modal with ARIA compliance
- Focus trap and keyboard navigation
- Detailed explanation of privacy and process

#### ShoutOutOffers.tsx
- Real-time offer display with auto-refresh
- Vendor cards with ratings, distance, pricing
- Time-remaining countdown with expiry handling

#### ShoutOutFlow.tsx
- Orchestrates the complete customer flow
- Handles state management and navigation
- Integrates with booking system

#### useShoutOut.ts
- Custom hook for shout-out operations
- Error handling and loading states
- Type-safe API interactions

### API Endpoints

#### Customer Endpoints
- **POST /api/shout-outs** - Create new shout-out request
- **GET /api/shout-outs/:id/offers** - Get ranked vendor offers
- **POST /api/shout-outs/:id/offers/:offerId/accept** - Accept offer

#### Vendor Endpoints
- **GET /api/vendors/shout-outs** - List available requests
- **GET /api/vendors/shout-outs/:id/reply** - Get request details
- **POST /api/vendors/shout-outs/:id/reply** - Submit offer response

### Database Functions
- **find_eligible_vendors()** - PostGIS-based vendor discovery
- **expire_old_shout_outs()** - Automated cleanup
- **calculate_offer_score()** - Multi-factor ranking algorithm

## 🧪 Testing

### Playwright Test Coverage
- ✅ Consent modal accessibility (WCAG compliance)
- ✅ Focus management and keyboard navigation
- ✅ Shout-out creation and vendor notification
- ✅ Offer display and acceptance workflows
- ✅ Error handling and edge cases
- ✅ Vendor response and dashboard features
- ✅ Complete end-to-end user journeys

### Test Files
- `packages/pw-tests/tests/shout-out-flow.spec.ts` - Comprehensive E2E tests

## 📊 Performance Considerations

### Database Optimization
- **Spatial indexing** with PostGIS GIST
- **Composite indexes** on frequently queried columns
- **Efficient queries** with proper JOINs and filtering

### Frontend Performance
- **Debounced polling** to reduce API calls
- **Optimistic updates** for better UX
- **Code splitting** for reduced bundle size

### Scalability
- **Pagination** for large vendor lists
- **Caching opportunities** at API level
- **Background job** potential for notifications

## 🚀 Shout-Out v1.5: Power-Up Features

The system has been enhanced with three major power-ups that feel native to the core implementation:

### ✅ 1. Metrics Hook (Conversion, Response Time, Resolution %)

**Database Additions:**
- `shout_out_metrics` table tracks key events (created, offer_sent, offer_accepted, expired)
- Automated views for conversion rate, response time, and resolution percentage
- Helper functions for easy metric recording

**React Integration:**
- `useShoutOutMetrics()` hook with SWR for real-time data
- Admin dashboard displays conversion rate, avg response time, resolution %
- Auto-refreshing metrics with 30-second intervals

**API Endpoints:**
- `GET /api/shout-outs/metrics` - Returns aggregated metrics for admins
- Metrics automatically recorded on all shout-out events

### ✅ 2. Admin Operations Toggle

**Database Config:**
- `shout_out_config` singleton table for system-wide settings
- Configurable default radius, expiry time, min/max radius limits
- System enable/disable toggle

**Admin Interface:**
- `/admin/shout-outs` page with metrics dashboard and configuration
- Real-time config updates with validation
- Visual feedback for save operations

**API Integration:**
- `GET /api/shout-outs/config` - Public config access
- `POST /api/admin/shout-outs/config` - Admin-only config updates
- Existing system respects configuration automatically

### ✅ 3. Notification Pipeline (Vendor Alerts)

**Database Queue:**
- `shout_out_notifications` table for multi-channel delivery
- Support for in-app, email, and SMS notifications
- Vendor preference tracking for notification channels

**Real-time Notifications:**
- `useVendorShoutOutNotifications()` hook with Supabase real-time
- Browser notifications with permission management
- Toast notifications with auto-dismiss and action buttons

**Background Processing:**
- `POST /api/notifications/shout-outs/process` for batch processing
- Email/SMS integration points for production services
- Notification status tracking and retry logic

### Integration Points

**Automatic Event Recording:**
- Shout-out creation → metrics + notifications
- Vendor responses → metrics tracking
- Offer acceptance → conversion metrics

**Configuration-Driven:**
- Expiry times use config values
- Radius limits respect admin settings
- System can be globally disabled

**Real-time Experience:**
- Vendors get instant notifications
- Metrics update in real-time
- Configuration changes apply immediately

## 🔮 Future Enhancements

### Phase 3 Features
- **Advanced filtering** by price range, availability
- **Vendor reputation** scoring system
- **Calendar sync** for vendor availability
- **Payment processing** for commitment fees

## 🚦 Configuration

### Environment Variables
```env
# PostGIS/Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Real-time features
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Feature Flags
```typescript
// Vendor opt-in setting
shout_out_opt_in: boolean // In users table

// Configurable timeouts
SHOUT_OUT_EXPIRY_MINUTES=30
OFFER_REFRESH_INTERVAL=10000
```

## 📋 Migration Guide

### Database Migration
```bash
# Apply the shout-out schema
supabase migration new shout_out_system
supabase db push
```

### Component Integration
```typescript
// Replace existing search results component
import SearchResults from '@/components/SearchResults'
import SearchPage from '@/components/SearchPage'

// Or integrate with existing search
import ShoutOutFlow from '@/components/ShoutOutFlow'
```

## 🎨 UI/UX Highlights

### Accessibility
- **WCAG 2.1 AA compliant** modal design
- **Screen reader optimized** with proper ARIA labels
- **Keyboard navigation** with focus trapping
- **High contrast** color schemes

### Visual Design
- **Consistent branding** with existing Bookiji design
- **Responsive layout** for mobile and desktop
- **Loading states** and progress indicators
- **Error boundaries** with graceful degradation

### User Experience
- **Clear value proposition** in consent modal
- **Progressive disclosure** of information
- **Actionable CTAs** at every step
- **Fallback options** when flows don't complete

## 🏆 Summary

The Shout-Out system successfully implements all requirements plus v1.5 power-ups:

### Core System (v1.0)
✅ **Explicit user consent** with accessible modal
✅ **Privacy protection** with coarse location sharing  
✅ **Auto-expiry** after 30-60 minutes
✅ **Never leaves users at dead end** - always actionable
✅ **Modular TypeScript** implementation
✅ **Easy integration** with existing Bookiji app
✅ **Comprehensive testing** with Playwright
✅ **PostGIS geospatial** queries for vendor discovery
✅ **Vendor dashboard** for offer management
✅ **Complete booking** integration

### Power-Ups (v1.5)
✅ **Metrics tracking** with conversion, response time, resolution analytics
✅ **Admin operations** toggle with system-wide configuration
✅ **Real-time notifications** pipeline with multi-channel delivery
✅ **Native integration** - feels like original system, not bolted-on
✅ **Production-ready** with proper error handling and fallbacks

### New Files Added (v1.5)
**Database:**
- `supabase/migrations/20250818212111_shout_out_metrics_and_config.sql`

**Types & Hooks:**
- `src/types/shout-out-metrics.ts`
- `src/hooks/useShoutOutMetrics.ts`
- `src/hooks/useShoutOutConfig.ts`
- `src/hooks/useVendorShoutOutNotifications.ts`

**API Endpoints:**
- `src/app/api/shout-outs/metrics/route.ts`
- `src/app/api/shout-outs/config/route.ts`
- `src/app/api/admin/shout-outs/config/route.ts`
- `src/app/api/notifications/shout-outs/process/route.ts`

**Components:**
- `src/app/admin/shout-outs/page.tsx` - Admin dashboard
- `src/components/vendor/VendorNotificationToast.tsx` - Real-time notifications

The implementation is production-ready and can be deployed immediately to enhance the Bookiji platform's ability to connect customers with vendors when traditional search falls short. The v1.5 power-ups provide operational visibility and control that scale with business growth.
