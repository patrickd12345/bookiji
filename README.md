# 🚀 Bookiji - Real-Time Booking Engine

> **Note:** Bookiji is an equal, independent project (tenant) in a monorepo alongside Ready2Race. See the root README for structure details.

> **The Uber for availability slots** - A next-gen real-time booking engine and last-minute availability platform.

## 🧠 What is Bookiji?

Bookiji is a revolutionary booking platform that transforms how people find and book last-minute availability slots. Instead of static calendars, we provide real-time, map-based discovery with booking guarantees.

### Core Philosophy
- **Real-time availability** over static calendars
- **Map-based discovery** for instant proximity matching
- **Booking guarantees** to prevent cancellations
- **API-first integration** for seamless provider onboarding

## 💸 Business Model
- **Customers pay a $1 commitment fee** to lock in and guarantee their booking.
- **Vendors pay a flat fee per booking, based on the most expensive service in the booking** (e.g., $1 for brushing, $3 for haircut, $10 for transformation).
- **If multiple services are booked, the vendor pays only the highest service fee.**
- **Booking is only guaranteed and contact info exchanged when the $1 is paid.**
- **No extra cost for customers beyond the $1 commitment fee.**

## 🔧 Core Features

### 🗺️ Live Availability Map
- Real-time bookable providers around you
- Filter by category, service, availability window
- Heatmaps for areas with more open spots
- Dynamic pin colors based on service type

### ⚡ Booking Guarantee Protocol
- Ensures confirmed bookings aren't cancelled
- Prioritizes providers with reliability history
- Deposit logic and instant confirmation tiers
- Cancellation protection with penalties

### 🔄 API-First Provider Integration
- Direct calendar integration (Google Calendar, Acuity, Zenoti)
- Batch ingestion + real-time sync
- Lightweight provider onboarding
- Availability-as-a-Service (AaaS) platform

### 📈 Urgency-Weighted Slot Ranking
- Proximity-based matching
- Service category optimization
- Real-time demand heatmaps
- AI-powered slot recommendations

## 🥊 Bookiji vs The World

| Feature | Bookiji | Typical Booking Apps |
|---------|---------|---------------------|
| Real-time availability map | ✅ Live & searchable | ❌ Static list view |
| Booking guarantees | ✅ Enforced logic | ❌ Often up to provider |
| Provider-side flexibility | ✅ Lightweight, API-based | ❌ Requires full portal |
| Cancellation protection | ✅ Penalties & backups | ❌ Usually none |
| Last-minute optimization | ✅ Core design principle | ❌ Afterthought or absent |

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Maps**: Mapbox GL JS
- **Real-time**: WebSocket/Socket.io
- **Database**: PostgreSQL with real-time subscriptions
- **API**: REST + GraphQL
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **Deployment**: Vercel

## 🎯 Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

## 📱 Key User Flows

1. **Provider Discovery**: Map-based search with real-time availability
2. **Instant Booking**: One-click booking with guarantee
3. **Smart Matching**: AI-powered slot recommendations
4. **Provider Dashboard**: Real-time availability management

## 🔮 Future Features

- AI-powered demand heatmaps
- Real-time slot auctions
- Chatbot interface
- Smart availability injection
- Bulk booking for power users
- Concierge services

---

*Built with spontaneity, real-time smarts, and a sprinkle of scheduling vengeance against flaky providers everywhere.* 😤 