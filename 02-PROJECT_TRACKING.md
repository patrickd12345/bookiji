# 📍 Bookiji Unified Feature Roadmap

## ✅ Status vs. Recommendations (Market Analysis Alignment)

### Positioning & Offering
- **DONE**: Universal booking narrative sharpened; last-minute/instant rebooking implemented; $1 commitment fee clarified in copy and tests.
- **IN FLIGHT**: Support/Triage flow + RAG candidate tagging (admin UX + thresholds).
- **TO DO (Decision)**: Pick 2–3 hero categories for launch SEO + supply focus (e.g., mobile beauty, handyman, music tutors).

### Pricing & Fees
- **DONE**: $1 customer fee model (charged on confirmed booking).
- **TO DO (Decision)**: Vendor fee lane. Recommend 5–8% intro with founder deals; A/B later toward 10–12% if retention holds. Align TOS, receipts, emails.

### Trust, Policy, & Ops
- **DONE**: Copy reflects no in-app cancellation (exchange phone numbers; settle directly).
- **TO DO (Spec)**: SLA/etiquette micro-policy: response window, no-show etiquette, refund edge cases.

### Growth Loops (SEO/Content)
- **DONE**: Tech hygiene—weekly sitemap/robots/ads.txt audit; JSON-LD vendor schema.
- **IN FLIGHT**: “Quality Bar” + CI keeps SEO/a11y/perf visible.
- **TO DO (Build)**:
  - City+service landing generator (e.g., `/montreal/handyman`, `/brossard/makeup-artist`) with unique blurbs.
  - Lightweight reviews/testimonials module (seed with provider quotes possible).
  - Provider minisites (claimable profile with CTA) to create backlink flywheel.

### Product & A11y/Perf
- **DONE**: Dialog focus-trap + axe WCAG AA; perf smoke with trace; coverage; weekly digest; badges.
- **IN FLIGHT**: Admin console for ticket approval/“RAG candidate” detection (UI & thresholds).
- **TO DO (Nice win)**: One-click provider onboarding flow (email → claim → publish). ICS links shipping.

### Data & Insights
- **DONE**: CI summaries for a11y/perf/coverage; warning burn-down; auto-fix pack (Prettier, ESLint --fix, codemods).
- **TO DO (Metrics)**: Minimal KPI pipeline: supply added, first bookings, conversion to confirmed, rebooking rate, time-to-first-response.

### 2-Week Sprint (Concrete)
- **Go-to-Market Focus**:
  - Lock hero categories (2–3) + pilot city (Greater Montreal/Brossard).
  - Generate SEO landers (service × city), add to sitemap.
- **Supply Onboarding**:
  - Ship provider signup/claim flow (public profile + availability block; manual OK to start).
  - Draft outreach pack (DM/email template + one-pager); recruit 20–30 providers.
- **Admin/RAG Console v1**:
  - Ticket list with: “Mark as KB/RAG,” frequency flag, solved flag, threshold setting.
  - Nightly job: export flagged tickets to KB index.
- **Fees & Policy**:
  - Decide vendor fee (start 5–8%), update TOS/receipts, and add fee disclosure in vendor onboarding.

### Risks to Watch (Pragmatic)
- Too broad at launch → thin SEO, slow supply density. Mitigation: hero-category focus.
- Policy gaps → review disputes. Mitigation: concise SLA/no-show rules in confirmation emails.
- Provider friction → minimize claim/publish steps; help providers look good fast.

## 🚀 **Phase 0 — Launch Blockers (Pre-Go-Live / Day-0 Essentials)**

**Focus:** Trust, reliability, and clarity at launch. These are non-negotiable before public beta.

---

### 🔔 **Notifications v1 (Email/SMS)**
- [ ] **SendGrid/Resend + Twilio adapters** wired to booking lifecycle
- [ ] **Retry + DLQ pipeline** with templates for all flows
  - [ ] Verify email, password reset
  - [ ] Booking created/updated/cancelled
  - [ ] Review reminders
- [ ] **SLA:** 99% delivery <30s, logged + auditable

### 💸 **$1 Commitment Fee: Refund Path**
- [x] **Booking state machine** live (requested → accepted → confirmed → completed | no_show | cancelled)
- [ ] **Auto-refund $1** on completed bookings
- [ ] **Admin override** with audit log
- [ ] **Idempotency guard** on Stripe refunds

### 📚 **Help Center MVP**
- [ ] **Seed 10 core articles** (how booking works, $1 fee, cancellation, refunds, onboarding, privacy, etc.)
- [ ] **Link contextual help** inside checkout, tours, and dashboard
- [ ] **Search fully functional** with no dead-ends

### 🧭 **Role Clarity & First-Run Tours**
- [ ] **Role selection on signup** (customer/provider toggle)
- [ ] **Replayable tours** with 2–3 contextual tooltips
  - [ ] $1 fee explanation
  - [ ] Privacy radius details
  - [ ] Broadcast system overview
- [ ] **Hallway test:** 5/5 users complete booking without help

### 🛡️ **Security & Data Protections**
- [ ] **Supabase RLS verified** (negative tests)
- [ ] **CSP headers, secure cookies, API rate limits**
- [ ] **Daily DB backup job** + restore drill

