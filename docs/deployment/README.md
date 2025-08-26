# 🚢 Deployment

Production deployment guides, environment setup, and CI/CD procedures.

## 📚 Available Guides

### 🚀 Production Deployment
- [Deployment Runbook](../DEPLOYMENT_RUNBOOK.md) - Complete production deployment guide
- [Deployment Checklist Critical Gotchas](../DEPLOYMENT_CHECKLIST_CRITICAL_GOTCHAS.md) - Critical deployment considerations
- [Domain Configuration](../DOMAIN_CONFIGURATION.md) - Domain and SSL setup
- [Google Calendar Integration](../google-calendar-integration.md) - Calendar integration setup

### 🔧 Environment Setup
- [Database Setup](../DATABASE_SETUP.md) - Database configuration
- [Supabase Migration Guide](../SUPABASE_MIGRATION_GUIDE.md) - Database migration procedures
- [Supabase Setup](../SUPABASE_SETUP.md) - Supabase configuration

### 📊 Monitoring & Analytics
- [Analytics Implementation Complete](../ANALYTICS_IMPLEMENTATION_COMPLETE.md) - Analytics system setup
- [Post Launch Analytics](../POST_LAUNCH_ANALYTICS.md) - Post-deployment analytics
- [Resilience Telemetry Setup](../RESILIENCE_TELEMETRY_SETUP.md) - Monitoring and alerting

## 🎯 Deployment Phases

### 1. Pre-Deployment
- Environment configuration
- Database setup and migration
- SSL and domain configuration
- Environment variable setup

### 2. Deployment
- CI/CD pipeline execution
- Database migration
- Service deployment
- Health checks

### 3. Post-Deployment
- Monitoring setup
- Analytics verification
- Performance testing
- User acceptance testing

## 🔐 Environment Variables

Critical environment variables for production:
- `DATABASE_URL` - Database connection string
- `NEXT_PUBLIC_APP_URL` - Public application URL
- `CANONICAL_HOST` - Canonical domain
- `INDEXNOW_KEY` - Search engine notification key

## 🚨 Critical Gotchas

- Always backup database before migration
- Test in staging environment first
- Verify SSL certificates are valid
- Check all environment variables are set

---

*Start with the [Deployment Runbook](../DEPLOYMENT_RUNBOOK.md) for complete deployment instructions.*
