# 🚨 Bookiji FIXME / Audit Report

This document captures issues identified during full-repo analysis (Aug 2025).  
It should be treated as a running checklist before production launch.

---

## 🔧 Repo Hygiene
- [x] Remove stray files: `tatus`, `tatus --porcelain` accidentally committed CLI output.
- [x] Consolidate env templates: `.env.example`, `env.template`. Pick ONE canonical file.
- [x] Remove `.venv` from repo (should be in `.gitignore`).
- [x] Ensure `.gitignore` excludes `playwright-report/` and other generated artifacts.
- [x] Consolidate ESLint config: `.eslintrc.json` vs `eslint.config.mjs` — pick one.
- [x] Consolidate lockfiles: `package-lock.json` vs `pnpm-lock.yaml` — pick one package manager.

## ⚡ Infrastructure
- [ ] Verify MailerSend SMTP integration — credentials management, retries, and no secrets leaked.
- [x] Supabase migrations: unify into a linear migration history. Archive/remove ad hoc SQL fixes (`check_schema.sql`, `COMPREHENSIVE_DATABASE_FIX.sql`).
- [x] Provide a proper Dockerfile for the app itself. Currently only `docker-compose.yml` + `llm/Dockerfile` exist.
- [x] Ensure `docker-compose up` brings the full stack (app + db + services).

## 🧪 Testing & QA
- [x] Update documentation to reflect true test counts (currently 373+ tests, not 247/256).
- [x] Remove claim of "100% coverage" unless validated by actual coverage reports.
- [x] Clean up `.github/workflows/` to avoid overlapping or redundant jobs.

## 📚 Documentation
- [x] Update `REMAINING_TASKS_OVERVIEW.md` — dev is NOT "completed"; stabilization ongoing.
- [x] Sync `REAL_STATUS_REPORT.md` with latest commits & test stats.
- [x] Clarify whether `PATENT_OUTLINE.md` is placeholder or actionable. (ACTIONABLE - contains specific technical claims)

## 🌐 App Code
- [ ] Audit new `useAuthReady` hook — ensure no login/session race conditions remain.
- [ ] Verify cron/automation scripts (`scripts/ai-test-loop.mjs`, `docs/SUPPORT_CRON_SETUP.md`) are wired into deployment or clearly marked experimental.
- [ ] Clarify status of Ollama integration (`lib/ollama.ts`, `llm/`) — core feature or experiment?

## 🎨 Miscellaneous
- [x] Ensure `sitemap.xml` in `public/` is generated dynamically (remove stale static copies).
- [ ] Confirm AdSense/analytics docs correspond to live implementation.
- [x] Remove Playwright reports from version control.

---

### Priority Fixes Before Launch
1. Repo cleanup (junk files, env, lockfiles).
2. Supabase migration unification.
3. Update project status docs with current test counts & features.
4. Package manager consistency (`npm` vs `pnpm`).
5. Ensure Docker setup works for full app.

---
