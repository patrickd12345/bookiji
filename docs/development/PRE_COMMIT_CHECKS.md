# Pre-Commit Checks

**Last Updated:** January 27, 2025

## Overview

Before committing, always run the pre-commit checks to catch issues early. The pre-commit hook (via Husky) runs the same checks, but running them manually first saves time and avoids failed commits.

## Quick Command

```bash
pnpm pre-commit:check
```

This runs all the same checks as the Husky pre-commit hook.

## What Gets Checked

The pre-commit hook runs three checks in sequence:

### 1. TypeScript Type Check
```bash
pnpm type-check
```
- Runs `tsc --noEmit` to check for type errors
- **Blocks commit if errors found**

### 2. ESLint (Errors Only)
```bash
pnpm eslint . --quiet
```
- Checks for ESLint errors (not warnings)
- **Non-blocking** (warnings are allowed)
- Uses `--quiet` flag to show only errors

### 3. Lint-Staged (Auto-fix)
```bash
pnpm lint-staged
```
- Runs `eslint --fix` on staged files
- Auto-fixes fixable issues
- **Blocks commit if unfixable errors remain**

## Manual Check Sequence

If you want to run checks individually:

```bash
# 1. Type check
pnpm type-check

# 2. ESLint (errors only)
pnpm eslint . --quiet

# 3. Lint-staged (on staged files)
pnpm lint-staged
```

## Common Issues

### TypeScript Errors
- Fix type errors before committing
- Check `tsc --noEmit` output for details

### ESLint Errors
- Auto-fixable: Run `pnpm lint-staged` to fix
- Manual fixes: Check ESLint output for specific rules

### Lint-Staged Failures
- Usually means ESLint found unfixable errors
- Check the error output for specific file/line issues

## Best Practice

**Always run `pnpm pre-commit:check` before committing:**

```bash
# Stage your changes
git add .

# Run pre-commit checks
pnpm pre-commit:check

# If checks pass, commit
git commit -m "your message"
```

This ensures you catch issues before the Husky hook runs, saving time and avoiding failed commits.

## Related Files

- `.husky/pre-commit` - Husky pre-commit hook script
- `package.json` - Script definitions and lint-staged config
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.*` - ESLint configuration
