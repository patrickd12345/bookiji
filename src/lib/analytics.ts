// 📊 Bookiji Analytics & User Journey Tracking
// Post-launch optimization and conversion analytics

// Analytics configuration
const ANALYTICS_CONFIG = {
  HOTJAR_ID: process.env.NEXT_PUBLIC_HOTJAR_ID,
  POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
  ENABLE_ANALYTICS: process.env.NODE_ENV === 'production'
}

// Critical conversion events to track
export const TRACKING_EVENTS = {
  // Landing & Discovery
  LANDING_VIEW: 'landing_page_viewed',
  CTA_CLICKED: 'cta_button_clicked',
  HERO_ENGAGEMENT: 'hero_section_engaged',
  BETA_BADGE_CLICKED: 'beta_badge_clicked',
  
  // Registration Flow
  SIGNUP_STARTED: 'signup_flow_started',
  SIGNUP_COMPLETED: 'signup_completed',
  ROLE_SELECTED: 'user_role_selected', // customer vs provider
  EMAIL_VERIFIED: 'email_verified',
  PROFILE_COMPLETED: 'profile_completed',
  
  // Booking Flow
  SEARCH_STARTED: 'service_search_started',
  AI_CHAT_ENGAGED: 'ai_chat_conversation_started',
  AI_CHAT_MESSAGE_SENT: 'ai_chat_message_sent',
  PROVIDER_SELECTED: 'provider_selected',
  BOOKING_INITIATED: 'booking_flow_started',
  BOOKING_DETAILS_FILLED: 'booking_details_completed',
  PAYMENT_STARTED: 'payment_flow_started',
  PAYMENT_METHOD_SELECTED: 'payment_method_selected',
  BOOKING_COMPLETED: 'booking_confirmed',
  
  // Feature Engagement
  MAP_INTERACTION: 'map_interacted',
  MAP_RADIUS_ADJUSTED: 'map_radius_changed',
  PROVIDER_LOCATION_VIEWED: 'provider_location_viewed',
  FEATURE_DISCOVERY: 'feature_discovered',
  HELP_ACCESSED: 'help_center_accessed',
  TOUR_STARTED: 'guided_tour_started',
  TOUR_COMPLETED: 'guided_tour_completed',
  
  // Provider Actions
  PROVIDER_ONBOARDING_STARTED: 'provider_onboarding_started',
  PROVIDER_ONBOARDING_COMPLETED: 'provider_onboarding_completed',
  AVAILABILITY_SET: 'provider_availability_set',
  SERVICE_CREATED: 'provider_service_created',
  CALENDAR_CONNECTED: 'provider_calendar_connected',
  
  // Conversion Optimization
  COMMITMENT_FEE_VIEWED: 'commitment_fee_explanation_viewed',
  COMMITMENT_FEE_ACCEPTED: 'commitment_fee_accepted',
  PRIVACY_EXPLANATION_VIEWED: 'privacy_explanation_viewed',
  GLOBAL_FEATURES_VIEWED: 'global_features_viewed',
  
  // Drop-off Points (Critical for optimization)
  SIGNUP_ABANDONED: 'signup_abandoned',
  BOOKING_ABANDONED: 'booking_abandoned',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_ABANDONED: 'payment_abandoned',
  ERROR_ENCOUNTERED: 'error_encountered',
  CONFUSION_DETECTED: 'user_confusion_detected',
  
  // Retention & Engagement
  RETURN_VISIT: 'user_returned',
  SECOND_BOOKING: 'second_booking_started',
  REFERRAL_SHARED: 'referral_link_shared',
  REVIEW_SUBMITTED: 'review_submitted'
}

// User segmentation criteria
export const USER_SEGMENTS = {
  POWER_USERS: {
    criteria: 'completed_bookings >= 3 OR session_duration > 600', // 10min+
    priority: 'high',
    actions: ['feature_interview', 'beta_tester_program', 'referral_incentives']
  },
  
  CONFUSED_USERS: {
    criteria: 'help_clicks > 2 OR ai_chat_retries > 3 OR signup_abandoned = true',
    priority: 'critical',
    actions: ['onboarding_improvement', 'personal_outreach', 'help_content']
  },
  
  PRICE_SENSITIVE: {
    criteria: 'payment_abandoned = true OR pricing_page_visits > 3',
    priority: 'high',
    actions: ['ppp_adjustment', 'value_communication', 'discount_experiment']
  },
  
  INTERNATIONAL_USERS: {
    criteria: 'country NOT IN (\'US\', \'GB\', \'AU\')',
    priority: 'medium',
    actions: ['localization_improvement', 'local_payment_methods', 'currency_optimization']
  },
  
  MOBILE_USERS: {
    criteria: 'device_type = \'mobile\' AND session_count > 2',
    priority: 'medium',
    actions: ['mobile_optimization', 'app_download_prompt', 'mobile_features']
  }
}

