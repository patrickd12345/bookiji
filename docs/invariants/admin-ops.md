# Admin & Operations Invariants

## INV-1: Admin-Only Actions
**Rule**: Admin actions must require admin role verification.

**FAIL Condition**:
- Non-admin user performs admin action
- Admin check bypassed or missing
- Role check uses client-provided value

**Allowed Behavior**:
- Admin endpoints check `profiles.role='admin'` via server-side query
- RLS policies enforce admin-only access
- Client cannot bypass admin checks

**Enforcement**: 
- RLS policies on admin tables
- Runtime check in admin endpoints: `assertAdminAuth()`
- Database function to verify admin role

---

## INV-2: Audit Trail for Admin Actions
**Rule**: All admin actions must be logged to audit log.

**FAIL Condition**:
- Admin action without audit log entry
- Missing `admin_id`, `action`, or `timestamp` in audit log

**Allowed Behavior**:
- Admin action → audit log insert (atomic or immediately after)
- Audit log includes: `admin_id`, `action`, `target`, `timestamp`, `reason`

**Enforcement**: 
- Database trigger on admin actions
- Runtime assertion in admin endpoints
- Audit log table with required fields

---

## INV-3: System Flag Changes Require Reason
**Rule**: System flag changes must include reason (min 10 characters).

**FAIL Condition**:
- System flag changed without reason
- Reason shorter than 10 characters
- Reason missing from audit log

**Allowed Behavior**:
- System flag update requires `reason` field (min 10 chars)
- Reason stored in `system_flags.reason` and audit log

**Enforcement**: 
- Database CHECK constraint: `reason IS NOT NULL AND length(reason) >= 10`
- Runtime validation in admin API
- Static check: Admin endpoints require reason parameter

---

## INV-4: Kill Switch Fail-Open Default
**Rule**: Missing or unreadable kill switch flag defaults to enabled (fail-open).

**FAIL Condition**:
- Kill switch read error causes system deadlock
- Missing flag row disables system incorrectly

**Allowed Behavior**:
- Flag missing → treated as enabled
- DB read error → treated as enabled (with log)
- Only explicit `false` value disables system

**Enforcement**: 
- `assertSchedulingEnabled()` fails open on error
- Error logging but no exception thrown
- Explicit `false` required to disable

---

## INV-5: No Bypass of Kill Switches
**Rule**: Kill switches cannot be bypassed by client or alternate code paths.

**FAIL Condition**:
- Client bypasses kill switch check
- Alternate endpoint bypasses kill switch
- Direct database update bypasses kill switch

**Allowed Behavior**:
- All booking confirmation paths call `assertSchedulingEnabled()`
- Webhooks intentionally bypass (to process in-flight operations)
- No client-side kill switch checks

**Enforcement**: 
- Authoritative path: `src/lib/guards/schedulingKillSwitch.ts`
- Static check: All booking endpoints import and call guard
- Runtime assertion throws 503 on violation

---

## INV-6: Idempotent Admin Actions
**Rule**: Duplicate admin action requests must not cause duplicate effects.

**FAIL Condition**:
- Same admin action processed twice
- Duplicate system flag changes

**Allowed Behavior**:
- Idempotency key used for admin actions
- Check existing state before applying change
- Duplicate request → no-op or error

**Enforcement**: 
- Idempotency check in admin endpoints
- Database unique constraint on `(admin_id, action, idempotency_key)`

---

## INV-7: Admin Action Authorization Chain
**Rule**: Admin actions must verify authorization at every layer (API, RLS, function).

**FAIL Condition**:
- API check passes but RLS blocks (inconsistent)
- Function called without authorization check

**Allowed Behavior**:
- API endpoint checks admin role
- RLS policy enforces admin-only access
- Database function verifies admin role

**Enforcement**: 
- Multi-layer authorization checks
- RLS policies as final enforcement
- Runtime assertions in all layers












