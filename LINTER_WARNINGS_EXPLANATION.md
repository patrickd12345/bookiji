# GitHub Actions Workflow Linter Warnings

## About the Warnings

The linter warnings you see for `vars.*`, `secrets.*`, and `needs.*.outputs.*` are **false positives**.

### Why They Appear

The GitHub Actions workflow linter (used by VS Code and other IDEs) performs static analysis and cannot verify that:
- Repository variables (`vars.*`) exist in your repository settings
- Repository secrets (`secrets.*`) exist in your repository settings  
- Job outputs (`needs.*.outputs.*`) are set by conditional jobs

### Why They're Safe to Ignore

1. **Valid Syntax**: The syntax `${{ vars.SENTRY_ORG }}` is correct GitHub Actions syntax
2. **Runtime Verification**: The workflow validates these exist at runtime (see validation steps)
3. **Repository Settings**: These are defined in GitHub Settings → Secrets and variables → Actions

### Current Warnings

- **ci-performance.yml**: 6 warnings for Sentry variables/secrets
- **ci-e2e.yml**: 5 warnings for CI_PREDICTIVE_OFF, OPENAI_API_KEY, and job outputs

### Solutions

1. **Ignore the warnings** - They're false positives and the workflow validates at runtime
2. **Configure your IDE** - Disable these specific warnings in VS Code GitHub Actions extension settings
3. **Use actionlint config** - We've added `.github/actionlint.yaml` but IDE linters may not respect it

### Runtime Validation

The workflows include validation steps that check these variables exist:
- `ci-performance.yml` validates Sentry configuration before use
- `ci-e2e.yml` uses `continue-on-error: true` for optional features

These warnings do not affect workflow execution.