// Initialize analytics systems
export const initAnalytics = () => {
  if (!ANALYTICS_CONFIG.ENABLE_ANALYTICS) return

  // Hotjar initialization
  if (ANALYTICS_CONFIG.HOTJAR_ID && typeof window !== 'undefined') {
    (function(h: any, o: any, t: any, j: any, a: any, r: any) {
      h.hj = h.hj || function() { (h.hj.q = h.hj.q || []).push(arguments) }
      h._hjSettings = { hjid: parseInt(ANALYTICS_CONFIG.HOTJAR_ID!), hjsv: 6 }
      a = o.getElementsByTagName('head')[0]
      r = o.createElement('script')
      r.async = 1
      r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv
      a.appendChild(r)
    })(
      window,
      document,
      'https://static.hotjar.com/c/hotjar-',
      '.js?sv=',
      document.createElement('script'),
      document.getElementsByTagName('head')[0]
    )
  }

  // PostHog initialization  
  if (ANALYTICS_CONFIG.POSTHOG_KEY && typeof window !== 'undefined') {
    // Dynamic import to avoid build issues
    import('posthog-js').then(({ default: posthog }) => {
      posthog.init(ANALYTICS_CONFIG.POSTHOG_KEY!, {
        api_host: ANALYTICS_CONFIG.POSTHOG_HOST,
        capture_pageview: true,
        disable_session_recording: false,
        enable_recording_console_log: false
      })
      posthog.startSessionRecording()
    }).catch(() => {
      console.warn('PostHog not available')
    })
  }
}

// Enhanced event tracking with user context
export const trackEvent = async (
  event: string,
  properties: any = {},
  userId?: string,
  sessionId?: string,
  deviceId?: string,
  timestamp?: string
) => {
  if (!ANALYTICS_CONFIG.ENABLE_ANALYTICS) return

  const enhancedProperties = {
    ...properties,
    userId,
    sessionId,
    deviceId,
    timestamp: timestamp || new Date().toISOString(),
    page_url: typeof window !== 'undefined' ? window.location.href : '',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    viewport_width: typeof window !== 'undefined' ? window.innerWidth : null,
    viewport_height: typeof window !== 'undefined' ? window.innerHeight : null,
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    language: typeof navigator !== 'undefined' ? navigator.language : '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  try {
    // PostHog tracking
    if (ANALYTICS_CONFIG.POSTHOG_KEY) {
      try {
        const { default: posthog } = await import('posthog-js')
        posthog.capture(event, enhancedProperties)
      } catch {
        console.warn('PostHog tracking failed')
      }
    }

    // Custom analytics endpoint for advanced processing
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        properties: enhancedProperties
      })
    })
  } catch (error) {
    console.warn('Analytics tracking error:', error)
  }
}

// Conversion funnel tracking
export const trackFunnelStep = (funnel: string, step: string, properties: any = {}) => {
  trackEvent(`funnel_${funnel}_${step}`, {
    funnel_name: funnel,
    funnel_step: step,
    ...properties
  })
}

// User behavior analysis
export const trackUserBehavior = (behavior: string, context: any = {}) => {
  trackEvent('user_behavior', {
    behavior_type: behavior,
    context,
    session_duration: getSessionDuration(),
    page_views_in_session: getPageViewsInSession()
  })
}

// Geographic tracking
export const trackGeographicEvent = (event: string, properties: any = {}) => {
  // Attempt to get user's country from various sources
  const country = properties.country || 
                  getCountryFromTimezone() || 
                  getCountryFromLanguage() || 
                  'unknown'

  trackEvent(event, {
    ...properties,
    country,
    detected_country_method: getCountryDetectionMethod(country)
  })
}

// Feature adoption tracking
export const trackFeatureAdoption = (feature: string, stage: 'discovery' | 'engagement' | 'adoption', properties: any = {}) => {
  trackEvent(`feature_${stage}`, {
    feature_name: feature,
    adoption_stage: stage,
    ...properties
  })
}

