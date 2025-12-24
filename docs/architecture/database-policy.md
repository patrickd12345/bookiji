# Bookiji Database Management Policy (DBMP)

**Status:** ACTIVE (must-follow)  
**Applies to:** Supabase Postgres schema, functions (RPC), triggers, RLS policies, and migrations.

This document is the **source of truth** for how Bookiji manages its database.  
Any change that violates these rules is considered **incorrect** even if it "works."

---

## 1) Non-Negotiable Principles

### 1.1 Forward-only migrations
- All DB changes must be expressed as **SQL migrations** under `supabase/migrations/`.
- Migrations are **applied once**, in timestamp order.
- **No rollbacks** in production. Fix mistakes with a **new forward migration**.

### 1.2 No manual production edits
- No manual schema changes in Supabase UI for production.
- No "quick fixes" by running ad-hoc SQL in production.
- Production is changed only through migrations.

### 1.3 Deterministic + auditable
- The database must be understandable from:
  - migrations
  - schema
  - documented policy
- "It was changed manually" is an invalid explanation.

### 1.4 No secrets in repo or logs
- Never commit or paste connection strings with credentials.
- Use env vars + Supabase secrets.
- Never log API keys, DB passwords, or service role keys.

---

## 2) Database Object Classes (Rules Differ by Class)

Every table/function must be classified into exactly **one** class.

### Class A — Forensic / Append-only Truth
**Purpose:** Immutable evidence for replay, auditing, and incident forensics.

**Examples (typical):**
- `simcity_run_events`
- `simcity_run_snapshots`
- `simcity_run_live`
- `ops_events`
- audit/outbox tables (if append-only)

**Rules:**
- **NO UPDATE**
- **NO DELETE**
- INSERT-only is allowed.
- Schema may be extended (new columns) but existing records are never mutated.
- Prefer RLS that allows insert from trusted roles and read for ops/admin.

**Enforcement preference:**
- DB-level triggers or RLS restrictions preventing UPDATE/DELETE.

---

### Class B — Operational State (Mutable)
**Purpose:** Current product state that evolves (bookings, profiles, etc.)

**Examples (typical):**
- `bookings`, `availability_slots`
- `profiles`
- `support_tickets`

**Rules:**
- UPDATE allowed.
- DELETE is allowed only if explicitly required and documented.
- Must preserve invariants and access rules via RLS.
- Data changes must be safe under concurrency (transactions where needed).

---

### Class C — Derived / Cache / Index (Rebuildable)
**Purpose:** Computed/derived data that can be regenerated.

**Examples (typical):**
- KB embeddings tables
- usage tracking / analytics rollups
- materialized views (if used)

**Rules:**
- Can be rebuilt.
- Can be truncated.
- Must never be the only source of truth.
- Must have clear rebuild path (documented in code or docs).

---

## 3) Migration Authoring Rules

### 3.1 One concept per migration
Each migration should do one logical change:
- "add table X"
- "add column Y"
- "new RLS policy for Z"
- "add RPC function Q"
Avoid mega-migrations that mix unrelated changes.

### 3.2 Idempotency expectations
- Migrations are not re-run in prod, but **should be safe to apply in clean environments**.
- Use `create table if not exists` only when appropriate; prefer standard create + consistent ordering.

### 3.3 Data migrations (touching rows)
Data-touching migrations are allowed only when necessary and must be:
- **forward-only**
- **explicitly documented** in the migration header comment
- safe on large datasets (avoid full table rewrite unless unavoidable)

If a destructive data change is required, it must be called out as:
- `DESTRUCTIVE:` with justification
- plus a recovery plan

### 3.4 Rollback strategy
- No down migrations in production.
- If something breaks, write a new migration that corrects it.
- If a column/table must be replaced, prefer:
  - add new → backfill → switch reads/writes → deprecate old → remove later

---

## 4) RLS, Security, and Access

### 4.1 RLS is required by default
- New tables must have a conscious RLS decision:
  - enabled with policies, OR
  - explicitly documented why RLS is disabled (rare)
- Policies must be least-privilege.

### 4.2 Service role discipline
- Service role is allowed for server-side ops tasks only.
- Client-side code must never use service role.
- Prefer RPC functions for controlled access patterns.

### 4.3 PII minimization in logs & events
- Forensic tables (Class A) must avoid storing sensitive raw PII unless absolutely required.
- If needed, store references/ids and keep sensitive data in Class B with access controls.

---

## 5) Functions (RPC), Triggers, and "Logic in SQL"

### 5.1 SQL functions are adapters, not the brain
DB functions are allowed for:
- retrieval helpers (e.g., vector search)
- safe event emission triggers
- lightweight invariants that enforce append-only behavior

Not allowed:
- complex business workflows that belong in application code
- hidden side effects that make behavior non-obvious

### 5.2 Triggers
Triggers are allowed when:
- emitting events to append-only tables (Class A)
- enforcing immutability constraints (no UPDATE/DELETE)
- lightweight consistency checks

Triggers must be:
- minimal
- deterministic
- documented in the migration that adds them

---

## 6) Naming, Documentation, and "Schema Hygiene"

### 6.1 Naming
- Tables: `snake_case` plural when appropriate (e.g., `support_tickets`)
- Columns: `snake_case`
- Functions: `snake_case` with verb (e.g., `kb_search`)
- Constraints: meaningful names (not default gibberish)

### 6.2 Commenting
- For non-obvious tables/functions, add `comment on table/column/function`.
- Every migration must include a short header comment explaining intent.

### 6.3 Deprecation
- Never drop a table/column in the same release it stops being used.
- Deprecate in phases:
  1) stop writes
  2) stop reads
  3) remove after stability window

---

## 7) Operational Procedure (How We Apply Migrations)

### 7.1 Environments
- Apply and validate in this order:
  1) local/dev
  2) staging
  3) production

### 7.2 Verification checklist
After applying migrations:
- `pnpm build` passes
- smoke test critical endpoints
- confirm RLS policies behave as expected
- confirm append-only tables reject UPDATE/DELETE

### 7.3 Forensic integrity
- Class A tables must remain queryable and internally consistent.
- Never "clean up" forensic tables by deleting rows.

---

## 8) Cursor / AI Development Rules (Yes, this is for you too)

When implementing DB changes, Cursor must:
- propose a migration file first
- state which **table class** each affected object belongs to (A/B/C)
- ensure append-only rules are enforced for Class A
- avoid adding business workflows into SQL
- avoid any secrets in code or docs
- never modify production manually

If any step conflicts with this policy, **stop and redesign**.

---

## 9) Policy Changes

This policy may evolve, but only via:
- a PR that edits this file
- a brief rationale in the PR description
- agreement that the change reduces long-term risk

Until then, this document is binding.


