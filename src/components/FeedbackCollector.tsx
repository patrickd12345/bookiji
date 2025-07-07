'use client'

import { useState, useEffect, useCallback } from 'react'
import { trackEvent, collectUserFeedback } from '@/lib/analytics'

// 📋 Smart Feedback Collection for Post-Launch Optimization
// Triggers contextual micro-surveys at key moments

interface FeedbackTrigger {
  id: string
  question: string
  type: 'yes_no' | 'rating' | 'multiple_choice' | 'open_text' | 'yes_no_why'
  options?: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  trigger_conditions: {
    events?: string[]
    page_paths?: string[]
    user_segments?: string[]
    time_on_page?: number
    session_count?: number
  }
}

const FEEDBACK_TRIGGERS: FeedbackTrigger[] = [
  // Confusion Points (High Priority)
  {
    id: 'search_no_results',
    question: "We couldn't find what you were looking for. What service did you need?",
    type: 'open_text',
    priority: 'high',
    trigger_conditions: {
      events: ['search_no_results', 'search_failed']
    }
  },
  
  {
    id: 'ai_chat_confused',
    question: "Did our AI understand what you needed?",
    type: 'yes_no_why',
    priority: 'critical',
    trigger_conditions: {
      events: ['ai_chat_retries_exceeded', 'ai_chat_abandoned']
    }
  },
  
  {
    id: 'booking_abandoned',
    question: "What stopped you from completing your booking?",
    type: 'multiple_choice',
    options: [
      "Too expensive",
      "Couldn't find the right provider", 
      "Process was too complex",
      "Privacy concerns",
      "Payment issues",
      "Other"
    ],
    priority: 'high',
    trigger_conditions: {
      events: ['booking_abandoned', 'payment_abandoned']
    }
  },
  
  {
    id: 'signup_abandoned',
    question: "What made you hesitate to sign up?",
    type: 'multiple_choice',
    options: [
      "Too many required fields",
      "Privacy concerns",
      "Don't need account yet",
      "Process unclear",
      "Technical issues",
      "Other"
    ],
    priority: 'high',
    trigger_conditions: {
      events: ['signup_abandoned']
    }
  },

  // Feature Discovery (Medium Priority)
  {
    id: 'map_first_use',
    question: "How intuitive was the map interface?",
    type: 'rating',
    priority: 'medium',
    trigger_conditions: {
      events: ['map_interaction'],
      session_count: 1
    }
  },
  
  {
    id: 'privacy_understanding',
    question: "Do you understand how we protect provider privacy?",
    type: 'yes_no_why',
    priority: 'medium',
    trigger_conditions: {
      events: ['privacy_explanation_viewed'],
      time_on_page: 30
    }
  },
  
  {
    id: 'commitment_fee_reaction',
    question: "How do you feel about our $1 commitment fee?",
    type: 'multiple_choice',
    options: [
      "Great idea - prevents no-shows", 
      "Fair and reasonable",
      "Too expensive",
      "Confusing concept",
      "Don't understand the value"
    ],
    priority: 'medium',
    trigger_conditions: {
      events: ['commitment_fee_viewed', 'payment_started']
    }
  },

  // Experience Optimization (Low Priority)
  {
    id: 'overall_experience',
    question: "How would you rate your experience so far?",
    type: 'rating',
    priority: 'low',
    trigger_conditions: {
      events: ['booking_completed'],
      session_count: 1
    }
  },
  
  {
    id: 'feature_request',
    question: "What's the most important feature we're missing?",
    type: 'open_text',
    priority: 'low',
    trigger_conditions: {
      user_segments: ['power_user'],
      session_count: 3
    }
  }
]

interface FeedbackCollectorProps {
  currentPage?: string
  userSegment?: string
  sessionCount?: number
}

