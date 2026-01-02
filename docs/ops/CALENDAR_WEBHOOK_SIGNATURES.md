## Webhook Signature Validation - Assessment

Date: 2026-01-02
Operator: Automated agent

## Current State

- `src/app/api/webhooks/calendar/google/route.ts` uses a `MockWebhookSignatureValidator` that always returns `true`. Real Google webhook validation (e.g., verifying `X-Goog-Signature` or using Google Cloud Pub/Sub verification) is not implemented.

## Risks

- Without signature validation, webhooks can be spoofed, potentially causing unnecessary syncs or data exposure.

## Recommendation

1. Implement provider-specific signature validation:\n   - Google: validate `X-Goog-Signature` header or verify notification channel via recommended Google method.\n   - Microsoft/Outlook: validate per provider docs.\n2. Add tests to simulate valid and invalid signatures and assert 200 vs 401 responses.\n3. Roll out signature validation to staging first, then production only after verification.

## Deliverable

- This assessment document; implementers should replace the mock validator with a secure validator class and add tests.

