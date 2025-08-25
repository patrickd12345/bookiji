# 🚢 Deployment

Production deployment guides, environment setup, and CI/CD procedures.

## 📚 Available Guides

### 🎯 **Launch Checklists**
- [**Pre-Beta Must-Haves**](./PRE_BETA_MUST_HAVES.md) - **🚨 CRITICAL: Essential modules before beta**
- [**Beta Launch Checklist**](./BETA_LAUNCH_CHECKLIST.md) - **FOCUSED: 48-hour beta launch plan**
- [**Production Go-Live Checklist**](./PRODUCTION_GO_LIVE_CHECKLIST.md) - **CRITICAL: Production launch after beta**

### 🔧 Environment Setup
- [Database Setup](./DATABASE_SETUP.md) - Database configuration
- [Supabase Migration Guide](./SUPABASE_MIGRATION_GUIDE.md) - Database migration procedures
- [Supabase Setup](./SUPABASE_SETUP.md) - Supabase configuration
- [Domain Configuration](./DOMAIN_CONFIGURATION.md) - Domain and SSL setup
- [Google Calendar Integration](./google-calendar-integration.md) - Calendar integration setup

### 📊 Monitoring & Analytics
- [Analytics Implementation Complete](./ANALYTICS_IMPLEMENTATION_COMPLETE.md) - Analytics system setup
- [Post Launch Analytics](./POST_LAUNCH_ANALYTICS.md) - Post-deployment analytics
- [Resilience Telemetry Setup](./RESILIENCE_TELEMETRY_SETUP.md) - Monitoring and alerting

## 🎯 **Deployment Phases**

### **Phase 0: Pre-Beta Must-Haves (Complete First!)**
- [Pre-Beta Must-Haves](./PRE_BETA_MUST_HAVES.md) - Essential modules checklist
- **Target:** 100% functional core platform
- **Focus:** Zero critical failures, polished user experience

### **Phase 1: Beta Launch (After must-haves complete)**
- [Beta Launch Checklist](./BETA_LAUNCH_CHECKLIST.md) - Complete beta launch plan
- **Target:** 100 beta users for feedback and validation
- **Focus:** Feature validation and user feedback collection

### **Phase 2: Production Go-Live (After beta success)**
- [Production Go-Live Checklist](./PRODUCTION_GO_LIVE_CHECKLIST.md) - Production launch plan
- **Target:** Public launch on bookiji.com
- **Focus:** Scale, performance, and business metrics

### **Phase 3: Post-Launch Optimization**
- Performance monitoring and optimization
- User feedback integration
- Infrastructure scaling
- Business metrics optimization

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

**🚨 Start with the [Pre-Beta Must-Haves](./PRE_BETA_MUST_HAVES.md) checklist first!**
