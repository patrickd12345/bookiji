# Production KB Crawler Setup

The KB crawler can index both local and production sites. Here's how to configure it:

## Current Setup (Local Development)

The crawler is currently configured to crawl `http://localhost:3000` because `NEXT_PUBLIC_APP_URL` is set to localhost in `.env.local`.

## Production Crawling

To crawl your production site instead:

### Option 1: Use Environment Variable Override (Recommended)

Set `KB_CRAWLER_BASE_URL` in your `.env.local` or production environment:

```bash
# For production crawling
KB_CRAWLER_BASE_URL=https://bookiji.com

# Or keep local for development
KB_CRAWLER_BASE_URL=http://localhost:3000
```

### Option 2: Update NEXT_PUBLIC_APP_URL

Update `NEXT_PUBLIC_APP_URL` in your production environment:

```bash
NEXT_PUBLIC_APP_URL=https://bookiji.com
```

## Running the Crawler

### Local Development
```bash
# Crawl localhost (dev server must be running)
pnpm tsx scripts/crawl-kb.ts
```

### Production
```bash
# Set the base URL first
export KB_CRAWLER_BASE_URL=https://bookiji.com

# Or in PowerShell:
$env:KB_CRAWLER_BASE_URL="https://bookiji.com"

# Then run the crawler
pnpm tsx scripts/crawl-kb.ts
```

## Important Notes

1. **RAG API works everywhere**: The `/api/support/ask` endpoint works the same whether you crawled local or production - it queries the same database.

2. **Database is shared**: All crawled content goes into the same Supabase database, so you can mix local and production crawls.

3. **Idempotent**: The crawler is idempotent - running it multiple times won't create duplicates (it uses URL as unique key).

4. **Production site must be accessible**: Make sure the production URL is publicly accessible when running the crawler.

## Verification

After crawling, verify the setup:

```bash
pnpm tsx scripts/verify-kb-setup.ts
```

This will show:
- Number of articles indexed
- Number of chunks with embeddings
- Sample articles

## Testing the RAG API

Test the RAG API (works the same for local or production):

```bash
pnpm tsx scripts/test-rag-api.ts
```

Or manually:
```bash
curl -X POST http://localhost:3000/api/support/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is Bookiji?"}'
```



