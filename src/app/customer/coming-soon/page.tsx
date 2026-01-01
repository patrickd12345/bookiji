'use client'

import { useState } from 'react'

export default function CustomerComingSoonPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || isSubmitting) return

    setIsSubmitting(true)
    try {
      // Simple email capture - can be enhanced with API call
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'customer_waitlist' })
      })

      if (response.ok) {
        setSubmitted(true)
        setEmail('')
      }
    } catch (_error) {
      // Failed to submit email
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 sm:px-6 py-8 overflow-x-hidden">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
          Coming Soon
        </h1>
        <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">
          We&apos;re preparing something special. Be the first to know when we launch.
        </p>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-5">
            <p className="text-sm sm:text-base text-green-800 font-medium">Thanks! We&apos;ll notify you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
            />
            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base touch-manipulation"
            >
              {isSubmitting ? 'Submitting...' : 'Notify Me'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

