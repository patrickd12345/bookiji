# Proof Runbook

This document defines when and how to run proof validation.

## When Proof Must Be Run

Run proof:
- Before every production deployment
- After database migrations (before marking migration complete)
- After policy changes (before activating policy)
- When verifying a rollback target

Do **NOT** skip proof, even for "small" changes.

## How to Run Proof

### Step 1: Identify What Changed

Check Operations Changelog to identify:
- Code changes (commits, tags)
- Config changes (env vars, flags)
- Schema changes (migrations)
- Policy changes (policy IDs)

### Step 2: Select Proof Commands

Use existing test commands:

**For code changes:**
```bash
pnpm test
pnpm test:e2e
```

**For payment changes:**
```bash
pnpm test --grep "payment"
```

**For scheduling changes:**
```bash
pnpm test --grep "booking"
```

**For guardrail changes:**
```bash
pnpm test --grep "guardrail|kill.*switch"
```

### Step 3: Run Proof

Execute the proof commands in a clean environment:
- Use staging or local environment
- Ensure database is in known state
- Clear caches if applicable

Run commands and wait for completion.

### Step 4: Collect Artifacts

Required artifacts:
- **Test report**: Full test output (JSON or text)
- **Trace logs**: Application logs during test execution
- **Screenshots/video**: For UI flows (if applicable)

Store artifacts in:
- Incident folder (if during incident)
- Release folder (if pre-deployment)
- Postmortem folder (if post-incident)

### Step 5: Evaluate Results

**PASS criteria:**
- All tests pass
- No flaky tests
- No warnings that indicate failures
- Artifacts show expected behavior

**FAIL criteria:**
- Any test fails
- Any flaky test
- Any warning that indicates failure
- Artifacts show unexpected behavior

## Exit Criteria

**PASS = May Proceed**
- Document proof result in Operations Changelog
- Proceed with deployment or change
- Monitor for 15 minutes after change

**FAIL = Stop**
- Document failure in Operations Changelog
- Do not proceed with deployment or change
- Fix the issue
- Re-run proof until PASS

## What to Do on Failure

1. **Stop immediately**: Do not proceed with change
2. **Document failure**: Add entry to Operations Changelog
3. **Investigate**: Review test output and artifacts
4. **Fix**: Address root cause
5. **Re-run proof**: Verify fix with proof
6. **If already in production**: See ROLLBACKS.md

## Proof Artifacts Checklist

Before proceeding, ensure you have:
- [ ] Test report (all tests passing)
- [ ] Trace logs (no errors)
- [ ] Screenshots/video (if UI flow)
- [ ] Proof result documented in Changelog

## Common Proof Scenarios

### Pre-Deployment Proof

1. Run full test suite
2. Verify all tests pass
3. Document PASS in Changelog
4. Proceed with deployment

### Post-Migration Proof

1. Run migration-specific tests
2. Verify schema changes are correct
3. Check application connectivity
4. Document PASS in Changelog
5. Mark migration complete

### Rollback Verification Proof

1. Identify rollback target (commit/tag)
2. Run proof against rollback target
3. Verify rollback target passes proof
4. Document PASS in Changelog
5. Proceed with rollback (see ROLLBACKS.md)

## Important Notes

- Proof is **deterministic**: Same inputs = same outputs
- Proof is **human-run**: No automation, no cron jobs
- Proof is **binary**: PASS or FAIL, no interpretation
- Proof is **required**: No exceptions for "small" changes

If proof fails, stop and fix. Do not proceed.





















