# Support System Local Testing Runbook 🧪

Quick setup and testing guide for the Bookiji support system.

## Prerequisites

- ✅ Supabase project running
- ✅ Database migrations applied
- ✅ Ollama running locally
- ✅ Environment variables set

## 1. Environment Setup

```bash
# Copy and customize environment variables
cp env.template .env.local

# Set support system variables
export SUPPORT_KB_SUGGEST_ENABLED=true
export SUPPORT_KB_DUP_THRESHOLD=0.90
export SUPPORT_KB_AUTO_DUP_RECHECK=0.92
export ADMIN_API_KEY=dev-admin-key
export SUPPORT_ESCALATION_EMAIL=support@example.com
```

## 2. Run Database Migrations

```bash
# Apply support system migration
supabase db push

# Or manually run in Supabase dashboard:
# Copy contents of supabase/migrations/20250816092003_support_system_20250816.sql
```

## 3. Seed Knowledge Base

```bash
# Seed KB with test data
curl -X POST http://localhost:3000/api/test/support/seed_kb
```

Expected response:
```json
{"ok": true}
```

## 4. Test Support Chat Flow

### 4.1 Ask a Simple Question (Should Answer)

```bash
curl -s -X POST http://localhost:3000/api/support/chat \
  -H 'content-type: application/json' \
  -d '{"message":"How do I reschedule my booking?","email":"test@example.com"}'
```

Expected response (if KB has answer):
```json
{
  "reply": "1. You can reschedule a booking from your dashboard under \"My Bookings\" > \"Reschedule\". Changes allowed up to 24h before start time.",
  "intent": "booking_reschedule",
  "confidence": 0.85
}
```

### 4.2 Ask Complex Question (Should Escalate)

```bash
curl -s -X POST http://localhost:3000/api/support/chat \
  -H 'content-type: application/json' \
  -d '{"message":"I need a refund for my booking because the vendor never showed up","email":"test@example.com"}'
```

Expected response:
```json
{
  "reply": "I'm forwarding this to our support team now. Your ticket ID is [UUID]. We'll email you as soon as possible.",
  "escalated": true,
  "ticketId": "[UUID]"
}
```

## 5. Test Ticket Management

### 5.1 List Open Tickets

```bash
curl -s 'http://localhost:3000/api/v1/support/tickets?status=open' \
  -H 'x-dev-agent: allow'
```

### 5.2 Resolve a Ticket (Creates KB Suggestion)

```bash
# Use the ticketId from step 4.2
curl -s -X PATCH http://localhost:3000/api/v1/support/tickets/[TICKET_ID] \
  -H 'content-type: application/json' \
  -H 'x-dev-agent: allow' \
  -d '{"status":"resolved"}'
```

### 5.3 Check KB Suggestions

```bash
curl -s 'http://localhost:3000/api/v1/support/kb/suggestions?status=pending' \
  -H 'x-dev-agent: allow'
```

Expected response:
```json
{
  "suggestions": [
    {
      "id": "[UUID]",
      "ticket_id": "[TICKET_ID]",
      "question": "I need a refund for my booking because the vendor never showed up",
      "answer": "[Agent response]",
      "status": "pending",
      "similarity_to_best": 0.23
    }
  ]
}
```

## 6. Test KB Suggestion Approval

### 6.1 Approve Suggestion (Creates New Article)

```bash
# Use the suggestion ID from step 5.3
curl -s -X PATCH http://localhost:3000/api/v1/support/kb/suggestions/[SUGGESTION_ID] \
  -H 'content-type: application/json' \
  -H 'x-dev-agent: allow' \
  -d '{"action":"approve"}'
```

Expected response:
```json
{
  "ok": true,
  "articleId": "[NEW_ARTICLE_ID]",
  "slug": "i-need-a-refund-for-my-booking-because-the-vendor-never-showed-up-abc123"
}
```

### 6.2 Verify Article Created

```bash
curl -s 'http://localhost:3000/api/v1/support/search?q=refund' \
  -H 'x-dev-agent: allow'
```

## 7. Test Auto-Deduplication

### 7.1 Create Similar Question

```bash
curl -s -X POST http://localhost:3000/api/support/chat \
  -H 'content-type: application/json' \
  -d '{"message":"How do I get my money back for a no-show vendor?","email":"test2@example.com"}'
```

