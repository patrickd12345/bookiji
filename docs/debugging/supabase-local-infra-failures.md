# Supabase Local Infra Failures: Trust But Verify

The biggest blockers were infrastructure, not code. Docker looked “running” on Windows but the daemon was dead; Supabase health lied with timeouts and hanging admin calls.

## Failure Signature
- `supabase start` returns 500 or hangs; `supabase status` reports nothing useful.
- `docker ps` fails or never returns; `Get-Service com.docker.service` says “Running” anyway.
- Auth admin endpoint `http://localhost:55321/auth/v1/admin/users` hangs forever; health endpoint shape flips between `{"status":"ok"}` and plain `OK`.
- Playwright shows 300+ connection errors and seed scripts error on first request.

## What Actually Broke
- Docker Desktop Linux engine was wedged; Windows service status was green but `dockerd` was absent.
- Supabase CLI depends on Docker daemon; without it, all commands 500 even though the CLI process runs.
- GoTrue v2 health endpoint changed shape; scripts expecting string `OK` treated JSON as failure and misdiagnosed healthy vs unhealthy states.

## Invariants
- Docker daemon reachable: `docker version` succeeds and returns both client and server info.
- Supabase health: `curl --max-time 5 http://localhost:55321/auth/v1/health` returns quickly; tolerate JSON or plain `OK` but never a hang.
- Admin API call with service role key returns promptly; a hang is infra, not code.
- Seed must run only after the above three checks pass.

## Diagnostics That Saved Time
- Treat “service running” as meaningless; require `docker ps` to return within 2s.
- Use `supabase logs` only after Docker health is confirmed; otherwise the CLI masks the daemon failure.
- Distinguish timeout vs 500 vs hang; timeouts/hangs point to infra, not migrations.

## Recovery Playbook (Condensed)
- Restart Docker Desktop (admin) and wait for `docker version` to show server.
- `supabase stop && supabase start`, then re-check health/admin endpoints.
- If health returns JSON vs string, normalize in scripts instead of failing.

## Avoiding Repeat
- Preflight script before any E2E: check Docker daemon, Supabase health, admin endpoint responsiveness, and env match.
- Document that Windows service status is insufficient; the daemon must answer.
- Keep a fast-fail timer on all local Supabase checks to prevent hanging test runs.
