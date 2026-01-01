# SERVER-ROUTE INVARIANT: Authenticate with request-scoped client → query with service-role client

This is a mandatory server-route invariant for Bookiji server code. Violating this rule is a bug and will produce nondeterministic, load-dependent failures (401/500, missing profile rows). Follow it exactly.

## Context / Problem Statement

- Request-scoped Supabase client: the Supabase client instance created per incoming request (usually wired to request cookies or to a short-lived bearer token). It is subject to Row Level Security (RLS) policies in the database.
- RLS applies to request-scoped clients and enforces database-level access controls per authenticated user. RLS rules can cause queries to return no rows, errors, or behave differently under concurrency.
- Relying on implicit session propagation or querying application tables with the request-scoped client after authentication is unsafe. Under load, RLS and session timing can produce nondeterministic failures (profile lookups that intermittently return errors or no rows), causing 401/500 returns in otherwise-correct routes.
- To eliminate this source of nondeterminism, authentication and data access must be separated: validate identity with a request-scoped client, then perform data queries with a server-only service-role client.

## Canonical Pattern (required flow)

All server route handlers MUST follow this sequence:

1. Create a request-scoped Supabase client (cookie-aware or anon client).
2. Authenticate the incoming request:
   - Accept either Authorization: Bearer <token> OR session cookie.
   - Use the request-scoped client to validate the token/session and obtain the user identity.
3. Extract the authenticated user id from the validated session.
4. Perform explicit role authorization in the route (e.g., check profile.role === 'vendor').
   - If authorization fails, return 401/403 as appropriate.
5. Instantiate the service-role Supabase client (server-only, uses the service key).
6. Perform ALL application data queries (profiles, bookings, services, etc.) using the service-role client.

Do NOT mix authentication and application queries on the request-scoped client. Authentication (identity validation) and data access (application queries) are distinct responsibilities and must remain separated.

Example (pseudocode):

```javascript
// 1. request-scoped client (cookie or bearer-aware)
const supabase = createServerClient(..., { cookies: requestCookies })

// 2. authenticate
const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// 3. explicit role check (authorization)
const { data: profile } = await /* service-role client would be used below */
if (profile.role !== 'vendor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

// 4. switch to service-role client for data access
const supabaseAdmin = createSupabaseServerClient() // uses service key
const { data: profileRow } = await supabaseAdmin.from('profiles').select('id, role').eq('auth_user_id', user.id)
// use supabaseAdmin for all subsequent queries
```

## Security Rationale

- User identity is validated by the request-scoped client; after validation, the server has an authoritative identity for that request.
- Explicit role authorization prevents elevation-of-privilege: the server must assert the user's role before granting access.
- The service-role client is server-only and uses a secret key not exposed to browsers or clients. Using it after authentication is safe because:
  - Identity is already validated.
  - Authorization is enforced by application logic prior to using the service-role client.
  - Service-role access avoids RLS-related nondeterminism for read queries needed by server handlers.

## Forbidden Anti-Patterns

These are bugs — do NOT do them:

- Query application tables (profiles, bookings, services, etc.) with the request-scoped client after authentication.
- Rely on implicit Supabase session propagation or side-effects of `getUser()` to make application queries succeed.
- Mix request-scoped and service-role client calls in ad hoc ways that make authorization implicit.
- Assume "works locally" means it's safe; RLS-induced behavior is environment- and concurrency-dependent.

## Canonical Implementations (reference)

Use these routes as canonical examples of the pattern:

- `src/app/api/vendor/analytics/route.ts`
- `src/app/api/vendor/settings/route.ts`
- `src/app/api/vendor/service-types/route.ts`

Inspect those files to copy the exact sequence: authenticate with request client → role check → instantiate service-role client → perform data queries.

## Enforcement

- All new server routes MUST implement this invariant.
- Pull requests that do not follow this pattern should be blocked in code review.
- CI and load-test failures are expected and acceptable signals of invariant violation; fix the route to restore deterministic behavior.

This is an architectural law for the Bookiji backend—implement it without exception.

