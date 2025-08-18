# 🚀 Bookiji Production Deployment Checklist

## 🔐 Environment Variables (Vercel Project Settings)

### Required Variables
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=pk_...
SUPABASE_SERVICE_ROLE_KEY=sk_...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App Configuration
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NODE_ENV=production

# AdSense
NEXT_PUBLIC_ADSENSE_APPROVAL_MODE=false
NEXT_PUBLIC_ADSENSE_GLOBAL_OFF=false
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-xxxxxxxxxxxxxxxx
NEXT_PUBLIC_ADSENSE_SLOT=1234567890

# Monitoring & Observability
SENTRY_DSN=https://...
ALERT_WEBHOOK_URL=https://hooks.slack.com/... # or Discord webhook
```

### Optional Variables
```bash
# Email (if using Resend)
RESEND_API_KEY=re_...

# Analytics (if using)
NEXT_PUBLIC_GA_ID=G-...
NEXT_PUBLIC_GTM_ID=GTM-...

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_CHAT=true
NEXT_PUBLIC_ENABLE_LOYALTY=true
```

## 🌐 Domain Configuration (Vercel Dashboard)

### 1. Add Domains
- [ ] Add apex domain: `yourdomain.com`
- [ ] Add www subdomain: `www.yourdomain.com`
- [ ] Verify DNS records are correct

### 2. SSL/HTTPS
- [ ] Enable HTTPS enforcement
- [ ] Set up www → apex redirect
- [ ] Verify SSL certificate is active

### 3. DNS Records
```bash
# Apex domain
yourdomain.com → Vercel IP

# www subdomain  
www.yourdomain.com → CNAME → cname.vercel-dns.com

# Email (if using custom domain)
mail.yourdomain.com → MX → your-email-provider.com
```

## 💳 Stripe Configuration

### 1. Webhook Endpoint
- [ ] Create webhook in Stripe Dashboard
- [ ] URL: `https://yourdomain.com/api/payments/webhook`
- [ ] Events to listen for:
  - `payment_intent.succeeded`
  - `payment_intent.failed`
  - `payment_intent.canceled`
  - `charge.succeeded`
  - `charge.failed`

### 2. Test Webhook
- [ ] Use Stripe CLI to test: `stripe listen --forward-to localhost:3000/api/payments/webhook`
- [ ] Verify webhook signature validation works
- [ ] Test with test cards

### 3. Production Keys
- [ ] Switch from test to live keys
- [ ] Update webhook endpoint to production URL
- [ ] Verify live mode is active

## 📊 Monitoring Setup

### 1. Uptime Monitor
- [ ] Add health check endpoint: `https://yourdomain.com/api/health`
- [ ] Set alert threshold: 1 minute downtime
- [ ] Configure notification channels

### 2. DLQ Alerting
- [ ] Set `ALERT_WEBHOOK_URL` for Slack/Discord
- [ ] Test DLQ threshold alerts (20+ items)
- [ ] Verify webhook delivery

### 3. Sentry Error Tracking
- [ ] Configure `SENTRY_DSN`
- [ ] Set up error alerting rules
- [ ] Test error reporting

## 🧪 Pre-Launch Testing

### 1. End-to-End Flow
- [ ] Customer registration → service search → booking → payment → confirmation
- [ ] Vendor onboarding → service setup → availability → receiving bookings
- [ ] Admin panel access and functionality

### 2. Payment Flow
- [ ] Test $1 commitment fee charging
- [ ] Verify webhook processing
- [ ] Check booking confirmation emails
- [ ] Test refund scenarios

### 3. Rate Limiting
- [ ] Verify Supabase rate limiting is active
- [ ] Test API endpoint throttling
- [ ] Check middleware rate limiting

### 4. Security Tests
- [ ] Admin routes protected (no header spoofing)
- [ ] CSP headers properly set
- [ ] RLS policies working
- [ ] Authentication flows secure

## 🚀 Deployment Steps

### 1. Preview Deployment
```bash
# Deploy to preview
vercel --prod

# Test on preview URL
# Verify all functionality works
# Check environment variables
```

### 2. Production Promotion
```bash
# Promote preview to production
vercel promote <preview-url>

# Verify production deployment
# Check domain routing
# Test all critical paths
```

### 3. Post-Deployment Verification
- [ ] Health check endpoint responding
- [ ] Database connections stable
- [ ] Stripe webhooks receiving events
- [ ] Email notifications working
- [ ] AI features operational

## 🔍 Post-Launch Monitoring

### 1. First 24 Hours
- [ ] Monitor error rates
- [ ] Check DLQ sizes
- [ ] Verify payment processing
- [ ] Monitor response times

### 2. First Week
- [ ] Review user feedback
- [ ] Monitor conversion rates
- [ ] Check system performance
- [ ] Review security logs

### 3. Ongoing
- [ ] Weekly performance reviews
- [ ] Monthly security audits
- [ ] Quarterly feature planning
- [ ] Continuous monitoring

## 🆘 Emergency Contacts

### Technical Issues
- **Database**: Supabase Dashboard
- **Payments**: Stripe Dashboard
- **Infrastructure**: Vercel Dashboard
- **Monitoring**: Sentry Dashboard

### Support Channels
- **Users**: help@yourdomain.com
- **Vendors**: support@yourdomain.com
- **Technical**: dev@yourdomain.com

---

## ✅ Checklist Status

- [ ] Environment variables configured
- [ ] Domain and SSL configured
- [ ] Stripe webhook active
- [ ] Monitoring alerts configured
- [ ] End-to-end testing completed
- [ ] Preview deployment successful
- [ ] Production deployment promoted
- [ ] Post-deployment verification complete

**Ready for Launch**: [ ] YES [ ] NO
**Launch Date**: _______________
**Launch Time**: _______________
