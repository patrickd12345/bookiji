# Operations Changelog

This is an **operations change log** for production-affecting changes. It is separate from product changelogs.

## What Must Be Logged

Log any change that:
- Affects production behavior
- Changes database schema or data
- Modifies environment variables or feature flags
- Updates third-party integrations (Stripe, Supabase, email)
- Changes deployment configuration
- Alters monitoring or alerting

**Do NOT log:**
- Code merges that don't affect production yet
- Documentation-only changes
- Test changes
- Development environment changes

## Entry Format

Each entry must include:

- **Date**: ISO format (YYYY-MM-DD)
- **Environment**: prod / staging / local
- **Summary**: One-line description
- **Scope**: code / config / database / third-party
- **Risk**: low / medium / high
- **Verification**: How to confirm the change is active
- **Rollback hint**: Brief note on how to undo

## Examples

### Example 1: Code Deployment

**2025-12-27 | prod | Deploy booking confirmation flow v2.3**

- **Scope**: code
- **Risk**: medium
- **Verification**: Check `/api/bookings/confirm` returns new response format
- **Rollback hint**: Revert to commit `abc123` via Vercel dashboard

---

### Example 2: Database Migration

**2025-12-27 | prod | Add `notification_preferences` column to profiles**

- **Scope**: database
- **Risk**: low
- **Verification**: `SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notification_preferences'`
- **Rollback hint**: Run migration `20251227000000_rollback_notification_prefs.sql` via Supabase CLI

---

## Principles

- **Brevity**: One entry per change, one line summary
- **Factual**: No opinions, no explanations
- **Actionable**: Rollback hint must be immediately usable
- **Timely**: Log within 24 hours of change

## Maintenance

- Keep entries in reverse chronological order (newest first)
- Archive entries older than 90 days to `CHANGELOG_ARCHIVE.md`
- Review weekly to ensure completeness












