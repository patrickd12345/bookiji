# Incident Severity Model

This document defines how Bookiji classifies incidents.
Severity determines urgency, communication, and response expectations.

## SEV-0 — Informational
**Definition**
- No user impact
- No data risk
- No money risk

**Examples**
- Background job retries
- Non-critical alerts
- Minor UI glitch with workaround

**Response**
- No immediate action required
- Log and review during normal work

---

## SEV-1 — User Impact
**Definition**
- Users cannot complete a core action
- Partial outage or degraded experience
- No data loss

**Examples**
- Booking creation failing
- Scheduling UI unavailable
- Payments blocked but no charges lost

**Response**
- Acknowledge within 15 minutes
- Mitigate as soon as possible
- Incident Commander assigned

---

## SEV-2 — System Degradation
**Definition**
- System still functioning
- High error rates or latency
- Risk of escalation to SEV-1

**Examples**
- Elevated API latency
- Partial third-party outage
- Queue backlogs growing

**Response**
- Acknowledge within 30 minutes
- Monitor continuously
- Prepare mitigation

---

## SEV-3 — Data / Money / Trust Risk
**Definition**
- Data corruption or loss
- Incorrect charges or refunds
- Security or privacy exposure

**Examples**
- Double charges
- Incorrect payouts
- Auth or access control failure

**Response**
- Immediate action required
- Incident Commander mandatory
- All changes frozen until resolved

---

## Severity Rule
If unsure, choose the **higher severity**.
Downgrading later is always acceptable.





















