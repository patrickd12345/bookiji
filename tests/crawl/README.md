# Systematic Crawl Test

The systematic crawl test performs a deterministic breadth-first search (BFS) crawl of the application, starting from seed URLs. It detects runtime errors, console errors (including hydration issues), HTTP 4xx/5xx responses, internal 404 links, and redirect loops.

## Overview

The crawler:
- Performs a deterministic same-origin crawl using BFS (FIFO queue)
- Detects page errors, console errors, and HTTP errors
- Identifies broken internal links (404s)
- Detects redirect loops and excessive redirects
- Generates comprehensive JSON and Markdown reports
- Captures screenshots and HTML snapshots for failing pages

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CRAWL_MAX_PAGES` | `200` | Maximum number of pages to crawl. Set to `0` for unlimited crawl, or specify a number to cap it |
| `CRAWL_MAX_DEPTH` | `2` | Maximum depth (link hops from seed URLs). `0` = only seeds, `1` = seeds + direct links, `2` = up to 2 hops, etc. Set to `-1` for unlimited depth |

### Recommended Configurations

**For CI/CD (default):**
- Depth 2, 200 pages - Fast, catches most issues, covers typical user journeys

**For pre-release verification:**
- Depth 3, 500 pages - More thorough, catches edge cases

**For local development:**
- Depth 1, 50 pages - Quick smoke test

**For full site crawl:**
- Depth -1, Pages 0 - Unlimited (use with caution, can take hours)
| `CRAWL_PAGE_TIMEOUT_MS` | `15000` | Timeout per page in milliseconds |
| `CRAWL_SEEDS` | `['/']` | Comma-separated list of seed URLs to start crawling from |
| `CRAWL_ROLE` | (none) | Optional role for authenticated crawls (`admin`, `vendor`, `customer`). If set, the test will authenticate before crawling |
| `CRAWL_CONCURRENCY` | `1` | Number of concurrent page visits (set to 1 for deterministic CI runs) |
| `CRAWL_RESUME_FROM` | (none) | Path to checkpoint JSON file from a previous crawl. Loads visited URLs and continues from where it left off |
| `CRAWL_SAVE_CHECKPOINT` | `true` | Whether to save a checkpoint file after crawling (set to `false` to disable) |

### Example

```bash
# Default crawl (depth 2, 200 pages - recommended for CI)
pnpm playwright test tests/crawl

# Pre-release verification (more thorough)
CRAWL_MAX_DEPTH=3 CRAWL_MAX_PAGES=500 pnpm playwright test tests/crawl

# Quick smoke test (local development)
CRAWL_MAX_DEPTH=1 CRAWL_MAX_PAGES=50 pnpm playwright test tests/crawl

# Unlimited crawl (use with caution - can take hours)
CRAWL_MAX_PAGES=0 CRAWL_MAX_DEPTH=-1 pnpm playwright test tests/crawl

# Authenticated crawl with custom limits
CRAWL_MAX_DEPTH=2 CRAWL_MAX_PAGES=200 CRAWL_ROLE=vendor pnpm playwright test tests/crawl

# Resume from previous crawl checkpoint
CRAWL_RESUME_FROM=test-results/crawl/crawl-checkpoint.json pnpm playwright test tests/crawl

# Progressive crawl: start shallow, then go deeper
# First run: depth 1
CRAWL_MAX_DEPTH=1 pnpm playwright test tests/crawl
# Second run: continue from checkpoint, go deeper
CRAWL_MAX_DEPTH=2 CRAWL_RESUME_FROM=test-results/crawl/crawl-checkpoint.json pnpm playwright test tests/crawl
```

## Running Locally

### Basic Guest Crawl

Run the crawl test without authentication:

```bash
pnpm playwright test tests/crawl
# or
pnpm playwright test tests/crawl/crawl.spec.ts
```

### Authenticated Crawl

To crawl authenticated routes, set the `CRAWL_ROLE` environment variable:

```bash
# Crawl as vendor
CRAWL_ROLE=vendor pnpm playwright test tests/crawl

# Crawl as admin
CRAWL_ROLE=admin pnpm playwright test tests/crawl

# Crawl as customer
CRAWL_ROLE=customer pnpm playwright test tests/crawl
```

**Note:** Authenticated crawls require valid Supabase credentials. The test uses the `auth` fixture from `tests/fixtures/base.ts` to authenticate. If authentication fails, the test will skip or fail with a clear error message.

### Custom Configuration

```bash
# Limit pages and set custom timeout
CRAWL_MAX_PAGES=50 CRAWL_PAGE_TIMEOUT_MS=10000 pnpm playwright test tests/crawl

# Start from specific seed URLs
CRAWL_SEEDS="/,/dashboard,/services" pnpm playwright test tests/crawl

