# Service Level Objectives (SLOs) - Bookiji

**Last Updated:** January 27, 2025  
**Review Frequency:** Monthly

## Overview

This document defines Service Level Objectives (SLOs) for Bookiji's critical services. SLOs are targets for service reliability and performance that we commit to maintaining.

## SLO Definitions

### 1. Booking Service Availability

**SLO:** 99.9% availability (uptime)

**Measurement:**
- Availability = (Total Time - Downtime) / Total Time
- Downtime includes any period where booking creation/confirmation fails for > 1% of requests
- Measured over rolling 30-day window

**Current Status:** ✅ Meeting SLO

**Monitoring:**
- Endpoint: `/api/bookings/create`
- Alert threshold: < 99.5% availability over 1 hour
- Escalation: SEV-1 if < 99% over 15 minutes

---

### 2. Payment Processing Latency

**SLO:** 95% of payment intents processed within 2 seconds

**Measurement:**
- P95 latency for `/api/stripe/webhook` processing
- Measured from webhook receipt to database commit
- Excludes external Stripe API latency

**Current Status:** ✅ Meeting SLO

**Monitoring:**
- Metric: `payment_processing_latency_p95`
- Alert threshold: P95 > 3 seconds over 5 minutes
- Escalation: SEV-2 if P95 > 5 seconds

---

### 3. API Response Time

**SLO:** 95% of API requests complete within 500ms

**Measurement:**
- P95 response time across all API endpoints
- Measured at application level (excluding network latency)
- Excludes `/api/cron/*` endpoints

**Current Status:** ✅ Meeting SLO

**Monitoring:**
- Metric: `api_response_time_p95`
- Alert threshold: P95 > 750ms over 5 minutes
- Escalation: SEV-2 if P95 > 1 second

---

### 4. Database Query Performance

**SLO:** 99% of database queries complete within 100ms

**Measurement:**
- P99 query execution time
- Measured at Supabase level
- Includes all query types (SELECT, INSERT, UPDATE)

**Current Status:** ✅ Meeting SLO

**Monitoring:**
- Metric: `db_query_latency_p99`
- Alert threshold: P99 > 200ms over 5 minutes
- Escalation: SEV-2 if P99 > 500ms

---

### 5. Notification Delivery

**SLO:** 99% of critical notifications delivered within 5 minutes

**Measurement:**
- Delivery rate for booking confirmations, reminders, cancellations
- Measured from notification trigger to delivery confirmation
- Excludes user preference blocks (e.g., quiet hours)

**Current Status:** ✅ Meeting SLO

**Monitoring:**
- Metric: `notification_delivery_rate`
- Alert threshold: < 95% delivery rate over 1 hour
- Escalation: SEV-2 if < 90% over 15 minutes

---

### 6. Error Rate

**SLO:** < 0.1% error rate (5xx errors)

**Measurement:**
- Error rate = (5xx responses) / (Total responses)
- Measured across all API endpoints
- Excludes client errors (4xx)

**Current Status:** ✅ Meeting SLO

**Monitoring:**
- Metric: `api_error_rate`
- Alert threshold: > 0.5% error rate over 5 minutes
- Escalation: SEV-1 if > 1% over 1 minute

---

## SLO Dashboard

SLO metrics are tracked in:
- **Vercel Analytics** - API performance and error rates
- **Sentry** - Error monitoring and alerting
- **Supabase Dashboard** - Database performance
- **Custom Dashboards** - SLO-specific metrics

## SLO Review Process

1. **Monthly Review:**
   - Review SLO compliance for previous month
   - Identify trends and potential issues
   - Update SLOs if business requirements change

2. **Incident Response:**
   - When SLO is breached, follow incident response process
   - Document root cause and remediation
   - Update SLO if breach indicates unrealistic target

3. **Continuous Improvement:**
   - Set stretch goals for SLO improvement
   - Invest in infrastructure to improve SLOs
   - Document learnings and best practices

## SLO Targets by Priority

### P0 (Critical - Must Meet)
- Booking Service Availability (99.9%)
- Payment Processing Latency (P95 < 2s)
- Error Rate (< 0.1%)

### P1 (High - Should Meet)
- API Response Time (P95 < 500ms)
- Database Query Performance (P99 < 100ms)

### P2 (Medium - Nice to Meet)
- Notification Delivery (99% within 5min)

## Alerting

SLO breaches trigger alerts via:
- **Jarvis Incident Commander** - For SEV-1 breaches
- **Sentry** - For error rate breaches
- **Vercel Analytics** - For performance breaches
- **Email/SMS** - For critical SLO breaches

## Notes

- SLOs are measured in production only
- Test/staging environments may have different performance characteristics
- SLOs may be adjusted based on business needs and infrastructure capabilities
- All SLO breaches are documented and reviewed

---

**Next Review Date:** February 27, 2025
