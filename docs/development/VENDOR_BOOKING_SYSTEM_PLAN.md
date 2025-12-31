# Vendor Booking System (P3 - Go-to-Market) Implementation Plan

## Overview
Implement the Vendor Booking System to enable vendor-first positioning, subscription lifecycle, payment-free vendor booking flows, and hardened vendor UX for daily standalone use.

## Current Status
- ✅ Vendor pricing page exists (`/vendor/pricing`)
- ✅ Vendor metrics dashboard exists
- ✅ Scheduling health badge and certification system
- ✅ Basic vendor onboarding flow
- ❌ Vendor subscription lifecycle not implemented
- ❌ Payment-free vendor booking flows not enforced
- ❌ Vendor-first positioning not complete
- ❌ Vendor UX needs hardening for daily use

## Phase 1: Vendor Subscription Lifecycle

### 1.1 Database Schema
**Migration file:** `supabase/migrations/[timestamp]_vendor_subscriptions.sql`

**Tables to create:**
1. `vendor_subscriptions`
   - `id`, `vendor_id`, `plan_type` (free, basic, pro, enterprise)
   - `status` (trial, active, cancelled, expired)
   - `billing_cycle` (monthly, annual)
   - `current_period_start`, `current_period_end`
   - `trial_end`, `cancel_at_period_end`
   - `stripe_subscription_id`, `stripe_customer_id`
   - `created_at`, `updated_at`

2. `vendor_subscription_features`
   - Track feature access per subscription tier
   - Features: booking_limit, calendar_sync, analytics_access, etc.

3. Update `profiles` table:
   - Add `subscription_status`, `subscription_tier`

### 1.2 Subscription Management API
**Files to create:**
- `src/app/api/vendor/subscription/create/route.ts`
- `src/app/api/vendor/subscription/update/route.ts`
- `src/app/api/vendor/subscription/cancel/route.ts`
- `src/app/api/vendor/subscription/status/route.ts`

### 1.3 Subscription UI
**Files to create:**
- `src/app/vendor/dashboard/subscription/page.tsx`
- `src/components/vendor/SubscriptionStatus.tsx`
- `src/components/vendor/SubscriptionPlans.tsx`

## Phase 2: Payment-Free Vendor Booking Flows

### 2.1 Enforce Payment-Free for Vendors
**Files to modify:**
- `src/lib/bookingEngine.ts`
- `src/app/api/bookings/create/route.ts`
- `src/app/api/bookings/confirm/route.ts`

### 2.2 Vendor Booking Interface
**Files to create:**
- `src/app/vendor/bookings/create/page.tsx`
- `src/components/vendor/CreateBookingForm.tsx`
- `src/app/api/vendor/bookings/create/route.ts`

## Phase 3: Vendor-First Positioning

### 3.1 Update Marketing
**Files to modify:**
- `README.md`
- `src/app/page.tsx`
- `src/app/vendor/pricing/page.tsx`

### 3.2 Vendor Onboarding Enhancement
**Files to modify:**
- `src/app/vendor/onboarding/page.tsx`
- `src/components/vendor/OnboardingFlow.tsx`

## Phase 4: Vendor UX Hardening

### 4.1 Daily Standalone Use Features
**Files to create:**
- `src/app/vendor/bookings/page.tsx`
- `src/app/vendor/calendar/page.tsx`
- `src/app/vendor/customers/page.tsx`
- `src/app/vendor/analytics/page.tsx`

### 4.2 Vendor Notifications
**Files to create:**
- `src/app/api/vendor/notifications/route.ts`
- `src/components/vendor/NotificationSettings.tsx`

## Phase 5: Vendor Expectation Communication

### 5.1 Vendor Communication System
**Files to create:**
- `src/app/vendor/communications/page.tsx`
- `src/components/vendor/CommunicationTemplates.tsx`

### 5.2 Vendor Settings
**Files to create:**
- `src/app/vendor/settings/page.tsx`

## Implementation Timeline

**Week 1:** Subscription foundation (schema, API, basic UI)
**Week 2:** Payment-free flows and vendor booking interface
**Week 3:** Vendor-first positioning and onboarding
**Week 4:** UX hardening and daily use features

## Success Criteria

- ✅ Vendors can subscribe and manage subscriptions
- ✅ Vendors can create bookings without payment
- ✅ Marketing reflects vendor-first positioning
- ✅ Vendor UX supports daily standalone use
- ✅ All features mobile-responsive
