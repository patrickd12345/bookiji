import requiredRoutes from '../../guidedTourRequiredRoutes.json'

export interface GuidedTourStep {
  target: string // CSS selector or element
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export interface GuidedTour {
  id: string
  route: string // e.g. '/admin/analytics'
  title: string
  description?: string
  steps: GuidedTourStep[]
}

const tours: GuidedTour[] = []

export function registerTour(tour: GuidedTour) {
  if (!tours.find((t) => t.id === tour.id)) {
    tours.push(tour)
  }
}

export function getTourByRoute(route: string): GuidedTour | undefined {
  return tours.find((t) => t.route === route)
}

export function getAllTours(): GuidedTour[] {
  return [...tours]
}

// 🎯 COMPREHENSIVE GUIDED TOURS FOR CRITICAL USER JOURNEYS

// 1. CUSTOMER ONBOARDING TOUR
registerTour({
  id: 'customer-onboarding',
  route: '/get-started',
  title: 'Welcome to Bookiji!',
  description: 'Learn how to find and book services with AI assistance',
  steps: [
    { target: '[data-tour="hero-section"]', content: 'Welcome to Bookiji! The universal booking platform that connects you with local service providers instantly.' },
    { target: '[data-tour="search-section"]', content: 'Start by searching for services in your area. You can search by service type, location, or provider name.' },
    { target: '[data-tour="ai-chat"]', content: 'Meet your AI booking assistant! Simply describe what you need, and our AI will help you find the perfect provider and time slot.' },
    { target: '[data-tour="map-view"]', content: 'Explore providers on our interactive map. See real-time availability and get instant booking options.' },
    { target: '[data-tour="commitment-fee"]', content: 'Bookiji uses a unique $1 commitment fee system. This small fee ensures serious bookings and helps providers manage their time effectively.' },
    { target: '[data-tour="get-started-btn"]', content: 'Ready to start? Click here to begin your booking journey!' }
  ]
})

// 2. AI BOOKING INTERFACE TOUR
registerTour({
  id: 'ai-booking-interface',
  route: '/book/[vendorId]',
  title: 'AI-Powered Booking',
  description: 'Learn how to use our conversational AI to book services',
  steps: [
    { target: '[data-tour="ai-chat-window"]', content: 'This is your AI booking assistant. Simply tell it what you need, and it will guide you through the entire booking process.' },
    { target: '[data-tour="chat-input"]', content: 'Type your request here. Try phrases like "I need a haircut tomorrow" or "Book me a massage for next week".' },
    { target: '[data-tour="service-selection"]', content: 'The AI will show you available services. Click on any service to see details and pricing.' },
    { target: '[data-tour="time-slots"]', content: 'Choose from real-time available time slots. Green slots are available, red are booked.' },
    { target: '[data-tour="booking-summary"]', content: 'Review your booking details here before confirming. You can modify any selection.' },
    { target: '[data-tour="confirm-booking"]', content: 'Ready to book? Click here to proceed to payment and confirmation.' }
  ]
})

// 3. MAP DISCOVERY TOUR
registerTour({
  id: 'map-discovery',
  route: '/',
  title: 'Explore with Our Interactive Map',
  description: 'Discover local providers and real-time availability',
  steps: [
    { target: '[data-tour="map-container"]', content: 'Welcome to Bookiji\'s interactive map! Here you can discover local service providers in real-time.' },
    { target: '[data-tour="map-controls"]', content: 'Use these controls to zoom, pan, and adjust your view. The map updates automatically with your location.' },
    { target: '[data-tour="provider-markers"]', content: 'Each marker represents a service provider. Green markers show available providers, orange show limited availability.' },
    { target: '[data-tour="marker-click"]', content: 'Click on any provider marker to see their services, ratings, and instant booking options.' },
    { target: '[data-tour="filter-panel"]', content: 'Use these filters to narrow down providers by service type, rating, distance, or availability.' },
    { target: '[data-tour="list-view-toggle"]', content: 'Switch between map and list view to see providers in a different format.' }
  ]
})

// 4. CUSTOMER DASHBOARD TOUR
registerTour({
  id: 'customer-dashboard',
  route: '/dashboard',
  title: 'Your Booking Dashboard',
  description: 'Manage your bookings and account settings',
  steps: [
    { target: '[data-tour="welcome-section"]', content: 'Welcome to your personal dashboard! Here you can manage all your bookings and account settings.' },
    { target: '[data-tour="upcoming-bookings"]', content: 'View and manage your upcoming appointments. Click on any booking for details or to make changes.' },
    { target: '[data-tour="past-bookings"]', content: 'Access your booking history and leave reviews for past services.' },
    { target: '[data-tour="profile-settings"]', content: 'Update your profile information, preferences, and notification settings.' },
    { target: '[data-tour="credits-section"]', content: 'Check your credit balance and purchase history. Credits can be used for future bookings.' },
    { target: '[data-tour="support-access"]', content: 'Need help? Access our support system here for quick assistance.' }
  ]
})

// 5. PAYMENT FLOW TOUR
registerTour({
  id: 'payment-flow',
  route: '/pay/[bookingId]',
  title: 'Complete Your Booking',
  description: 'Understand our commitment fee system and complete payment',
  steps: [
    { target: '[data-tour="booking-summary"]', content: 'Review your booking details one final time. Make sure everything looks correct before proceeding.' },
    { target: '[data-tour="commitment-fee-explanation"]', content: 'Bookiji uses a $1 commitment fee system. This small fee ensures serious bookings and helps providers manage their time.' },
    { target: '[data-tour="fee-breakdown"]', content: 'See exactly what you\'re paying for. The commitment fee is separate from the service cost.' },
    { target: '[data-tour="payment-methods"]', content: 'Choose your preferred payment method. We accept all major credit cards and digital wallets.' },
    { target: '[data-tour="security-notice"]', content: 'Your payment information is secure and encrypted. We never store your full card details.' },
    { target: '[data-tour="confirm-payment"]', content: 'Ready to confirm? Click here to complete your booking and receive confirmation details.' }
  ]
})

// 6. VENDOR ONBOARDING TOUR
registerTour({
  id: 'vendor-onboarding',
  route: '/vendor/onboarding',
  title: 'Welcome to Bookiji for Providers',
  description: 'Set up your provider profile and start accepting bookings',
  steps: [
    { target: '[data-tour="welcome-message"]', content: 'Welcome to Bookiji! Let\'s get your business set up to start accepting bookings from customers worldwide.' },
    { target: '[data-tour="business-info"]', content: 'Start by providing your business information. This helps customers find and trust your services.' },
    { target: '[data-tour="service-setup"]', content: 'Define your services, pricing, and availability. You can add multiple services and customize each one.' },
    { target: '[data-tour="calendar-integration"]', content: 'Connect your existing calendar (Google Calendar, Outlook, etc.) to sync your availability automatically.' },
    { target: '[data-tour="availability-settings"]', content: 'Set your working hours and availability preferences. You can block specific times or set recurring schedules.' },
    { target: '[data-tour="go-live"]', content: 'Ready to start accepting bookings? Click here to go live and appear in customer searches!' }
  ]
})

// 7. VENDOR DASHBOARD TOUR
registerTour({
  id: 'vendor-dashboard-comprehensive',
  route: '/vendor/dashboard',
  title: 'Provider Dashboard Overview',
  description: 'Manage your bookings, track performance, and grow your business',
  steps: [
    { target: '[data-tour="revenue-overview"]', content: 'Track your earnings and revenue trends. This section shows your total revenue and recent performance.' },
    { target: '[data-tour="booking-stats"]', content: 'Monitor your booking statistics including total bookings, confirmation rates, and no-show percentages.' },
    { target: '[data-tour="calendar-tab"]', content: 'Access your integrated calendar to manage appointments, set availability, and view upcoming bookings.' },
    { target: '[data-tour="analytics-tab"]', content: 'Dive deep into your performance analytics. Track customer trends, popular services, and growth opportunities.' },
    { target: '[data-tour="recent-bookings"]', content: 'View and manage your recent bookings. Click on any booking for details or to update status.' },
    { target: '[data-tour="pending-service-badge"]', content: 'This badge shows pending service type proposals awaiting admin approval.' }
  ]
})

// 8. ADMIN ANALYTICS TOUR
registerTour({
  id: 'admin-analytics-comprehensive',
  route: '/admin/analytics',
  title: 'System Analytics Dashboard',
  description: 'Monitor platform performance and user activity',
  steps: [
    { target: '[data-tour="system-overview"]', content: 'Welcome to the admin analytics dashboard. Monitor overall platform health and performance metrics.' },
    { target: '[data-tour="user-metrics"]', content: 'Track user growth, registration rates, and engagement patterns across different user segments.' },
    { target: '[data-tour="booking-analytics"]', content: 'Monitor booking volume, success rates, and revenue generation across the platform.' },
    { target: '[data-tour="vendor-performance"]', content: 'Analyze vendor performance, service quality, and customer satisfaction metrics.' },
    { target: '[data-tour="revenue-tracking"]', content: 'Track platform revenue, fee collection, and financial performance indicators.' },
    { target: '[data-tour="system-health"]', content: 'Monitor system performance, error rates, and technical metrics to ensure smooth operation.' }
  ]
})

// 9. ADMIN SERVICE TYPES TOUR
registerTour({
  id: 'admin-service-types-comprehensive',
  route: '/admin/service-types',
  title: 'Service Type Management',
  description: 'Review and approve vendor service type proposals',
  steps: [
    { target: '[data-tour="proposals-overview"]', content: 'Review pending service type proposals from vendors. These are new service categories that need approval.' },
    { target: '[data-tour="proposal-details"]', content: 'Click on any proposal to view detailed information including description, pricing, and vendor details.' },
    { target: '[data-tour="approval-actions"]', content: 'Approve or reject proposals based on quality, relevance, and platform standards.' },
    { target: '[data-tour="category-management"]', content: 'Manage existing service categories, update descriptions, and maintain platform organization.' },
    { target: '[data-tour="vendor-communication"]', content: 'Communicate with vendors about their proposals and provide feedback when needed.' },
    { target: '[data-tour="quality-control"]', content: 'Ensure all approved services meet platform quality standards and guidelines.' }
  ]
})

// 10. HELP TICKETS TOUR
registerTour({
  id: 'help-tickets-comprehensive',
  route: '/help/tickets',
  title: 'Support Ticket System',
  description: 'Get help and manage support requests',
  steps: [
    { target: '[data-tour="ticket-overview"]', content: 'Welcome to the support ticket system. Here you can create and manage support requests.' },
    { target: '[data-tour="create-ticket"]', content: 'Click here to create a new support ticket. Describe your issue clearly for faster resolution.' },
    { target: '[data-tour="ticket-list"]', content: 'View all your support tickets. Click on any ticket to see details and conversation history.' },
    { target: '[data-tour="ticket-status"]', content: 'Track the status of your tickets: Open, In Progress, or Resolved.' },
    { target: '[data-tour="reply-box"]', content: 'Add additional information or ask follow-up questions in existing tickets.' },
    { target: '[data-tour="support-resources"]', content: 'Access helpful resources like FAQs and guides for common issues.' }
  ]
})

// 11. VENDOR CALENDAR TOUR
registerTour({
  id: 'vendor-calendar',
  route: '/vendor/calendar',
  title: 'Calendar Management',
  description: 'Manage your availability and appointments',
  steps: [
    { target: '[data-tour="calendar-view"]', content: 'Your integrated calendar view. See all your appointments and availability in one place.' },
    { target: '[data-tour="availability-slots"]', content: 'Set your available time slots. Green blocks show available times, red shows booked appointments.' },
    { target: '[data-tour="booking-details"]', content: 'Click on any booking to see customer details, service information, and booking status.' },
    { target: '[data-tour="quick-actions"]', content: 'Use quick actions to confirm, reschedule, or cancel bookings directly from the calendar.' },
    { target: '[data-tour="sync-status"]', content: 'Monitor your calendar sync status. Ensure your external calendar stays updated.' },
    { target: '[data-tour="block-time"]', content: 'Block off time for personal appointments or breaks that shouldn\'t be bookable.' }
  ]
})

// 12. CUSTOMER BOOKING CONFIRMATION TOUR
registerTour({
  id: 'booking-confirmation',
  route: '/confirm/[bookingId]',
  title: 'Booking Confirmation',
  description: 'Review your confirmed booking and next steps',
  steps: [
    { target: '[data-tour="confirmation-header"]', content: 'Congratulations! Your booking has been confirmed. Here are the details of your appointment.' },
    { target: '[data-tour="booking-details"]', content: 'Review your booking details including service, provider, date, time, and location.' },
    { target: '[data-tour="provider-info"]', content: 'Contact information and directions to your service provider.' },
    { target: '[data-tour="reminder-settings"]', content: 'Set up reminders for your appointment. You\'ll receive notifications before your booking.' },
    { target: '[data-tour="modify-options"]', content: 'Need to change something? You can modify or cancel your booking here.' },
    { target: '[data-tour="next-steps"]', content: 'What happens next? You\'ll receive confirmation details and can track your booking status.' }
  ]
}) 