### 🧱 **Code Modularity & Reusability Audit**
- [ ] **Scan codebase for reusable components** (UI, utilities, business logic)
- [ ] **Modularize external-ready modules** (auth flows, map abstractions, AI chat, booking engine)
- [ ] **Create extraction plan** for future projects (component library, shared utilities, APIs)
- [ ] **Document reusable patterns** and architectural decisions for knowledge transfer

---

## ⏳ **Phase 1 — Launch Polish (Weeks 1–2 Post-Beta)**

**Focus:** Polish, visibility, and quick iteration on early adoption.

---

### 📊 **Analytics v1 (Conversion & Errors)**
- [ ] **Funnel tracking** (visit → search → select time → $1 auth → confirmed)
- [ ] **Dashboards** for conversion, drop-offs, and 5xx spikes
- [ ] **Error alerts** to Slack/email for notification failures, refund stuck

### 📖 **Documentation Reality Check**
- [ ] **Marketing/README updated** to reflect only live features
- [ ] **Public roadmap page** with "What's next" section
- [ ] **Changelog started**

### ✅ **Already Complete**
- [x] ⚡ **Provider ↔ Customer Messaging** (baseline)
- [x] 🗺️ **Interactive Map v1** with jittered centroids & clusters

---

## 📈 **Phase 2 — Trust & Scale (30–90 Days)**

**Focus:** Reinforce Bookiji's trust moat and handle early growth.

---

### 🤝 **Dispute & No-Show Tooling**
- [ ] **Publish dispute policy**
- [ ] **"Report issue" on booking detail** → dispute ticket
- [ ] **Admin triage UI** with canned outcomes (refund, credit, warning)
- [ ] **SLA measurement + logging**

### 🔔 **Notifications v2**
- [ ] **User preferences** (email/SMS/push/quiet hours)
- [ ] **Digest batching** for non-critical items
- [ ] **PWA web push notifications**

### 🌍 **i18n Completeness**
- [ ] **Audit all locales**, fill missing strings (FR/ES/AR/RTL check)
- [ ] **Smoke test full booking flow** in FR/ES/AR

### ⚡ **Performance & Cost Guardrails**
- [ ] **Cache geo/PPP data**, index search queries, lazy-load maps
- [ ] **P95 TTFB <300ms SSR**; P95 interactive map paint <2.5s on 4G
- [ ] **AI assistant:** queue + timeout fallbacks, latency monitoring

### ✨ **Differentiators Kick-In**
- [ ] **Dynamic Commitment Fee** (configurable by service type)
- [ ] **Provider "⚡ Boost Availability" toggle** for last-minute slots
- [ ] **Micro-Loyalty System** (fee waiver after X bookings, credits, streaks)
- [ ] **Trust Layer 2.0** (verified badges, masked contact info, auto refund/rebook)

---

## 🌟 **Phase 3 — Differentiators & Ecosystem (3–9 Months)**

**Focus:** Retention, delight, and market distinction.

---

### 🎁 **Bundle Booking Packages**
- [ ] **AI suggests combos** ("Moving Pack: movers + cleaners + handyman")
- [ ] **Cross-sell add-ons** in booking flow

### ⭐ **AI Reputation Graph**
- [ ] **Cross-category reputation score** for providers
- [ ] **Universal trust badge** visible across verticals

### 🎤 **Voice Input in Chat**
- [ ] **Web Speech API integration** → confirm transcription → book

### 📸 **Image Attachments for Jobs**
- [ ] **Users upload photo** (leak, haircut style) → AI extracts booking details

### 📂 **Rich Provider Profiles**
- [ ] **Portfolios, service tags, minimum pricing**
- [ ] **Supports discovery + boosts trust**

---

## 🚀 **Phase 4 — Market Expansion & Infrastructure (9–24 Months)**

**Focus:** Position Bookiji as the Stripe of bookings.

---

### 🔗 **Cross-Platform Booking API**
- [ ] **Widgets/embeds** for hotels, coworking apps, concierge services
- [ ] **"Powered by Bookiji" brand**, partner integrations

### 🔮 **Predictive Availability**
- [ ] **AI forecasts open slots** before they're published
- [ ] **Users can "request hold"** for predicted availability

### 🤖 **AI Concierge Mode**
- [ ] **Natural language life-assistant booking:** "Plan my housewarming"
- [ ] **Multi-day, multi-service flows** automated by AI

### 👥 **Social/Referral Layer**
- [ ] **Invite friends** → booking credits
- [ ] **Optional "friends/neighbors booked here"** trust signals

---

## 🏆 **Strategic Flow Summary**

| **Phase** | **Timeline** | **Focus** | **Key Outcome** |
|-----------|--------------|-----------|-----------------|
| **Phase 0** | Pre-Launch | **Bulletproof trust + credibility** | Launch-ready platform |
| **Phase 1** | Weeks 1-2 | **Polish + iteration** | Early adoption success |
| **Phase 2** | Months 1-3 | **Trust moat + early differentiators** | Loyalty, verified badges, boost features |
| **Phase 3** | Months 3-9 | **Delight + ecosystem stickiness** | Bundles, voice, AI reputation graph |
| **Phase 4** | Months 9-24 | **Infrastructure + domination** | API, predictive AI, concierge mode |

---

**Last Updated:** January 17, 2025  
**Status:** 🚀 **ROADMAP READY - PHASE 0 IMPLEMENTATION IN PROGRESS**