export default function FeedbackCollector({ 
  currentPage = '',
  userSegment = '',
  sessionCount = 1 
}: FeedbackCollectorProps) {
  const [activeTrigger, setActiveTrigger] = useState<FeedbackTrigger | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [response, setResponse] = useState<string>('')
  const [whyResponse, setWhyResponse] = useState<string>('')
  const [rating, setRating] = useState<number>(0)
  const [timeOnPage, setTimeOnPage] = useState(0)

  // Move this up so it's declared before useEffect
  const checkTriggers = useCallback((eventName?: string) => {
    // Don't show multiple feedback requests in same session
    if (sessionStorage.getItem('feedback_shown')) return

    const triggeredFeedback = FEEDBACK_TRIGGERS.find(trigger => {
      const conditions = trigger.trigger_conditions

      // Check event-based triggers
      if (eventName && conditions.events?.includes(eventName)) {
        return true
      }

      // Check page-based triggers
      if (conditions.page_paths?.some(path => currentPage.includes(path))) {
        return true
      }

      // Check user segment triggers
      if (conditions.user_segments?.includes(userSegment)) {
        return true
      }

      // Check time-based triggers
      if (conditions.time_on_page && timeOnPage >= conditions.time_on_page) {
        return true
      }

      // Check session-based triggers
      if (conditions.session_count && sessionCount >= conditions.session_count) {
        return true
      }

      return false
    })

    if (triggeredFeedback) {
      setActiveTrigger(triggeredFeedback)
      setIsVisible(true)
      trackEvent('feedback_triggered', {
        trigger_id: triggeredFeedback.id,
        trigger_question: triggeredFeedback.question,
        priority: triggeredFeedback.priority
      })
    }
  }, [currentPage, userSegment, timeOnPage, sessionCount])

  // Track time on page
  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      setTimeOnPage(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [currentPage])

  // Listen for trigger events
  useEffect(() => {
    const handleTriggerEvent = (event: CustomEvent) => {
      const eventName = event.detail.eventName
      checkTriggers(eventName)
    }

    window.addEventListener('feedback-trigger', handleTriggerEvent as EventListener)
    return () => window.removeEventListener('feedback-trigger', handleTriggerEvent as EventListener)
  }, [timeOnPage, sessionCount, userSegment, checkTriggers])

  const submitFeedback = async () => {
    if (!activeTrigger) return

    const feedbackData = {
      trigger_id: activeTrigger.id,
      question: activeTrigger.question,
      response_type: activeTrigger.type,
      response: response,
      why_response: whyResponse,
      rating: rating,
      page: currentPage,
      user_segment: userSegment,
      session_count: sessionCount,
      time_on_page: timeOnPage
    }

    await collectUserFeedback(activeTrigger.id, feedbackData)
    
    // Mark feedback as shown for this session
    sessionStorage.setItem('feedback_shown', 'true')
    setIsVisible(false)
    setActiveTrigger(null)
    
    // Reset form
    setResponse('')
    setWhyResponse('')
    setRating(0)

    trackEvent('feedback_submitted', {
      trigger_id: activeTrigger.id,
      priority: activeTrigger.priority
    })
  }

  const dismissFeedback = () => {
    if (activeTrigger) {
      trackEvent('feedback_dismissed', {
        trigger_id: activeTrigger.id,
        priority: activeTrigger.priority
      })
    }
    setIsVisible(false)
    setActiveTrigger(null)
  }

  if (!isVisible || !activeTrigger) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💬</span>
            <h3 className="font-semibold text-gray-900">Quick Feedback</h3>
          </div>
          <button 
            onClick={dismissFeedback}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Question */}
        <p className="text-sm text-gray-700 mb-4">
          {activeTrigger.question}
        </p>

        {/* Response Input */}
        <div className="space-y-3">
          {activeTrigger.type === 'yes_no' || activeTrigger.type === 'yes_no_why' ? (
            <div className="flex gap-2">
              <button 
                onClick={() => setResponse('yes')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  response === 'yes' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Yes
              </button>
              <button 
                onClick={() => setResponse('no')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  response === 'no' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                No
              </button>
            </div>
          ) : null}

          {activeTrigger.type === 'rating' ? (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-2xl transition-colors ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>
          ) : null}

          {activeTrigger.type === 'multiple_choice' && activeTrigger.options ? (
            <div className="space-y-2">
              {activeTrigger.options.map(option => (
                <button
                  key={option}
                  onClick={() => setResponse(option)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    response === option
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  } border`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}

          {(activeTrigger.type === 'open_text' || activeTrigger.type === 'yes_no_why') ? (
            <textarea
              value={activeTrigger.type === 'open_text' ? response : whyResponse}
              onChange={(e) => 
                activeTrigger.type === 'open_text' 
                  ? setResponse(e.target.value)
                  : setWhyResponse(e.target.value)
              }
              placeholder={
                activeTrigger.type === 'yes_no_why' 
                  ? "Please explain why..." 
                  : "Tell us more..."
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              rows={3}
            />
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={submitFeedback}
            disabled={
              !response && 
              !whyResponse && 
              rating === 0
            }
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Feedback
          </button>
          <button
            onClick={dismissFeedback}
            className="px-4 py-2 text-gray-600 text-sm hover:text-gray-800 transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Priority Indicator */}
        {activeTrigger.priority === 'critical' && (
          <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
            🚨 Your feedback helps us fix critical issues
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to trigger feedback from other components
export const triggerFeedback = (eventName: string) => {
  window.dispatchEvent(new CustomEvent('feedback-trigger', {
    detail: { eventName }
  }))
} 