# CSP on Localhost: When Auth Vanishes

We lost Supabase Auth for hours because CSP silently blocked it; the browser lied with `TypeError: Failed to fetch` while curl and admin scripts worked fine.

## Failure Signature
- Browser console: `TypeError: Failed to fetch` on `https://<project>.supabase.co/auth/v1/token`.
- Network tab shows request stuck in “blocked: other” or never leaves the browser; no 4xx/5xx.
- Curl to the same endpoint succeeds; Supabase admin API works; only real browser auth fails.

## Why It Happened
- Local CSP `connect-src` omitted `https://*.supabase.co` and `wss://*.supabase.co`.
- Next.js dev server served a strict CSP intended for production; localhost wasn’t exempted.
- Service scripts bypassed CSP entirely, hiding the root cause.

## Correct Local/E2E CSP Loosening
- For `development` and `E2E` only, include:
  - `connect-src https://*.supabase.co wss://*.supabase.co http://localhost:* ws://localhost:* data: blob:;`
  - `script-src 'self' 'unsafe-eval' 'unsafe-inline'` (only if devtools require it; avoid in prod).
  - Keep `default-src 'self'` and other prod directives intact.
- Gate this on `process.env.NODE_ENV !== 'production'` or `E2E === 'true'`; never widen production CSP.

## Invariants
- Auth flows must be proven in a real browser before accepting logs from CLI tools.
- CSP config for localhost/E2E is explicit, versioned, and covered by a Playwright check that asserts Supabase auth requests leave the browser.
- Any `TypeError: Failed to fetch` during auth requires checking CSP before touching Supabase or code.

## How to Avoid the Trap
- Add a Playwright assertion that `connect-src` includes the active Supabase host during proof runs.
- Keep a CSP diff between prod and dev; deviations must be intentional and documented.
- When curl works but the browser fails, inspect CSP first, not Supabase.
