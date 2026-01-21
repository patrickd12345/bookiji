## 2026-01-04 - [CRITICAL] Unauthenticated Admin Endpoint
**Vulnerability:** The `/api/fix-profiles-recursion` endpoint was publicly accessible and allowed unauthenticated users to execute destructive database operations (dropping policies).
**Learning:** Admin or maintenance endpoints often get overlooked if they are created for temporary "fixes".
**Prevention:** Always verify authentication on ANY route handler, even temporary ones. Use `CRON_SECRET` or similar mechanisms for machine-to-machine admin routes.

## 2026-01-04 - [HIGH] Custom HTML Sanitizer Bypass
**Vulnerability:** The regex-based sanitizer in `src/lib/sanitize.ts` can be bypassed using HTML entity encoding (e.g. `&#106;` for `j`) to execute XSS.
**Learning:** Custom sanitizers using Regex are almost always vulnerable.
**Prevention:** Use established libraries like `isomorphic-dompurify`. Note that `jsdom` dependency caused issues in this repo previously, leading to the custom implementation. Future fix should resolve the `jsdom` bundling issue to enable using the library.

## 2026-01-05 - [CRITICAL] Fail-Open Authentication in CRON Jobs
**Vulnerability:** Multiple CRON endpoints (e.g., `src/app/api/notifications/batch/process/route.ts`) were configured to bypass authentication if the `CRON_SECRET` environment variable was missing (`if (secret && header !== secret)`).
**Learning:** Conditional authentication checks that rely on environment variable existence can fail open if the environment is misconfigured.
**Prevention:** Use fail-closed logic: `if (!secret || header !== secret)`. Ensure that missing configuration results in denied access, not allowed access.
