# Privacy Policy

Bookiji is committed to protecting your data. This document explains what we collect, how we store it, and your rights as a user.

## What We Collect
- **Account Information** such as email and name provided during signup.
- **Booking Details** including appointment time, location, and preferences.
- **Usage Data** like device type and language for localization.
- **Analytics Events** tracking interactions across the platform.

## How We Store Data
- Core data is stored in our Supabase database.
- Analytics data lives in dedicated tables like `analytics_events` and `conversion_funnels` described in [ANALYTICS_IMPLEMENTATION_COMPLETE.md](../ANALYTICS_IMPLEMENTATION_COMPLETE.md).
- We use PostHog and Hotjar integrations from `src/lib/analytics.ts` to collect events and feedback.

## Your Rights
- **Access & Export:** You may request a copy of your data at any time.
- **Deletion:** Email support@bookiji.com to remove your account and associated analytics events.
- **Opt-Out:** Disable cookies or send "Do Not Track" headers to limit analytics tracking.

We update this policy as new features launch. For detailed analytics implementation notes, see [ANALYTICS_IMPLEMENTATION_COMPLETE.md](../ANALYTICS_IMPLEMENTATION_COMPLETE.md).

