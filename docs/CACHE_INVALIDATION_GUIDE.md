# 🚀 Bookiji Cache Management Runbook

This document explains how to monitor, troubleshoot, and operate the **Enterprise-Grade Cache Management System**.

---

## 🔎 Normal Operations

- **Dashboard Location:** `/admin/cache`
- **Key Metrics to Watch:**
  - **Cache Hit Rate:**  
    - Target: ≥30% overall  
    - Target: ≥50% for search queries
  - **Response Times:**  
    - Target: p95 < 500 ms, p99 < 800 ms
  - **Invalidation Rate:**  
    - Target: <20% normal, alert if >35%
- **Auto-Refresh:**  
  - Metrics update every 30 s (can be paused manually).
- **Cache Warming:**  
  - Runs continuously with 5 concurrent workers.  
  - Updates priorities every 5 min based on query popularity.

---

## ⚠️ Warning States

- **Hit Rate Drops:** below 30% overall or 50% search.
- **Latency Spikes:** p95 > 600 ms or p99 > 1 s for 2 consecutive buckets.
- **Invalidation Surge:** rate >35% sustained.
- **Circuit Breaker Triggered:** warming service auto-disabled after 5 failures.

### Actions
1. Check the dashboard **Recommendations tab** for TTL optimization or strategy disablement.
2. Verify invalidation queue is not flooded (`/admin/cache > Queue Length`).
3. If specific queries are failing, check logs for invalidation or refresh errors.

---

## 🚨 Critical States

- **Cache Panic:** Hit rate collapse (<10%) + DB CPU spikes.
- **Stuck Invalidation:** Queue length >100 and not draining.
- **Broken Refresh:** Materialized views failing CONCURRENT REFRESH repeatedly.

### Panic Button Options
- **Invalidate All Cache:** Flush everything immediately.  
- **Stop All Warming:** Cease warming workers instantly.  
- **Reset Circuit Breaker:** Restart warming after cooldown.

After using panic controls:
1. Verify DB load stabilizes.
2. Check logs for error cause.
3. Re-enable warming gradually.

---

## 🔄 Recovery Playbook

1. **Reset the Cache System**
   - Press "Stop All Warming."
   - Use "Invalidate All Cache."
   - Wait 5 minutes for DB load to normalize.

2. **Check System Health**
   - Audit logs in `/admin/cache` → confirm invalidation/deletion events logged.
   - Performance Dashboard → ensure p95 < 500 ms returns within 15 minutes.

3. **Re-Enable Warming**
   - Reset circuit breaker.
   - Start warming service.
   - Verify worker status = healthy.

4. **Validate End-User Experience**
   - Run smoke tests on search queries (e.g. plumber, electrician, cleaning).
   - Confirm specialty tree + analytics dashboards load under 500 ms.

---

## 📊 Daily Checklist

- ✅ Check hit rates (≥30% overall, ≥50% search).  
- ✅ Verify warming service is active and not in breaker state.  
- ✅ Review anomaly alerts (drops/spikes).  
- ✅ Ensure audit logs are complete (no missing admin actions).  

---

## 🛠 Troubleshooting Quick Reference

- **Cache hit rate low but DB idle:** Likely TTL too short → check recommendations tab.  
- **High invalidations:** Vendor updates or specialty changes → verify triggers aren't firing too aggressively.  
- **Frequent circuit breaker trips:** Investigate DB errors (refresh failures, locks). Consider raising pool size or staggering jobs.  
- **Admin dashboard shows errors:** Check RLS policies + session validity.  

---

## 📌 Notes

- **Boundaries:** TTL adjustments are rate-limited to every 6 h with 10–20% bounds.  
- **Safety:** All cache operations are logged with admin ID, IP, and user agent.  
- **Self-Healing:** Warming strategies auto-disable on repeated failure — confirm re-enable manually.  

---

**Status:** Production-ready ✅  
**Owner:** Platform Engineering / Bookiji Core Team  
**SLOs:** p95 < 500 ms, p99 < 800 ms, ≥30% hit rate overall, ≥50% search.
