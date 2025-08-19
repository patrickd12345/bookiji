import { useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface AnalyticsEvent {
  event_name: string
  properties?: Record<string, unknown>
}

export const useAnalytics = () => {
  const { user } = useAuth()

  const track = useCallback(async (event: AnalyticsEvent) => {
    try {
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: event.event_name,
          properties: {
            ...event.properties,
            user_id: user?.id,
            session_id: typeof window !== 'undefined' ? sessionStorage.getItem('session_id') || generateSessionId() : undefined,
            timestamp: new Date().toISOString(),
          },
        }),
      })

      if (!response.ok) {
        console.warn('Analytics tracking failed:', response.status)
      }
    } catch (error) {
      // Silently fail in production, log in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Analytics tracking error:', error)
      }
    }
  }, [user])

  // Funnel tracking methods
  const trackVisitHome = useCallback(() => {
    track({ event_name: 'visit_home' })
  }, [track])

  const trackSearchPerformed = useCallback((searchTerm: string, resultsCount: number) => {
    track({
      event_name: 'search_performed',
      properties: {
        search_term: searchTerm,
        results_count: resultsCount,
      },
    })
  }, [track])

  const trackBookingStarted = useCallback((serviceType: string, vendorId: string) => {
    track({
      event_name: 'booking_started',
      properties: {
        service_type: serviceType,
        vendor_id: vendorId,
      },
    })
  }, [track])

  const trackBookingConfirmed = useCallback((bookingId: string, amount: number, currency: string) => {
    track({
      event_name: 'booking_confirmed',
      properties: {
        booking_id: bookingId,
        amount,
        currency,
      },
    })
  }, [track])

  const trackPageView = useCallback((page: string, referrer?: string) => {
    track({
      event_name: 'page_view',
      properties: {
        page,
        referrer: referrer || (typeof document !== 'undefined' ? document.referrer : undefined),
      },
    })
  }, [track])

  const trackError = useCallback((error: string, context?: Record<string, unknown>) => {
    track({
      event_name: 'error_occurred',
      properties: {
        error,
        context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    })
  }, [track])

  return {
    track,
    trackVisitHome,
    trackSearchPerformed,
    trackBookingStarted,
    trackBookingConfirmed,
    trackPageView,
    trackError,
  }
}

// Generate a unique session ID
function generateSessionId(): string {
  if (typeof window === 'undefined') return 'server-session'
  
  let sessionId = sessionStorage.getItem('session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('session_id', sessionId)
  }
  return sessionId
}
