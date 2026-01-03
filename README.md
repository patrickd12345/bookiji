# Bookiji Docker-based Deterministic Test Environment

## 🤖 The Only Supported E2E/Integration Test Flow

- **All infrastructure is run via Docker Compose:** Postgres, Supabase Auth (GoTrue), Supabase REST (PostgREST), App. No cloud or host setup required.
- **Deterministic:** Pin all dependencies. Uses strict seeding for test users/data.
- **Self-contained:** No connection to Cursor Cloud/Codex/host env required. CI must use exactly this flow, never run tests directly.

### 💡 How to run all tests (locally or in CI)

```bash
docker compose -f docker-compose.bookiji.test.yml up --build --abort-on-container-exit --exit-code-from app
```

- This will:
    1. Bring up all required infra (Postgres, Gotrue, PostgREST)
    2. Wait for readiness
    3. The `app` container will:
        - Run DB migrations with the Supabase CLI
        - Seed canonical test users/data
        - Run ALL tests (`vitest` + `playwright`)
    4. App container exit code signals overall test result

**Do not run E2E/Integration tests directly from host or CI runner.** Always use this deterministic, containerized workflow for all integration/system tests. All CI (including GitHub Actions) must run through Docker Compose and exit code from the `app` service.

---

**See also:** `Dockerfile.bookiji.test` and `docker-compose.bookiji.test.yml` for details/ENV options.
