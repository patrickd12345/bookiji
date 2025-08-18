# 🚀 Bookiji Launch Cutover Checklist

## Final Cutover Timeline (T-60 → T+90)

### T-60 min — Freeze & Prime

#### 1. Tag Release
```bash
git tag -a v1.0.0 -m "Launch"
git push origin v1.0.0
```

#### 2. Verify Production Secrets/Env in Vercel
- [ ] `STRIPE_SECRET_KEY` (production key)
- [ ] `STRIPE_WEBHOOK_SECRET` (production webhook)
- [ ] Database credentials (Supabase)
- [ ] `CANONICAL_HOST=bookiji.com`
- [ ] `NEXT_PUBLIC_ADSENSE_APPROVAL_MODE=false`

#### 3. Confirm Branch Protection
- [ ] Required checks = Visual Regression
- [ ] Required checks = Synthetics (Prod)
- [ ] Required checks = Load Testing
- [ ] Required checks = Security

### T-30 min — Dress Rehearsal Ping

#### 1. Run Signed Dress Rehearsal (Bypass OFF)
```bash
# Trigger manually in GitHub Actions
# Or run locally with production keys
npx playwright test tests/perf/booking.spec.ts \
  --env BASE_URL=https://<preview-url> \
  --env ENABLE_TEST_WEBHOOK_BYPASS=false
```

#### 2. Confirm Success
- [ ] Booking flips → confirmed
- [ ] `commitment_fee_paid=true`
- [ ] Stripe dashboard shows 200 deliveries

#### 3. Sanity Curl Checks
```bash
# Preview should have noindex
curl -I https://<preview>/ | grep -i x-robots-tag
# Should show: X-Robots-Tag: noindex, nofollow

# Production ads.txt should be valid
curl -s https://bookiji.com/ads.txt | grep pub-
# Should show: google.com, pub-XXXXXXXXXX
```

### T-10 min — Canary Greenlight

#### 1. Check Scheduled Synthetics (Last 30-60 min)
- [ ] Zero red alerts
- [ ] Homepage p95 < 2.0s
- [ ] APIs p95 < 400-700ms
- [ ] Two-strike rule quiet

### T-0 — Promote

#### 1. Promote Preview → Production
```bash
# Option A: Vercel Dashboard
# Promote preview deployment to production

# Option B: CLI
vercel promote <preview-deployment-url>

# Option C: Force clean rebuild if needed
vercel deploy --prod --force
```

### T+5 min — Smoke Test

#### 1. Health Check
```bash
curl https://bookiji.com/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

#### 2. Vendor Page Source Verification
```bash
curl -s https://bookiji.com/vendor/sample | grep -E "(canonical|@type|@id)"
# Expected:
# <link rel="canonical" href="https://bookiji.com/vendor/sample">
# "@type": "ProfessionalService"
# "@id": "https://bookiji.com/vendor/sample#identity"
```

#### 3. Homepage Ad Slot Check
- [ ] No ad slot visible (approval mode off)
- [ ] No console errors related to ads

### T+15 → T+90 — Observe & Monitor

#### 1. Synthetic Monitoring
- [ ] Two-strike alerts remain quiet
- [ ] All health checks passing
- [ ] Performance within budgets

#### 2. Stripe Verification
- [ ] 200 deliveries (no 4xx/5xx)
- [ ] No retries triggered
- [ ] Webhook endpoint active

#### 3. Load Test Sanity Check
```bash
# Quick k6 sanity ramp
k6 run load/k6-booking.js \
  -e BASE_URL=https://bookiji.com \
  -e TEST_SERVICE_ID=<your_test_service_id> \
  --duration 2m \
  --vus 10
```
- [ ] p95 < 700ms maintained
- [ ] Error rate < 0.5%
- [ ] No performance degradation

#### 4. Log Monitoring
- [ ] Spot-check any 5xx errors
- [ ] Use X-Request-ID trail for debugging
- [ ] Monitor Server-Timing headers

## 🚨 Rollback & Recovery Procedures

### Immediate Rollback
```bash
# Rollback to last good deployment
vercel promote <previous-deployment-url>

