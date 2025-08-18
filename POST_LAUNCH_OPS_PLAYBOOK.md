# 🚀 Post-Launch Ops Playbook

*Your 1-pager guide to running Mission Control without context*

## 📊 **SLOs & Budgets (Production)**

### **Availability**
- **Target**: 99.9% monthly uptime
- **Monitoring**: 15-minute canary checks via `monitor-prod.yml`

### **Success Rates**
- **$1 Flow**: >99.5% (1h), >99.9% (24h)
- **Payment Processing**: >99.9% webhook delivery success

### **Performance Budgets**
- **Homepage**: p95 < 2.0s
- **Key APIs**: p95 < 400-700ms
- **Load Testing**: k6 p95 < 700ms, error rate <0.5%

## 🚨 **Alert Policy (Keep It Quiet)**

### **Two-Strike Rule**
- **Page only after**: 2 consecutive canary failures OR 3 cycles of p95 breach
- **Primary channel**: `#ops` (high priority)
- **Secondary**: `#eng` (heads-up only)

## 👀 **What to Watch (T+0 → T+90)**

### **Real-Time Dashboards**
- **Synthetics**: pass/fail + p95 trend
- **Health Check**: `/api/health` status OK, DLQ=0
- **Stripe Webhooks**: 200 deliveries, no retries
- **Error Rate**: 5xx < 0.5%, scan logs by `X-Request-ID`
- **Ads CSP**: no violations; CLS stable where ads render

## 🔧 **Common Toggles (Environment/Flags)**

### **AdSense Control**
```bash
# Production: ads approval off
NEXT_PUBLIC_ADSENSE_APPROVAL_MODE=false

# Emergency: global ad kill (keeps layout fixed)
NEXT_PUBLIC_ADSENSE_GLOBAL_OFF=true
```

### **SEO & Indexing**
```bash
# Preview only: no indexing
X-Robots-Tag: noindex, nofollow

# Production: must be clean (no headers)
```

### **Payments**
```bash
# Production: bypass off, signed webhooks only
ENABLE_TEST_WEBHOOK_BYPASS=false
```

## 🏃‍♂️ **Runbooks (Fast Paths)**

### **A) Payments Weirdness**

#### **Stripe Webhook Issues**
```bash
# Check webhook deliveries (should be 200)
Stripe Dashboard → Webhooks → Check deliveries

# Search logs by X-Request-ID from Stripe event
grep "X-Request-ID: <stripe-event-id>" logs/
```

#### **Duplicate/Replay Handling**
- **Duplicate?** `payments_processed_events` table no-ops replays; safe to ignore
- **Booking didn't flip?** Retry handling for event ID; if already confirmed, it's idempotent by design

### **B) Performance Breach (p95 > Budget)**

#### **Quick Diagnosis**
```bash
# Confirm with k6 quick run
k6 run load/k6-booking.js --vus 10 --duration 30s

# Check recent deploy for suspect changes
git log --oneline -10
```

#### **Rollback Actions**
```bash
# Rollback to previous deployment
vercel promote <previous-deployment-url>

# Force rebuild without cache
vercel deploy --prod --force

# Inspect slow endpoint logs
grep "Server-Timing\|X-Request-ID" logs/ | tail -50
```

### **C) Ads/CSP Issues**

#### **Diagnosis**
```bash
# Preview CSP report-only feed
curl -H "Content-Security-Policy-Report-Only: ..." /preview

# Verify nonce present, hosts whitelisted
grep "nonce=" src/**/*.tsx
```

#### **Emergency Response**
```bash
# Set global ad kill (prevents CLS)
NEXT_PUBLIC_ADSENSE_GLOBAL_OFF=true

# Fix CSP, then re-enable
NEXT_PUBLIC_ADSENSE_GLOBAL_OFF=false
```

### **D) SEO Slip (Accidental noindex/canonical drift)**

#### **Quick Checks**
```bash
# Verify no noindex headers in production
curl -I https://bookiji.com/ | grep -i x-robots-tag

# Check sitemap for vercel.app URLs
curl https://bookiji.com/sitemap.xml | grep vercel.app

# Validate vendor page canonical
curl https://bookiji.com/vendor/sample | grep canonical
```

#### **JSON-LD Validation**
- **Vendor page**: canonical → `https://bookiji.com/...`
- **@id**: must end with `#identity`
- **Schema**: validate at [Google Rich Results Test](https://search.google.com/test/rich-results)

## 🔄 **Roll Forward/Back**

### **Deployment Commands**
```bash
# Promote preview → production
vercel promote <preview-deployment-url>

# Force rebuild (no cache)
vercel deploy --prod --force

# Purge CDN/data cache (not build)
vercel cache purge
```

## ✅ **First 24 Hours Checklist**

- [ ] **Synthetics**: Green continuous 24h
- [ ] **Stripe Webhooks**: Stable (no retries)
- [ ] **k6 Nightly**: Passes thresholds
- [ ] **Visual Regression**: PR diffs reviewed/approved
- [ ] **Search Console**: 
  - [ ] No preview hosts indexed
  - [ ] `ads.txt` reachable
  - [ ] `robots.txt` shows `Mediapartners-Google allow`

## 📅 **Weekly Cadence**

- [ ] **Dependabot**: npm + Actions bumps reviewed
- [ ] **Playwright/k6**: Minor version updates
- [ ] **Database**: `pg_cron` job status check
  ```sql
  SELECT * FROM cron.job_run_details 
  WHERE jobid = (SELECT jobid FROM cron.job WHERE command LIKE '%cleanup_payments_processed_events%')
  ORDER BY start_time DESC LIMIT 1;
  ```
- [ ] **Screenshots**: Refresh if UI changed intentionally
- [ ] **Performance**: Budgets reviewed against last 7 days

## 🚨 **Emergency Contacts**

- **Primary**: @patri (Engineering Lead)
- **Secondary**: DevOps team
- **Escalation**: CTO/VP Engineering

## 📚 **Quick Reference**

### **Key URLs**
- **Health Check**: `/api/health`
- **Stripe Dashboard**: [dashboard.stripe.com](https://dashboard.stripe.com)
- **Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)
- **GitHub Actions**: [github.com/patri/bookijibck/actions](https://github.com/patri/bookijibck/actions)

### **Key Commands**
```bash
# Check deployment status
vercel ls

# View recent logs
vercel logs

# Check database health
supabase status
```

---

**🎯 You're launch-ready and wake-up-at-3am-proof.**

*Last updated: Launch Day* 🚀
