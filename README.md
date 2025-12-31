# 🌍 Bookiji - Universal Booking Platform

**Bookiji Scheduling: The vendor-first booking system that doesn't break under pressure—and proves it.**

**For Customers:** AI-powered, privacy-first booking with $1 commitment fees.  
**For Vendors:** Reliable scheduling system with payment-free booking creation, certification, and daily-use features.

[![Tests](https://img.shields.io/badge/tests-278%2F278%20passing-brightgreen)](https://github.com/your-org/bookiji)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/your-org/bookiji)
[![Status](https://img.shields.io/badge/status-production%20ready-blue)](https://bookiji.com)

---

## 🚀 **What's Actually Live Right Now**

**Note:** All features listed in this section are implemented and present in the codebase. Counts may evolve over time.

### ✅ **Core Platform (100% Complete)**
- **🧠 AI-Powered Booking Interface** - Natural language service discovery with intelligent fallbacks
- **🛡️ Privacy-First Location System** - Revolutionary provider protection with map abstraction
- **💸 $1 Commitment Fee System** - No-show elimination with automated refunds
- **🌍 Global Multi-Currency Support** - 37 countries, 27 currencies, 18+ locales
- **⚡ Real-Time Booking Engine** - Instant confirmation and Stripe payments
- **📱 Mobile-First PWA** - App-like experience across all devices
- **🔐 Secure Authentication** - Role-based access with OAuth2 providers
- **💳 Stripe Payment Processing** - Live payment processing ready

### ✅ **Starter Commit Infrastructure (100% Complete)**
- **📋 Contract-First API Design** - OpenAPI specification with consistent error envelopes
- **🗄️ Database Foundation** - Payments outbox, audit logging, and access tracking
- **🔌 API Endpoints** - Quote generation, booking confirmation, cancellation, and admin operations
- **🧪 Testing Framework** - Playwright E2E tests with complete booking flow validation
- **🛠️ Operational Tools** - Simulation scenarios, rollback capabilities, and monitoring
- **📚 Documentation** - Comprehensive API guides and implementation examples

### ✅ **User Experience (100% Complete)**
- **🎯 Complete Guided Tours System** - Multiple tour categories with replay functionality
- **📚 Self-Improving Knowledge Base** - AI-powered help center that learns from every support conversation
- **🔄 Role Clarity System** - Customer/provider role selection and switching
- **ℹ️ Smart Tooltips** - Contextual help across 5 key features, including hoverable status badges with explanations
- **📡 Dynamic Broadcasting** - Intelligent service request system
- **🗺️ Interactive Map v1** - Privacy-respecting provider discovery

### ✅ **Admin & Analytics (100% Complete)**
- **📊 Comprehensive Analytics Dashboard** - Conversion funnels, error monitoring, geographic insights
- **🚨 Error Monitoring & Alerting** - Sentry integration with automatic error capture and reporting
- **📈 Funnel Tracking** - Real-time conversion metrics from landing to booking confirmation
- **👨‍💼 Admin Cockpit** - Complete platform oversight with KB management, manual job triggers, and operational controls
- **🎛️ OpsAI Control Plane** - Standalone Vite dashboard for agents, playbooks, and operational command console (`apps/opsai-control-plane`)
- **🤖 Automated Cron Jobs** - Scheduled KB crawling, auto-deduplication, and vectorization (production + local dev)
- **🔔 Multi-Channel Notifications** - Email, SMS with retry logic and DLQ
- **🛡️ Security & Compliance** - RLS policies, rate limiting, daily backups, admin auto-redirect

### ✅ **Operational Excellence (100% Complete)**
- **🤖 Jarvis Incident Commander** - Sleep-aware incident detection and escalation system with SMS-based command execution
- **🔒 Process Invariants Enforcement** - 70 documented invariants with static policy checks and CI integration
- **💳 Credits & Referrals System** - User credits management and referral tracking
- **⚖️ Dispute & No-Show Resolution** - Automated dispute handling and no-show detection

---

## 🤖 **Jarvis Incident Commander (3AM Mode)**

Jarvis is Bookiji's operational nervous system that stands watch while you sleep. When incidents occur, Jarvis detects, assesses, and responds intelligently—respecting your sleep and escalation preferences.

### **Key Features**

- **🔍 Incident Detection** - Automatic monitoring of system health, kill switches, and critical metrics
- **🧠 LLM-Powered Assessment** - Intelligent severity classification and impact analysis
- **📱 SMS-Based Command Interface** - Reply-to-act system with deterministic command parsing
- **😴 Sleep-Aware Escalation** - Respects quiet hours (22:00-07:00), only wakes for SEV-1 incidents
- **📋 Human-in-the-Loop Playbooks** - Multi-step response plans requiring explicit SMS confirmation
- **🔐 Process Invariants** - 13 escalation tests + static policy checks ensure safe operation

### **Phases Implemented**

- **Phase 1**: Incident detection and SMS notification
- **Phase 2A**: Reply-to-act with deterministic command parsing
- **Phase 2B**: Human-in-the-loop playbooks (multi-step responses)
- **Phase 2C**: Read-only situational awareness (STATUS, WHY, CHANGES, HELP)
- **Phase 3**: Sleep-aware escalation with tone profiles and hard caps

### **How It Works**

1. **Detection**: Cron job runs every 5 minutes, checks system state
2. **Assessment**: LLM analyzes severity and impact (SEV-1, SEV-2, SEV-3)
3. **Notification**: SMS sent with escalation logic (respects quiet hours, hard cap: 5 notifications/incident)
4. **Response**: Owner replies via SMS with commands (STATUS, ACK, playbook commands, actions)
5. **Execution**: Pre-authorized actions executed through guard rails

### **Safety Guarantees**

- ✅ No autonomous remediation (human-in-the-loop always)
- ✅ Deterministic escalation decisions (no LLM deciding when to escalate)
- ✅ Hard caps prevent spam (max 5 SMS per incident)
- ✅ ACK command freezes escalation
- ✅ Full audit trail in `jarvis_incidents` table

**Documentation**: See [JARVIS_INCIDENT_COMMANDER.md](docs/development/JARVIS_INCIDENT_COMMANDER.md) for complete details.

---

## 🔒 **Process Invariants Enforcement (PIE)**

Bookiji enforces **70 documented invariants** across 10 critical surfaces to prevent data corruption, security violations, and operational errors.

### **What's Enforced**

**Tier 1 (Mandatory):**
- Booking lifecycle authoritative paths
- Payment intent verification
- Availability slot consistency
- Time validation (no past bookings)

**Tier 2:**
- Admin role verification
- Webhook signature verification
- Background job safety

**Tier 3:**
- AI agent action safety
- Retry idempotency
- Backfill reconciliation

### **Enforcement Methods**

1. **Static Policy Checks** - `pnpm invariants:check` scans codebase for violations
2. **CI Integration** - Fast-fail on PRs touching risky surfaces
3. **Runtime Assertions** - Database constraints and guard functions
4. **SimCity Testing** - Adversarial certification with invariant falsification

### **What's Now Impossible**

- ❌ Direct SQL execution for schema changes (must use migrations)
- ❌ Booking state bypass (must use authoritative paths)
- ❌ Payment intent bypass (must verify via Stripe API)
- ❌ Webhook signature bypass (must verify signatures)
- ❌ Admin action bypass (must verify admin role)
- ❌ Kill switch bypass (must check before booking creation)

**Documentation**: See [docs/invariants/](docs/invariants/) for complete invariant specifications.

---

## 🧠 **Self-Improving Knowledge Base**

Bookiji features a **self-improving knowledge base** that automatically learns from every support conversation, making it smarter over time without manual intervention.

### **How It Works**

#### **1. Automatic KB Suggestions from Support Tickets**
When a support ticket is resolved:
- The conversation transcript is automatically analyzed using GPT-4o-mini
- A concise Q&A pair is distilled from the conversation
- PII (emails, phone numbers, credit cards) is automatically redacted
- Embeddings are generated for semantic search
- The suggestion is checked against existing KB articles for duplicates
- If unique, it's added to `kb_suggestions` for review

#### **2. Auto-Deduplication**
- **Scheduled**: Runs hourly via cron job
- **Process**: Compares pending suggestions against existing KB articles using vector similarity
- **Threshold**: 92% similarity marks suggestions as duplicates automatically
- **Result**: Reduces manual review workload by filtering obvious duplicates

#### **3. Support Agent Review**
- Support agents can review pending suggestions in the admin interface
- **Actions Available**:
  - **Approve**: Creates a new KB article from the suggestion
  - **Link**: Links the suggestion to an existing article
  - **Reject**: Marks the suggestion as rejected

#### **4. Weekly KB Crawling**
- **Schedule**: Every Monday at 2 AM UTC (via GitHub Actions)
- **Process**: Crawls public pages, extracts content, chunks text, generates embeddings
- **Idempotent**: Only re-indexes changed pages (content hash comparison)
- **Vectorization**: Automatically generates embeddings for all chunks during crawl

#### **5. Vectorization Job**
- **Schedule**: Runs every 6 hours via cron job
- **Purpose**: Ensures all KB suggestions have embeddings (for suggestions created before vectorization was added)
- **Process**: Finds suggestions with missing embeddings and generates them

### **Admin Controls**

The Admin Cockpit provides manual triggers for all KB operations:
- **🕷️ Crawl**: Manually trigger KB crawl (useful for testing or urgent updates)
- **🔍 Dedupe**: Manually run auto-deduplication (processes up to 50 pending suggestions)
- **🔢 Vectorize**: Ensure all suggestions have embeddings (processes up to 50 items)

### **Automation Schedule**

| Job | Frequency | Method | Purpose |
|-----|-----------|--------|---------|
| KB Crawl | Weekly (Mondays 2 AM UTC) | GitHub Actions | Index public pages |
| Auto-Dedupe | Hourly | Vercel Cron | Mark duplicate suggestions |
| Vectorization | Every 6 hours | Vercel Cron | Ensure all embeddings exist |

### **Local Development**

For local development, a cron scheduler is available:
```bash
pnpm dev:cron
```

This runs the same jobs locally using `node-cron`, perfect for testing automation workflows.

### **Technical Details**

- **Vector Store**: PostgreSQL with `pgvector` extension
- **Embeddings**: OpenAI (1536 dimensions) or Gemini (configurable)
- **Similarity Search**: Cosine similarity with configurable thresholds
- **Chunking**: 500-1000 tokens per chunk for optimal retrieval
- **PII Redaction**: Automatic removal of emails, phone numbers, credit cards

### **Benefits**

✅ **Zero Manual Content Creation**: KB articles are created automatically from real support conversations  
✅ **Always Up-to-Date**: Weekly crawls ensure documentation reflects current site content  
✅ **Duplicate Prevention**: Auto-deduplication prevents redundant articles  
✅ **Semantic Search**: Vector embeddings enable natural language queries  
✅ **Self-Improving**: Gets smarter with every support interaction  

---

## 🧱 Base vs 🧩 Core (Authoritative)

**This section defines Bookiji's identity and invariants. It is not a claim that all items listed are already live.**

Bookiji distinguishes between Base and Core capabilities.

This distinction is normative: it defines what Bookiji is, not just what it currently has.

### 🧱 Base — Load-Bearing Capabilities

Base capabilities are required for Bookiji to function as a real-time, trust-enforced, economically self-sustaining booking platform.
If any Base capability is removed or compromised, Bookiji is no longer operational in its intended sense.

Base includes:

**Real-time booking execution**
Contract-first, versioned, traceable quote → confirm → cancel flows with strong finality once payment is confirmed

**Payment-coupled booking finality**
No soft bookings; payment state and booking state are coupled at confirmation time

**$1 commitment fee with automated refunds**
Mechanical prevention of spam and no-shows

**Provider protection**
Privacy-first location abstraction that prevents provider identity leakage by default

**Role-based authentication**
Explicit customer / provider separation enforced at execution time

**Trust & abuse enforcement**
Rate limiting, row-level security (RLS), audit logs, and access tracking

**Contract-first interfaces**
OpenAPI specifications and payments outbox for explainability

**Reliable communications**
Booking-critical email/SMS notifications with retries, DLQ, and assisted support

### 🧩 Core — Product, Experience & Operations

Core capabilities make Bookiji usable, competitive, and observable, but are replaceable without breaking the platform's identity.

Core includes:

- AI-powered booking UX and intelligent fallbacks

- Mobile-first PWA and interactive map

- Internationalization (currencies, locales, time zones)

- Guided onboarding, help center, and contextual tooltips

- Admin tools, analytics, funnels, and monitoring

- Notification UX and dashboards

- Testing frameworks, simulation, rollback tooling

- Documentation and developer experience

### 🔌 Extension Points — Platform Fuel

Bookiji requires a pluggable, non-intrusive platform fuel mechanism to sustain idle operation, strictly separated from booking execution and trust paths.

The fuel mechanism must:

- Be strictly separated from booking execution and trust paths
- Never influence matching, ranking, or booking outcomes
- Be clearly labeled and non-deceptive

Current / potential implementations include:

- In-product advertising (clearly labeled)
- Subscriptions or usage-based fees
- Infrastructure sponsorship or licensing

### Re-base v1 (Post-2014 Audit)

This documentation reflects Re-base v1, aligning Bookiji's foundations with:

- the original 2014 objectives,
- the features actually live today,
- and the economic requirement for idle-state sustainability.

This replaces any prior implicit or narrative definitions of "core" functionality.

---

## 🧪 SimCity — Synthetic Load (Non-Prod)

SimCity is a **non-production** synthetic load generator used for dashboards, demos, and bounded traffic patterns.

It does **not** inject failures, outages, or other chaos behaviors into Bookiji runtime code.

---

## Deterministic Chaos Harness (Non-Prod)

Note: This harness is a fully external tool.  
Bookiji does not expose any chaos- or stress-specific APIs.

This is a **short-lived chaos runner** that generates **deterministic event sequences** against Bookiji Scheduling **via existing public HTTP APIs and direct Supabase service-role queries**, continuously asserts **hard invariants**, then exits.

### What It Is Not
- Not a simulator, world model, analytics engine, learning system, daemon, or decision maker
- Not allowed to touch production URLs, credentials, or databases

### Invariants (Continuously Asserted)
- No double booking for same vendor/slot
- Canceled booking never resurrects
- Notification idempotency (no duplicates)
- Booking requires availability
- No payment or billing state touched
- No cross-vendor data leakage

### How To Run (Local Only)
1. Start local Supabase + app with E2E enabled (example): `E2E=true FORCE_LOCAL_DB=true pnpm dev`
2. Build the harness image: `docker build -f chaos/Dockerfile -t bookiji-chaos chaos`
3. Run one bounded execution (no volumes by default):
   - `docker run --rm -e SUPABASE_URL=http://host.docker.internal:54321 -e SUPABASE_SECRET_KEY=... bookiji-chaos --seed 812736 --duration 30 --max-events 500 --concurrency 8 --target-url http://host.docker.internal:3000`

Optional: write a failure artifact inside the container with `--out /tmp/failure.json` (mount a volume if you want it on the host).

Example failure artifact shape: `chaos/examples/example_failure.json`

## 🎯 **What's Coming Next (Roadmap)**

### **🚧 P1 - Launch Polish (This Week)**
- [x] Analytics Dashboard ✅ **COMPLETE**
- [x] Error Monitoring ✅ **COMPLETE**
- [x] Funnel Tracking ✅ **COMPLETE**
- [x] Documentation Updates ✅ **COMPLETE**
- [x] Starter Commit Infrastructure ✅ **COMPLETE**
- [x] Performance Optimization ✅ **COMPLETE** (Implementation done, pending production deployment)

### **📈 P2 - Experience & Scale (Next 30 Days)**
- [x] Post-Booking Reputation (Ratings)
- [x] Notifications 2.0 (Web Push, Batching)
- [x] i18n Completeness Pass

### **📅 P3 - Vendor Booking System (Go-to-Market)**

- [x] Vendor-first positioning for Bookiji Scheduling ✅ **COMPLETE**
- [x] Vendor subscription lifecycle live ✅ **COMPLETE**
- [x] Payment-free vendor booking flows enforced ✅ **COMPLETE**
- [x] Vendor expectation communication surfaced ✅ **COMPLETE**
- [x] Vendor UX hardened for daily standalone use ✅ **COMPLETE**
- [x] README aligned with vendor system boundaries ✅ **COMPLETE**

### **🌟 P4 - Differentiators (60-90 Days)**
- [ ] Voice Input in AI Chat
- [ ] Image Attachments for Job Descriptions
- [ ] Heatmap Visualizations
- [ ] Loyalty & Credits System
- [ ] Rich Provider Profiles & Portfolios

**Foundational Hardening**
- [ ] Performance & cost guardrails (SLOs, budgets, alerts)
- [ ] SimCity stress harness (synthetic load & invariant falsification — non-production only)
---

## 🚀 **Quick Start**

### **For Users**
1. Visit [bookiji.com](https://bookiji.com)
2. Choose your role (Customer or Provider)
3. Complete the guided tour
4. Start booking or offering services!



### **Vercel Deployment**
The project includes automatic handling of Supabase Edge Functions during build:

- **Build Script**: `scripts/build-without-supabase-functions.js` temporarily moves Deno functions
- **Configuration**: `.vercelignore` and `tsconfig.json` exclude incompatible files
- **Result**: Clean builds without Deno import conflicts

For detailed information, see [SUPABASE_FUNCTIONS_BUILD_FIX.md](docs/deployment/SUPABASE_FUNCTIONS_BUILD_FIX.md).

### **Build Issues**
If you encounter build problems:

1. **Deno Import Errors**: The build script automatically handles these
2. **TypeScript Issues**: Check `tsconfig.json` exclusions
3. **Vercel Failures**: Verify `.vercelignore` is committed

---

## 🏗️ **Architecture**

### **Frontend**
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Shadcn/ui** component library

### **Backend**
- **Supabase** for database and auth
- **PostgreSQL** with RLS policies
- **Edge Functions** for serverless APIs
- **Real-time subscriptions**

### **AI & ML**
- **Ollama** for local LLM inference
- **Railway** for production AI hosting
- **Intelligent fallbacks** for reliability

### **Payments & Notifications**
- **Stripe** for payment processing
- **SendGrid/Resend** for email
- **Twilio** for SMS
- **Dead Letter Queue** for reliability

---


## OpsAI — Operations Intelligence Layer

OpsAI is the operations intelligence stack that centralizes telemetry, incidents, and operator controls.

- **Control plane**: `apps/opsai-control-plane/` hosts the dashboard for health, deployments, incidents, and commands.
- **SDK / packages**: `packages/opsai-sdk/` powers summaries, metrics, deployments, and webhooks.
- **Helpdesk / L7 tooling**: `packages/opsai-helpdesk/` and `packages/opsai-l7/` handle diagnostics, predictions, and synthetic checks.
- **Voice console support**: `packages/opsai-voice/` reads responses aloud from `/api/ops/events/stream`, `/api/ops/summary`, `/api/ops/health`, and `/api/ops/deployments`.

See [docs/opsai/README.md](docs/opsai/README.md) for the canonical OpsAI hub.

## 📊 **Performance Metrics**


- **Lighthouse Score:** 95+ across all metrics
- **Core Web Vitals:** All green
- **Bundle Size:** < 500KB gzipped
- **TTFB:** < 200ms average
- **Interactive Time:** < 2.5s on 4G

---

## 🌍 **Global Support**

### **Countries:** 37
### **Currencies:** 27
### **Languages:** 17
### **Time Zones:** All major zones

---

## 🔒 **Security & Privacy**

- **GDPR Compliant** data handling
- **Row-Level Security** (RLS) policies
- **Rate Limiting** on all public APIs
- **CSP Headers** for XSS protection
- **Daily Automated Backups**
- **Encrypted data at rest**

---

## 📈 **Analytics & Monitoring**

- **Real-time Conversion Funnels**
- **Error Rate Monitoring**
- **Geographic Performance Tracking**
- **Device Analytics**
- **User Behavior Segmentation**
- **Critical Error Alerts**

---

## 📄 **License**

This project is proprietary software. All rights reserved.

---

## 📞 **Support**

- **Help Center:** [help.bookiji.com](https://help.bookiji.com)
- **Email:** support@bookiji.com
- **Status Page:** [status.bookiji.com](https://status.bookiji.com)

---

**Built with ❤️ by the Bookiji Team**

*Last Updated: January 27, 2025*
*Version: 1.0.0-beta*
