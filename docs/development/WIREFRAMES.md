# 🎨 Bookiji Wireframes - Three-Panel UI

> **Note:** Bookiji is an equal, independent project (tenant) in a monorepo alongside Ready2Race. See the root README for structure details.

## 💸 Booking & Payment Flow
- **Customer pays a $1 commitment fee** to lock in and guarantee the booking.
- **Vendor pays a flat fee per booking, based on the most expensive service in the booking** (e.g., $1 for brushing, $3 for haircut, $10 for transformation).
- **If multiple services are booked, the vendor pays only the highest service fee.**
- **Booking is only guaranteed and contact info exchanged when the $1 is paid.**
- **No extra cost for customers beyond the $1 commitment fee.**

## 🎯 **Desktop Layout - Three Panels Side by Side**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                    HEADER                                   │
│  [Bookiji Logo]  [Search Bar]  [Filters]  [User Profile]  [Notifications]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   🗺️ MAP PANEL  │  │  📋 LIST PANEL  │  │  🎯 BOOK PANEL  │             │
│  │                 │  │                 │  │                 │             │
│  │  [Interactive   │  │  [Provider 1]   │  │  [Selected      │             │
│  │   Map View]     │  │  ⭐⭐⭐⭐⭐ 4.8    │  │   Provider]     │             │
│  │                 │  │  Dr. Sarah      │  │                 │             │
│  │  🔴 🔵 🟢 🟡    │  │  Dentist        │  │  📅 Available   │             │
│  │  [Pins showing  │  │  2.3 miles      │  │  Slots:         │             │
│  │   providers]    │  │  [Book Now]     │  │                 │             │
│  │                 │  │                 │  │  9:00 AM ✅     │             │
│  │  [Zoom Controls]│  │  [Provider 2]   │  │  10:30 AM ✅    │             │
│  │                 │  │  ⭐⭐⭐⭐ 4.2     │  │  2:15 PM ✅     │             │
│  │                 │  │  Hair Salon     │  │                 │             │
│  │                 │  │  1.8 miles      │  │  💳 [Book with  │             │
│  │                 │  │  [Book Now]     │  │   Guarantee]    │             │
│  │                 │  │                 │  │                 │             │
│  │                 │  │  [Provider 3]   │  │  🛡️ Booking     │             │
│  │                 │  │  ⭐⭐⭐⭐⭐ 4.9    │  │  Guarantee      │             │
│  │                 │  │  Plumber        │  │  Included       │             │
│  │                 │  │  3.1 miles      │  │                 │             │
│  │                 │  │  [Book Now]     │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📱 **Mobile Layout - Stacked Panels**

```
┌─────────────────────────┐
│        HEADER           │
│ [Logo] [Search] [Menu]  │
├─────────────────────────┤
│                         │
│  ┌─────────────────────┐ │
│  │   🗺️ MAP VIEW       │ │
│  │                     │ │
│  │  [Interactive Map]  │ │
│  │  🔴 🔵 🟢 🟡        │ │
│  │  [Provider Pins]    │ │
│  │                     │ │
│  │  [Filters: All ▼]   │ │
│  └─────────────────────┘ │
│                         │
│  ┌─────────────────────┐ │
│  │  📋 PROVIDERS LIST  │ │
│  │                     │ │
│  │  [Provider Card 1]  │ │
│  │  ⭐⭐⭐⭐⭐ Dr. Sarah  │ │
│  │  Dentist • 2.3 mi   │ │
│  │  [Book Now]         │ │
│  │                     │ │
│  │  [Provider Card 2]  │ │
│  │  ⭐⭐⭐⭐ Hair Salon   │ │
│  │  Salon • 1.8 mi     │ │
│  │  [Book Now]         │ │
│  └─────────────────────┘ │
│                         │
│  ┌─────────────────────┐ │
│  │  🎯 BOOKING PANEL   │ │
│  │                     │ │
│  │  [Selected Provider]│ │
│  │  📅 Available Times │ │
│  │  [9:00 AM] [10:30]  │ │
│  │  [2:15 PM] [4:00]   │ │
│  │                     │ │
│  │  💳 [Book with      │ │
│  │      Guarantee]     │ │
│  └─────────────────────┘ │
└─────────────────────────┘
```