// Error and confusion tracking
export const trackUserConfusion = (context: string, details: any = {}) => {
  trackEvent(TRACKING_EVENTS.CONFUSION_DETECTED, {
    confusion_context: context,
    confusion_details: details,
    page_path: typeof window !== 'undefined' ? window.location.pathname : '',
    time_on_page: getTimeOnCurrentPage()
  })
}

// Helper functions
const getSessionDuration = (): number => {
  if (typeof window === 'undefined') return 0
  const sessionStart = sessionStorage.getItem('session_start')
  if (!sessionStart) {
    sessionStorage.setItem('session_start', Date.now().toString())
    return 0
  }
  return Date.now() - parseInt(sessionStart)
}

const getPageViewsInSession = (): number => {
  if (typeof window === 'undefined') return 0
  const pageViews = sessionStorage.getItem('page_views') || '0'
  const count = parseInt(pageViews) + 1
  sessionStorage.setItem('page_views', count.toString())
  return count
}

const getTimeOnCurrentPage = (): number => {
  if (typeof window === 'undefined') return 0
  const pageStart = sessionStorage.getItem('page_start')
  if (!pageStart) {
    sessionStorage.setItem('page_start', Date.now().toString())
    return 0
  }
  return Date.now() - parseInt(pageStart)
}

const getCountryFromTimezone = (): string | null => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    // Basic timezone to country mapping
    const timezoneCountryMap: { [key: string]: string } = {
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'Europe/London': 'GB',
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'Asia/Tokyo': 'JP',
      'Asia/Shanghai': 'CN',
      'Australia/Sydney': 'AU'
    }
    return timezoneCountryMap[timezone] || null
  } catch {
    return null
  }
}

const getCountryFromLanguage = (): string | null => {
  if (typeof navigator === 'undefined') return null
  const lang = navigator.language.toLowerCase()
  
  const languageCountryMap: { [key: string]: string } = {
    'en-us': 'US',
    'en-gb': 'GB',
    'fr-fr': 'FR',
    'de-de': 'DE',
    'ja-jp': 'JP',
    'zh-cn': 'CN',
    'en-au': 'AU'
  }
  
  return languageCountryMap[lang] || (lang.includes('en') ? 'US' : null)
}

const getCountryDetectionMethod = (country: string): string => {
  if (country === 'unknown') return 'none'
  if (getCountryFromTimezone() === country) return 'timezone'
  if (getCountryFromLanguage() === country) return 'language'
  return 'provided'
}

// A/B testing support
export const trackABTest = (testName: string, variant: string, properties: any = {}) => {
  trackEvent('ab_test_exposure', {
    test_name: testName,
    variant,
    ...properties
  })
}

// Conversion optimization helpers
export const trackConversionEvent = (conversionType: string, value?: number, properties: any = {}) => {
  trackEvent('conversion', {
    conversion_type: conversionType,
    conversion_value: value,
    ...properties
  })
}

// Real-time user feedback collection
export const collectUserFeedback = (trigger: string, feedback: any) => {
  trackEvent('user_feedback_collected', {
    feedback_trigger: trigger,
    feedback_data: feedback,
    user_segment: determineUserSegment(),
    session_context: getSessionContext()
  })
}

export interface PaymentMetadata {
  amount: number
  currency: string
  country?: string
  paymentMethod?: string
  bookingId?: string
}

export const trackPaymentSuccess = (metadata: PaymentMetadata) => {
  trackEvent('payment_success', metadata)
}

export const trackPaymentFailure = (metadata: PaymentMetadata) => {
  trackEvent(TRACKING_EVENTS.PAYMENT_FAILED, metadata)
}

const determineUserSegment = (): string => {
  // Logic to determine which segment the user belongs to
  // This would integrate with user data and behavior history
  return 'new_user' // Placeholder
}

const getSessionContext = (): any => {
  return {
    session_duration: getSessionDuration(),
    page_views: getPageViewsInSession(),
    current_page: typeof window !== 'undefined' ? window.location.pathname : '',
    entry_page: sessionStorage.getItem('entry_page') || 'unknown'
  }
}

export default {
  initAnalytics,
  trackEvent,
  trackFunnelStep,
  trackUserBehavior,
  trackGeographicEvent,
  trackFeatureAdoption,
  trackUserConfusion,
  trackABTest,
  trackConversionEvent,
  collectUserFeedback,
  trackPaymentSuccess,
  trackPaymentFailure,
  TRACKING_EVENTS,
  USER_SEGMENTS
}