# Force rebuild without cache if needed
vercel deploy --prod --force
```

### Stripe Webhook Issues
- [ ] Keep endpoint active (don't delete)
- [ ] Duplicate-event guard will no-op safely
- [ ] Check webhook secret configuration

### Performance Issues
- [ ] Scale resources if needed
- [ ] Check recent code changes
- [ ] Verify external dependencies

## 🎯 Last-Mile Wins (Optional, Fast)

### 1. ICS Strictness Enhancement
```typescript
// In your existing ICS generator
const icsContent = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Bookiji//Booking Calendar//EN',
  // ... rest of calendar content
  'END:VCALENDAR'
].join('\r\n');
```

### 2. Rebook Idempotency Test
```typescript
// Add to your Playwright tests
test('double-click booking creates single booking', async ({ page }) => {
  // Simulate double-click
  await page.getByTestId('book-now-btn').dblclick();
  
  // Assert only one booking created
  const bookings = await page.locator('[data-testid="booking-item"]').count();
  expect(bookings).toBe(1);
});
```

### 3. robots.txt Enhancement
```txt
# public/robots.txt
User-agent: *
Allow: /

User-agent: Mediapartners-Google
Disallow:

Sitemap: https://bookiji.com/sitemap.xml
```

## ✅ Pre-Launch Verification Checklist

### Infrastructure
- [ ] Vercel production environment configured
- [ ] Supabase production database ready
- [ ] Stripe production keys active
- [ ] Domain DNS pointing to production
- [ ] SSL certificates valid

### Monitoring
- [ ] Synthetic monitors configured
- [ ] Alert webhooks tested
- [ ] Performance budgets set
- [ ] Load testing thresholds configured
- [ ] Visual regression baselines established

### Security
- [ ] Preview routes have noindex headers
- [ ] Production routes properly indexed
- [ ] Admin guards active
- [ ] Rate limiting configured
- [ ] CORS policies set

### Testing
- [ ] All Playwright tests passing
- [ ] k6 load tests within budget
- [ ] Visual regression tests stable
- [ ] Security tests passing
- [ ] Dress rehearsal successful

## 🎉 Launch Success Criteria

### Go/No-Go Gates (ALL must be true)
- [ ] Visual regression tests stable
- [ ] Synthetics green for 24h continuous
- [ ] k6 performance within budget
- [ ] Dress rehearsal passes
- [ ] Webhook delivery verified

### Performance Targets
- [ ] Homepage: p95 < 2.0s, p99 < 3.5s
- [ ] APIs: p95 < 400-700ms, p99 < 1.2s
- [ ] $1 flow success: > 99.5% rolling 1h
- [ ] Availability: 99.9% monthly

## 🚀 Launch Command Sequence

```bash
# T-60: Tag and verify
git tag -a v1.0.0 -m "Launch"
git push origin v1.0.0

# T-30: Dress rehearsal
# Run in GitHub Actions or locally

# T-0: Promote
vercel promote <preview-url>

# T+5: Smoke test
curl https://bookiji.com/api/health

# T+15: Monitor
# Watch synthetic monitors and logs
```

## 📊 Post-Launch Metrics

### First Hour
- [ ] Zero synthetic failures
- [ ] All performance budgets met
- [ ] No 5xx errors
- [ ] Stripe webhooks 200

### First Day
- [ ] 24h uptime maintained
- [ ] Performance trends stable
- [ ] User feedback positive
- [ ] No critical issues

### First Week
- [ ] Performance budgets maintained
- [ ] Visual regression stable
- [ ] Load testing within thresholds
- [ ] Business metrics tracking

---

**You're go for PADO (Powered Ascent, Descent, and Orbit).** 🛰️

The system is fully instrumented, the budgets are tight, and the safety nets are comprehensive. The big red "Promote" button will feel boring—in the good way. 🎯✨