### 7.2 Resolve and Check for Duplicate

```bash
# Resolve the new ticket
curl -s -X PATCH http://localhost:3000/api/v1/support/tickets/[NEW_TICKET_ID] \
  -H 'content-type: application/json' \
  -H 'x-dev-agent: allow' \
  -d '{"status":"resolved"}'

# Check suggestions - should show duplicate
curl -s 'http://localhost:3000/api/v1/support/kb/suggestions?status=duplicate' \
  -H 'x-dev-agent: allow'
```

## 8. Test Admin Endpoints

### 8.1 Auto-Deduplication

```bash
curl -s -X POST http://localhost:3000/api/admin/kb/auto_dedupe \
  -H 'Authorization: Bearer dev-admin-key'
```

### 8.2 Ensure Embeddings

```bash
curl -s -X POST http://localhost:3000/api/admin/kb/ensure_embeddings \
  -H 'Authorization: Bearer dev-admin-key'
```

## 9. Test Rate Limiting

### 9.1 Spam Messages

```bash
# Send multiple messages quickly to test rate limiting
for i in {1..15}; do
  curl -s -X POST http://localhost:3000/api/v1/support/tickets/[TICKET_ID]/messages \
    -H 'content-type: application/json' \
    -H 'x-dev-agent: allow' \
    -d "{\"text\":\"Test message $i\"}"
  echo "Message $i sent"
done
```

Expected: Rate limit error after 10 messages per minute.

## 10. Test Search and Analytics

### 10.1 KB Search

```bash
curl -s 'http://localhost:3000/api/v1/support/search?q=reschedule' \
  -H 'x-dev-agent: allow'
```

### 10.2 Support Digest

```bash
curl -s 'http://localhost:3000/api/v1/support/digest?window=24h' \
  -H 'x-dev-agent: allow'
```

## 11. Run E2E Tests

```bash
# Run Playwright tests
pnpm playwright test tests/e2e/support_center.spec.ts

# Or run all tests
pnpm playwright test
```

## 12. Verify Database State

```sql
-- Check support tables
SELECT 'support_tickets' as table_name, count(*) as count FROM support_tickets
UNION ALL
SELECT 'kb_suggestions', count(*) FROM kb_suggestions
UNION ALL
SELECT 'kb_articles', count(*) FROM kb_articles
UNION ALL
SELECT 'support_messages', count(*) FROM support_messages;

-- Check suggestion statuses
SELECT status, count(*) FROM kb_suggestions GROUP BY status;

-- Check ticket statuses
SELECT status, count(*) FROM support_tickets GROUP BY status;
```

## Troubleshooting

### Common Issues

1. **"Forbidden" errors**: Check `x-dev-agent: allow` header
2. **Embedding errors**: Ensure Ollama is running
3. **Database errors**: Check migration status
4. **Rate limiting**: Wait 1 minute between batches

### Debug Mode

```bash
# Enable debug logging
export SUPPORT_DEBUG=true

# Check logs
tail -f .next/server.log
```

### Reset Test Data

```sql
-- Clear test data (be careful!)
DELETE FROM kb_suggestions WHERE ticket_id IN (
  SELECT id FROM support_tickets WHERE email LIKE '%@example.com'
);
DELETE FROM support_tickets WHERE email LIKE '%@example.com';
DELETE FROM kb_articles WHERE slug LIKE '%-abc123';
```

## Success Criteria ✅

- [ ] Support chat answers simple questions
- [ ] Support chat escalates complex questions
- [ ] Tickets are created and can be resolved
- [ ] KB suggestions are generated automatically
- [ ] Suggestions can be approved/rejected
- [ ] New KB articles are created with proper slugs
- [ ] Auto-deduplication works
- [ ] Rate limiting prevents abuse
- [ ] All E2E tests pass
- [ ] Admin endpoints work with proper auth

## Next Steps 🚀

1. **Deploy to staging** with `SUPPORT_KB_SUGGEST_ENABLED=false`
2. **Set up cron jobs** for auto-deduplication
3. **Configure monitoring** and alerting
4. **Train support agents** on the new system
5. **Enable suggestions** in production
6. **Upload OpenAPI spec** to Custom GPT Actions