## 🎨 **Panel 1: Map Panel Details**

### **Desktop Features:**
- **Interactive Map**: Mapbox GL JS integration
- **Provider Pins**: Color-coded by service type
  - 🔴 Healthcare (doctors, dentists)
  - 🔵 Beauty (salons, spas)
  - 🟢 Home Services (plumbers, electricians)
  - 🟡 Professional (lawyers, consultants)
- **Real-time Updates**: Live availability indicators
- **Heatmaps**: Areas with high availability density
- **Zoom Controls**: Standard map navigation
- **Location Services**: "Use my location" button

### **Mobile Features:**
- **Full-width Map**: Optimized for touch interaction
- **Pin Clustering**: Groups nearby providers
- **Quick Filters**: Service type toggles
- **Swipe Navigation**: Between map and list views

## 📋 **Panel 2: List Panel Details**

### **Provider Cards Include:**
- **Provider Name & Photo**
- **Star Rating** (⭐⭐⭐⭐⭐)
- **Service Category** (Dentist, Salon, etc.)
- **Distance** (2.3 miles)
- **Availability Status** (Available Now, 2 slots today)
- **Reliability Score** (98% on-time)
- **Quick Book Button**

### **List Features:**
- **Infinite Scroll**: Load more as user scrolls
- **Real-time Updates**: Availability changes instantly
- **Sort Options**: Distance, Rating, Availability
- **Filter Toggles**: Service type, distance, rating
- **Search**: Provider name or service

## 🎯 **Panel 3: Booking Panel Details**

### **Provider Information:**
- **Provider Profile**: Photo, name, rating
- **Service Details**: What's being booked
- **Location**: Address and directions
- **Contact Info**: Phone, website

### **Booking Interface:**
- **Time Slot Selection**: Available times in calendar format
- **Service Options**: Different service types/packages
- **Pricing**: Clear pricing with any discounts
- **Booking Guarantee**: "Guaranteed or Free" badge
- **Payment Method**: Credit card, digital wallet options
- **Confirmation**: Booking summary and next steps

### **Gamification Elements:**
- **Achievement Badges**: "Quick Booker", "Reliable Customer"
- **Points Display**: Current points balance
- **Streak Counter**: Consecutive successful bookings
- **Rewards Preview**: What they'll earn from this booking

## 🎮 **Gamification Integration**

### **Visual Elements:**
- **Progress Bars**: Points to next level
- **Badge Notifications**: New achievements unlocked
- **Streak Counters**: "5-day booking streak!"
- **Reward Previews**: "Book now, earn 50 points!"

### **Interactive Features:**
- **Achievement Popups**: Celebrate successful bookings
- **Point Animations**: Visual feedback when earning points
- **Leaderboards**: "Top bookers this week"
- **Challenges**: "Book 3 different services this week"

## 🔄 **Real-time Features**

### **Live Updates:**
- **Availability Changes**: Slots appear/disappear instantly
- **Provider Status**: Online/offline indicators
- **Distance Updates**: Real-time location tracking
- **Price Changes**: Dynamic pricing based on demand

### **Notifications:**
- **Slot Alerts**: "New slot available nearby!"
- **Booking Confirmations**: Instant confirmation messages
- **Reminder Notifications**: "Your appointment is in 1 hour"
- **Achievement Alerts**: "You've unlocked 'Speed Booker' badge!"

## 📱 **Responsive Design**

### **Breakpoints:**
- **Desktop**: 1200px+ (Three panels side-by-side)
- **Tablet**: 768px-1199px (Two panels, third slides in)
- **Mobile**: <768px (Single panel, swipe navigation)

### **Touch Interactions:**
- **Swipe Gestures**: Navigate between panels
- **Pinch to Zoom**: Map interaction
- **Tap to Select**: Provider and time slot selection
- **Pull to Refresh**: Update availability

---

*Wireframes created for Bookiji - The Uber for availability slots* 🚀 