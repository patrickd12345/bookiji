---
title: KB System Setup Guide
locale: en
section: faq
---

# Knowledge Base System Setup Guide

Complete setup instructions for the Bookiji Knowledge Base system.

## Prerequisites

- Node.js 18+ and pnpm installed
- Supabase project with database access
- Environment variables configured
- Database migrations applied

## Environment Setup

### 1. Required Environment Variables

Create a `.env.local` file in your project root with these variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Get Supabase Credentials

1. **Go to your Supabase dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Go to Settings > API**
4. **Copy the Project URL** (SUPABASE_URL)
5. **Copy the service_role key** (SUPABASE_SERVICE_ROLE_KEY)

⚠️ **Important**: Use the `service_role` key, not the `anon` key, as it has the necessary permissions to manage KB articles.

### 3. Verify Environment Variables

Test that your environment variables are set correctly:

```bash
# Windows PowerShell
echo $env:SUPABASE_URL
echo $env:SUPABASE_SERVICE_ROLE_KEY

# Linux/macOS
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

## Database Setup

### 1. Apply Migrations

The KB system requires these database migrations:

```bash
# Apply all migrations
supabase db push

# Or apply specific migration
supabase migration up
```

### 2. Verify Database Schema

Check that the `kb_articles` table exists:

```sql
-- Connect to your Supabase database and run:
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'kb_articles';
```

### 3. Verify Triggers

Ensure the KB change trigger is active:

```sql
-- Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'kb_articles';
```

## Installation

### 1. Install Dependencies

```bash
# Install required packages
pnpm add -D tsx gray-matter
pnpm add @supabase/supabase-js
```

### 2. Verify Installation

Check that the scripts are available:

```bash
pnpm run test-kb
```

This should parse your KB documents without errors.

## Usage

### 1. Test the System

First, test that everything works without database interaction:

```bash
pnpm run test-kb
```

Expected output:
```
Discovered 6 files. Parsing…
PARSED: [en/faq] AI Features and Capabilities
PARSED: [fr/policy] Connexion Stripe et empreinte de 1$
...
Test completed successfully! Parsed 6 files.
```

### 2. Import to Database

Once testing passes, import to your database:

```bash
pnpm run bootstrap-kb
```

Expected output:
```
Discovered 6 files. Importing…
INSERTED: [en/faq] AI Features and Capabilities
INSERTED: [fr/policy] Connexion Stripe et empreinte de 1$
...
Done.
┌─────────┬──────────┐
│ (index) │ Values   │
├─────────┼──────────┤
│ inserted│ 6        │
│ updated │ 0        │
│ skipped │ 0        │
│ errors  │ 0        │
└─────────┬──────────┘
```

### 3. Verify Database Import

Check that articles were imported:

```sql
-- Count total articles
SELECT COUNT(*) FROM kb_articles;

-- View article details
SELECT title, locale, section, created_at 
FROM kb_articles 
ORDER BY created_at DESC;
```

## Troubleshooting

### Common Issues

#### 1. Environment Variables Not Set

**Error**: `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`

**Solution**: 
- Verify `.env.local` file exists
- Check variable names are correct
- Restart terminal after setting variables

#### 2. Database Connection Failed

**Error**: `Connection failed` or `Authentication failed`

**Solution**:
- Verify SUPABASE_URL format
- Check service_role key is correct
- Ensure database is accessible

#### 3. Migration Errors

**Error**: `relation "kb_articles" does not exist`

**Solution**:
- Run `supabase db push` to apply migrations
- Check migration files are in correct order
- Verify database connection

#### 4. Permission Denied

**Error**: `permission denied for table kb_articles`

**Solution**:
- Use service_role key (not anon key)
- Check RLS policies are configured correctly
- Verify user has necessary permissions

### Debug Commands

```bash
# Test environment variables
node -e "console.log('SUPABASE_URL:', process.env.SUPABASE_URL)"

# Test database connection
pnpm run test-kb

# Check database status
supabase status

# View database logs
supabase logs
```

## Production Deployment

### 1. Environment Variables

Set environment variables in your production environment:

```bash
# Railway
railway variables set SUPABASE_URL=https://...
railway variables set SUPABASE_SERVICE_ROLE_KEY=...

# Vercel
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Docker
docker run -e SUPABASE_URL=... -e SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Bootstrap Knowledge Base
  run: pnpm run bootstrap-kb
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### 3. Scheduled Updates

Set up automated KB updates:

```bash
# Cron job example (daily at 2 AM)
0 2 * * * cd /path/to/project && pnpm run bootstrap-kb
```

## Monitoring and Maintenance

### 1. Health Checks

Regular verification commands:

```bash
# Check KB system health
pnpm run test-kb

# Verify database connectivity
pnpm run bootstrap-kb

# Monitor database size
SELECT pg_size_pretty(pg_total_relation_size('kb_articles'));
```

### 2. Performance Monitoring

Track system performance:

```sql
-- Check article counts by section
SELECT section, COUNT(*) as count 
FROM kb_articles 
GROUP BY section;

-- Monitor embedding generation
SELECT COUNT(*) as total_articles,
       COUNT(embedding) as articles_with_embeddings
FROM kb_articles;
```

### 3. Backup and Recovery

Regular backup procedures:

```bash
# Export KB articles
pg_dump -t kb_articles your_database > kb_backup.sql

# Backup source files
tar -czf kb_source_backup.tar.gz docs/bookiji-kb/
```

## Support

### Getting Help

- **Documentation**: Check this guide and the main README
- **Issues**: Use the project issue tracker
- **Community**: Join the project discussion channels

### Useful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Markdown Guide](https://www.markdownguide.org/)

---

For additional support or questions, contact the development team or refer to the project documentation.