# Combine options
CRAWL_MAX_PAGES=100 CRAWL_SEEDS="/,/about" CRAWL_ROLE=vendor CRAWL_PAGE_TIMEOUT_MS=20000 pnpm playwright test tests/crawl
```

## What Gets Crawled

The crawler follows same-origin links and:
- ✅ Follows internal navigation links (`<a href>`)
- ✅ Normalizes URLs (removes hashes, trailing slashes, sorts query params)
- ✅ Tracks visited URLs to avoid duplicates
- ✅ Respects `CRAWL_MAX_PAGES` limit

The crawler **excludes**:
- ❌ External hosts (only same-origin)
- ❌ `/_next/` static assets
- ❌ `/api/` endpoints
- ❌ `mailto:` and `tel:` links
- ❌ Hash-only links (same page anchors)

## What Gets Detected

For each visited page, the crawler checks:

1. **Page Errors**: JavaScript runtime errors (`pageerror` events)
2. **Console Errors**: `console.error` messages (including React hydration errors)
3. **HTTP Errors**: 4xx/5xx responses to same-origin resources
4. **404 Links**: Internal links that resolve to 404 pages
5. **Redirect Loops**: Excessive redirects (default threshold: 10 redirects)

## Artifacts

After the crawl completes, artifacts are saved to `test-results/crawl/`:

### Reports

- **`crawl-report.json`**: Structured JSON report containing:
  - List of all visited pages with status codes
  - All detected incidents (errors, console errors, 404s, redirects)
  - Summary statistics (total pages, incidents count, duration)
  - Paths to artifact files (screenshots, HTML)

- **`crawl-report.md`**: Human-readable Markdown summary with:
  - Overview of crawl results
  - List of failing pages with descriptions
  - Links to artifact files
  - Summary statistics

### Checkpoint File

- **`crawl-checkpoint.json`**: Saved automatically after each crawl (unless `CRAWL_SAVE_CHECKPOINT=false`). Contains:
  - List of all visited URLs
  - Depth mapping for each URL
  - Timestamp and metadata
  - Can be used with `CRAWL_RESUME_FROM` to continue from where you left off

### Failure Artifacts

For each page that fails any check, the crawler saves:
- **`{sanitized-url}-fail.png`**: Screenshot of the failing page
- **`{sanitized-url}-fail.html`**: HTML snapshot of the page state

URLs are sanitized for filesystem safety (e.g., `/about/contact` → `about-contact`).

## Resuming Crawls

The crawler supports resuming from a previous crawl checkpoint, which is useful for:

- **Progressive testing**: Start with depth 1, then continue with depth 2, etc.
- **Incremental coverage**: Crawl a bit more each time
- **Resuming after failures**: Continue from where a previous crawl stopped

### How to Resume

1. Run a crawl (checkpoint is saved automatically):
   ```bash
   CRAWL_MAX_DEPTH=1 pnpm playwright test tests/crawl
   ```

2. Continue from the checkpoint:
   ```bash
   CRAWL_MAX_DEPTH=2 CRAWL_RESUME_FROM=test-results/crawl/crawl-checkpoint.json pnpm playwright test tests/crawl
   ```

The crawler will:
- Skip all URLs that were already visited
- Continue crawling new URLs from the queue
- Respect the new depth/page limits

## CI Integration

### Determinism

The crawler is designed to be deterministic:
- Uses FIFO queue (BFS) for consistent crawl order
- Normalizes URLs consistently
- Caps total pages and per-page timeouts
- Default concurrency of 1 to avoid race conditions

### CI Environment Variables

In CI, you may want to:

```yaml
env:
  CRAWL_MAX_PAGES: 200
  CRAWL_PAGE_TIMEOUT_MS: 15000
  CRAWL_CONCURRENCY: 1
  CRAWL_ROLE: ""  # Leave empty for guest crawl, or set to vendor/admin/customer
```

### Authentication in CI

If running authenticated crawls in CI:
- Ensure Supabase credentials are available in CI environment
- The test uses the `auth` fixture which requires valid `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- If authentication fails, the authenticated crawl test will be skipped or fail gracefully

### Artifact Upload

Configure your CI to upload `test-results/crawl/` as artifacts:

```yaml
- name: Upload crawl artifacts
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: crawl-report
    path: test-results/crawl/
```

## Test Structure

The test suite includes:

- **`test('guest crawl', ...)`**: Always runs, crawls public routes without authentication
- **`test('role crawl (optional)', ...)`**: Only runs if `CRAWL_ROLE` is set, crawls authenticated routes

Both tests use the same `runCrawl()` function which:
1. Initializes the BFS queue with seed URLs
2. Visits each page, extracts links, and enqueues new URLs
3. Monitors for errors, console errors, and HTTP errors
4. Generates reports and saves artifacts
5. Asserts that no incidents were found (fails if any incidents detected)

## Troubleshooting

### Test Times Out

- Reduce `CRAWL_MAX_PAGES` to crawl fewer pages
- Increase `CRAWL_PAGE_TIMEOUT_MS` if pages are slow to load
- Check network conditions and server performance

### Authentication Fails

- Verify Supabase credentials are set correctly
- Check that test users exist in the database
- Review `tests/fixtures/base.ts` and `tests/helpers/auth.ts` for auth implementation

### Too Many False Positives

- Some console errors may be expected (e.g., analytics, third-party scripts)
- Review the JSON report to filter out known issues
- Consider excluding specific routes or domains

### Missing Links

- The crawler only follows same-origin links
- Check that links are properly formatted (`<a href>` tags)
- Verify links are not excluded by the filtering rules

## Related Files

- **`tests/crawl/crawl.spec.ts`**: Main test implementation
- **`tests/crawl/helpers/loginHelper.ts`**: Optional login helper (only if auth fixture unavailable)
- **`tests/fixtures/base.ts`**: Test fixtures including `auth` helper
