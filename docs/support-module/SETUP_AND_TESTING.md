# Support Module - Initial Setup & Testing Guide

## ✅ Verification Complete

All required files are in place:
- ✅ API endpoints (`/api/support/ask`, `/api/support/kb-status`)
- ✅ Database migrations (3 files)
- ✅ Crawler script
- ✅ GitHub Actions workflow
- ✅ Test scripts

## 🚀 Quick Start

### Step 1: Environment Variables

Create or update your `.env` file with:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_APP_URL=https://bookiji.com  # or http://localhost:3000 for local
```

### Step 2: Apply Migrations

```bash
npx supabase db push
```

This will create:
- `content_hash` and `last_crawled_at` fields in `kb_articles`
- Updated `kb_search()` function with URL support
- `kb_rag_usage` table for tracking

### Step 3: Run Initial Crawl

```bash
pnpm tsx scripts/crawl-kb.ts
```

**Expected Output:**
```
Starting crawl: MAX_PAGES=100, MAX_DEPTH=5
Crawling [depth=0]: https://bookiji.com
Updating/Indexing: https://bookiji.com
...
=== Crawl Summary ===
Total pages visited: X
Pages crawled: X
Pages skipped (unchanged): X
Pages re-embedded: X
Errors: X
Crawl finished.
```

### Step 4: Start Dev Server

```bash
pnpm dev
```

### Step 5: Test RAG API

**Option A: Using test script**
```bash
node scripts/test-rag-api.mjs "How do I book a service?"
```

**Option B: Using curl**
```bash
curl -X POST http://localhost:3000/api/support/ask -H "Content-Type: application/json" -d "{\"question\":\"How do I book a service?\"}"
```

**Expected Response:**
```json
{
  "answer": "To book a service on Bookiji...",
  "sources": [
    {
      "title": "How to Book",
      "url": "https://bookiji.com/get-started",
      "score": 0.85
    }
  ]
}
```

### Step 6: Check KB Status

```bash
curl http://localhost:3000/api/support/kb-status
```

**Expected Response:**
```json
{
  "lastCrawlTime": "2025-12-22T21:00:00Z",
  "lastRagTime": null,
  "articleCount": 42,
  "chunkCount": 156,
  "status": "ok"
}
```

## 🧪 Testing Checklist

- [ ] Migrations applied successfully
- [ ] Crawler runs without errors
- [ ] At least 1 article indexed
- [ ] RAG API returns answers (not "I don't know")
- [ ] KB status endpoint works
- [ ] Admin cockpit shows KB metrics

## 🔍 Troubleshooting

**Crawler fails with "Missing environment variables":**
- Check `.env` file exists
- Verify all required vars are set (no `<YOUR_` placeholders)

**RAG API returns "I don't know":**
- KB may be empty - run crawler first
- Check similarity threshold (default 0.7)
- Verify embeddings were created (check `kb_embeddings` table)

**Database errors:**
- Ensure migrations are applied: `npx supabase db push`
- Check Supabase connection: verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

## 📊 Monitoring

After setup, monitor via:
1. **Admin Cockpit** - View KB status in Overview tab
2. **API Endpoint** - `GET /api/support/kb-status`
3. **GitHub Actions** - Weekly crawler runs automatically

## 🎯 Next Steps

Once verified:
1. The weekly GitHub Actions workflow will auto-crawl
2. Users can query the support bot via the magenta button
3. Admin can monitor health in the cockpit











