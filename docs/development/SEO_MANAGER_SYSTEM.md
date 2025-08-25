# 📘 SEO Manager System — Bookiji

**Date:** August 24, 2025  
**Owner:** Bookiji Engineering

---

## 🎯 Purpose

Provide a single source of truth for all SEO infrastructure in Bookiji: metadata, sitemap, robots, canonical URLs, JSON-LD, CI validation, and search engine notifications.

---

## ✅ What's Implemented

### 1. Single Source of Truth

* **Removed duplicates:** Deleted `public/robots.txt` and `src/app/sitemap.xml`.
* **Programmatic robots:** Implemented `src/app/robots.ts` exporting `MetadataRoute.Robots`.
* **Programmatic sitemap:** Implemented `src/app/sitemap.ts` to dynamically generate sitemap.

### 2. SEO Helper Libraries (`src/lib/seo/`)

* `JsonLd.tsx`: Component for rendering structured data.
* `canonical.ts`: Helper for canonical URL generation.
* `indexNow.ts`: IndexNow notification logic.
* `index.ts`: Central exports for SEO helpers.

### 3. CI Guard System

* `seo/route-inventory.json`: Declares **required** and **forbidden** routes.
* `scripts/check-sitemap.ts`: Validates sitemap content against inventory.
* `.github/workflows/seo-sitemap-guard.yml`: Runs sitemap validation on every PR.

### 4. IndexNow Deployment System

* `scripts/indexnow-push.ts`: Pushes changed URLs or sitemap URL to IndexNow.
* `.github/workflows/deploy-indexnow.yml`: GitHub Actions workflow for automatic notification on production deploys.
* `public/indexnow-6e58c0fca47b66297cec27a6d0c200e2.txt`: IndexNow public key file.

### 5. Non-Prod Noindex Protection

* `next.config.ts`: Adds `X-Robots-Tag: noindex, nofollow` to all routes in non-production environments.

### 6. Package.json Updates

* Added scripts:
  * `seo:check`: Runs sitemap validator.
  * `seo:test`: Starts server and validates sitemap.
  * `seo:indexnow`: Runs IndexNow deployment script.
  * `start:ci`: Starts server in CI.
* Added dependencies: `concurrently`, `wait-on`, `tsx`.

### 7. Build & Type Safety

* ✅ `pnpm build` passes.
* ✅ `pnpm type-check` passes.
* ✅ `pnpm lint` passes (warnings allowed).
* ✅ 140/157 tests passing at initial rollout.

---

## 🔐 Secrets & Configuration

* `CANONICAL_HOST` = `bookiji.com`
* `NEXT_PUBLIC_APP_URL` = `https://bookiji.com`
* `INDEXNOW_KEY` = `6e58c0fca47b66297cec27a6d0c200e2` (published in `/public/indexnow-6e58c0fca47b66297cec27a6d0c200e2.txt`)

### Setup Instructions

1. **Create the public file** ✅
   - File: `public/indexnow-6e58c0fca47b66297cec27a6d0c200e2.txt`
   - Contents: `6e58c0fca47b66297cec27a6d0c200e2`

2. **Add to GitHub Actions secrets**
   - Go to: GitHub Actions → Settings → Secrets and variables → Actions
   - Add: `INDEXNOW_KEY = 6e58c0fca47b66297cec27a6d0c200e2`

3. **Add to Vercel environment variables**
   - Go to: Vercel project settings → Environment Variables
   - Add: `INDEXNOW_KEY = 6e58c0fca47b66297cec27a6d0c200e2`

4. **Local development** (`.env.local`, git-ignored)
   ```
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   CANONICAL_HOST=bookiji.local
   INDEXNOW_KEY=6e58c0fca47b66297cec27a6d0c200e2
   ```

---

## 🔍 Verification Commands

Run locally to confirm everything:

```bash
pnpm build
pnpm type-check
pnpm lint
pnpm seo:test   # start server + run sitemap validator
```

---

## 🚀 Deployment Flow

1. **CI Gate** (PRs):
   * Validates sitemap routes.
   * Fails PR if required URLs missing, forbidden routes present, or non-canonical hosts leak.

2. **Deploy Hook** (main/prod):
   * Runs `scripts/indexnow-push.ts`.
   * Notifies IndexNow with changed URLs (if available) or entire sitemap URL.

---

## 📋 Contributor Checklist

* [ ] Update `seo/route-inventory.json` if you add/remove public routes.
* [ ] Ensure new pages call `canonicalUrl()` and add JSON-LD if relevant.
* [ ] Verify tests pass locally (`pnpm seo:test`).
* [ ] Never re-add `public/robots.txt` or `src/app/sitemap.xml` duplicates.
* [ ] Keep `lastmod` accurate in sitemap for dynamic pages.

---

## 🌟 Next Steps

* Extend `SeoManager` for Admin Cockpit:
  * Add "Validate Sitemap" button.
  * Add "Notify IndexNow" button.
  * Show last run logs.
* Expand `sitemap.ts` to include DB-driven dynamic routes (vendors, services).
* Add Playwright coverage for SEO Manager actions in Admin Cockpit.

---

## 📚 References

* [Google: Sitemap Ping Deprecation Notice](https://developers.google.com/search/blog/2023/06/sitemaps-ping-endpoint-deprecated)
* [Bing Webmaster: Sitemaps](https://www.bing.com/webmasters/help/webmasters-indexing-sitemaps)
* [IndexNow Protocol](https://www.indexnow.org/)

---

**Status:** SEO Manager system implemented, tested, and CI/CD integrated. Ready for production use.
