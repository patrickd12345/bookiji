## Webhook Failure Scenarios Tests

Date: 2026-01-02
Operator: Automated agent

## Objective

Test webhook failure scenarios and document expected responses.

## Scenarios

1. Invalid connection_id (non-existent)\n   - Expected: 404\n2. Non-allowlisted connection_id\n   - Expected: 403\n3. Invalid signature (when signature validation enabled)\n   - Expected: 401\n4. Malformed JSON payload\n   - Expected: 400\n5. DB update failure (simulate DB error)\n   - Expected: 500 and error logged\n\n## Test Steps

Use curl or HTTP client to post test payloads to `/api/webhooks/calendar/google` and verify status codes and response bodies.
\n+## Deliverable\n\n- Documented results for each scenario and any remediation steps.\n\n*** End Patch
