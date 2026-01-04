## 2026-01-04 - [CRITICAL] Unauthenticated Admin Endpoint
**Vulnerability:** The `/api/fix-profiles-recursion` endpoint was publicly accessible and allowed unauthenticated users to execute destructive database operations (dropping policies).
**Learning:** Admin or maintenance endpoints often get overlooked if they are created for temporary "fixes".
**Prevention:** Always verify authentication on ANY route handler, even temporary ones. Use `CRON_SECRET` or similar mechanisms for machine-to-machine admin routes.

## 2026-01-04 - [HIGH] Custom HTML Sanitizer Bypass
**Vulnerability:** The regex-based sanitizer in `src/lib/sanitize.ts` can be bypassed using HTML entity encoding (e.g. `&#106;` for `j`) to execute XSS.
**Learning:** Custom sanitizers using Regex are almost always vulnerable.
**Prevention:** Use established libraries like `isomorphic-dompurify`. Note that `jsdom` dependency caused issues in this repo previously, leading to the custom implementation. Future fix should resolve the `jsdom` bundling issue to enable using the library.
