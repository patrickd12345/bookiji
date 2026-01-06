## 2026-01-06 - Hardcoded Admin Emails
**Vulnerability:** Found hardcoded email addresses (e.g., 'admin@bookiji.com') in `src/app/api/admin/users/update-role/route.ts` that were granted admin privileges as a fallback mechanism.
**Learning:** Developers often add "backdoor" or "bootstrap" logic for convenience during early development but fail to remove it, creating persistent privilege escalation risks. Reliance on `process.env` checks should not have hardcoded defaults that grant sensitive permissions.
**Prevention:** Never include specific user identifiers (emails, IDs) in authorization logic within the codebase. Use role-based access control (RBAC) exclusively, driven by database state or secure configuration.
