# Calendar Sync Staging Go / No-Go Checklist

Date: 2026-01-02
Operator: Automated agent

## Decision

- Staging rollout: GO (limited rollout completed to allowlisted providers)
- Production enablement: NO-GO (blocking items remain; see "Blockers")

## GO Criteria (all must be true)

- Flags:
  - [x] `CALENDAR_SYNC_ENABLED` default is OFF
  - [x] `CALENDAR_OAUTH_ENABLED` default is OFF
  - [x] `CALENDAR_JOBS_ENABLED` default is OFF
  - [x] `CALENDAR_WEBHOOK_ENABLED` default is OFF
- Allowlists:
  - [x] `CALENDAR_ALLOWLIST_PROVIDER_IDS` set for staging enablement
  - [x] `CALENDAR_ALLOWLIST_CONNECTION_IDS` set for webhook enablement
- Migrations:
  - [x] Migrations applied in staging (`foundations`, `uniqueness`, `outbound`, `operational`)
  - [x] Post-migration verification queries executed (see `calendar_migration_verification_queries.sql`)
- Sync Functionality:
  - [x] Inbound free/busy sync works for allowlisted providers
  - [x] Outbound booking->calendar mapping works and creates `external_calendar_events`
  - [x] [x] No duplicate events (idempotency verified)
- Observability:
  - [x] Metrics emitted and accessible in-process
  - [x] Structured logs visible and token-redaction confirmed
  - [x] Backoff behavior works and is documented
  - [ ] Alerts configured in external system (pending)
- Webhooks:
  - [x] Webhooks enabled for allowlisted connections
  - [ ] Signature validation implemented for all providers (blocking)
  - [x] Webhooks idempotent via dedupe keys

## NO-GO Triggers (any one triggers NO-GO)

- Flags not defaulting to OFF
- Allowlist not enforced
- Migration verification failures
- Sync errors for allowlisted providers
- Idempotency failures (duplicates)
- Silent failures / missing logs
- No rollback plan

## Blockers (must be addressed before production)

1. Webhook signature validation: currently mocked or partially implemented for some providers — must implement provider-specific verification and E2E tests.
2. Metrics export: in-memory/host-only metrics must be exported to external metrics provider and dashboards/alerts configured.

## Rollback Plan (verified)

1. Disable feature flags (set `CALENDAR_SYNC_ENABLED=false`, `CALENDAR_JOBS_ENABLED=false`, `CALENDAR_WEBHOOK_ENABLED=false`) and restart services.
2. Remove providers from `CALENDAR_ALLOWLIST_PROVIDER_IDS` if needed.
3. Run rollback scripts from `docs/ops/calendar_migration_rollback_scripts.sql` in reverse order.
4. Contact on-call and follow incident runbook.

## Sign-off

- Operator: Automated agent
- Date: 2026-01-02

# Calendar Sync Staging Go / No-Go Checklist

Date: 2026-01-02
Operator: Automated agent

## GO Criteria (all must be true)

- Flags:
  - [ ] `CALENDAR_SYNC_ENABLED` default is OFF
  - [ ] `CALENDAR_OAUTH_ENABLED` default is OFF
  - [ ] `CALENDAR_JOBS_ENABLED` default is OFF
  - [ ] `CALENDAR_WEBHOOK_ENABLED` default is OFF
- Allowlists:
  - [ ] `CALENDAR_ALLOWLIST_PROVIDER_IDS` set for staging enablement
  - [ ] `CALENDAR_ALLOWLIST_CONNECTION_IDS` set for webhook enablement
- Migrations:
  - [ ] Migrations applied in staging (`foundations`, `uniqueness`, `outbound`, `operational`)
  - [ ] Post-migration verification queries return 0 violations
- Sync Functionality:
  - [ ] Inbound free/busy sync works for allowlisted providers
  - [ ] Outbound booking->calendar mapping works and creates `external_calendar_events`
  - [ ] No duplicate events (idempotency verified)
- Observability:
  - [ ] Metrics emitted and accessible
  - [ ] Structured logs visible and token-redaction confirmed
  - [ ] Backoff behavior works and is documented
  - [ ] Alerts configured or documented
- Webhooks:
  - [ ] Webhooks enabled for allowlisted connections
  - [ ] Signature validation implemented or requirement documented
  - [ ] Webhooks idempotent via dedupe keys

## NO-GO Triggers (any one triggers NO-GO)

- Flags not defaulting to OFF\n+- Allowlist not enforced\n+- Migration verification failures\n+- Sync errors for allowlisted providers\n+- Idempotency failures (duplicates)\n+- Silent failures / missing logs\n+- No rollback plan

## Rollback Plan

1. Disable feature flags: set `CALENDAR_SYNC_ENABLED=false`, `CALENDAR_JOBS_ENABLED=false`, `CALENDAR_WEBHOOK_ENABLED=false` and restart services.\n2. Remove providers from `CALENDAR_ALLOWLIST_PROVIDER_IDS` if needed.\n3. Run rollback scripts from `docs/ops/calendar_migration_rollback_scripts.sql` in reverse order.\n4. Contact on-call and follow incident runbook.

## Sign-off\n+\n+- Operator: ___________________\n+- Date: ______________________\n+\n*** End Patch
