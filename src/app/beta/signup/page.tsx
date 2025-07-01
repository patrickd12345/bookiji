'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface BetaSignupForm {
  business_name: string
  contact_name: string
  email: string
  phone: string
  service_category: string
  location: string
  experience_years: number
  current_booking_method: string
  monthly_bookings: number
  pain_points: string[]
  hear_about_us: string
  additional_notes: string
}

export default function BetaSignup() {
  const router = useRouter()
  const [formData, setFormData] = useState<BetaSignupForm>({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    service_category: '',
    location: '',
    experience_years: 0,
    current_booking_method: '',
    monthly_bookings: 0,
    pain_points: [],
    hear_about_us: '',
    additional_notes: ''
  })
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const serviceCategories = [
    'Beauty & Wellness',
    'Health & Fitness',
    'Home Services',
    'Professional Services',
    'Automotive',
    'Pet Services',
    'Education & Tutoring',
    'Events & Entertainment',
    'Other'
  ]

  const painPointOptions = [
    'No-shows and cancellations',
    'Time-wasting inquiries',
    'Double booking conflicts',
    'Payment collection issues',
    'Manual scheduling management',
    'Difficulty reaching customers',
    'Seasonal demand fluctuations',
    'Competition from larger platforms'
  ]

  const bookingMethods = [
    'Phone calls only',
    'Text messages',
    'Social media DMs',
    'Website contact form',
    'Third-party booking platform',
    'Word of mouth',
    'Walk-ins only',
    'Email'
  ]

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      // Check if user came from vendor flow
      const referrer = document.referrer
      const isVendorFlow = referrer.includes('vendor') || referrer.includes('business')
      
      if (!isVendorFlow) {
        console.log('Redirecting non-vendor user to dashboard')
        router.push('/dashboard')
        return
      }

      setLoading(false)
    }

    checkAccess()
  }, [router])

  const handleInputChange = (field: keyof BetaSignupForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePainPointToggle = (painPoint: string) => {
    setFormData(prev => ({
      ...prev,
      pain_points: prev.pain_points.includes(painPoint)
        ? prev.pain_points.filter(p => p !== painPoint)
        : [...prev.pain_points, painPoint]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Submit to Supabase
      const { error: insertError } = await supabase
        .from('beta_signups')
        .insert({
          ...formData,
          signed_up_at: new Date().toISOString(),
          status: 'pending_review'
        })

      if (insertError) {
        throw new Error(insertError.message)
      }

      // Send notification about new beta signup
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'beta_signup_alert',
          recipientEmail: 'admin@bookiji.com', // Admin notification
          customData: formData
        })
      })

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold text-green-600 mb-4">
            Welcome to the Beta!
          </h2>
          <p className="text-gray-600 mb-6">
            Thank you for joining Bookiji's beta program. We'll review your application and get back to you within 48 hours.
          </p>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">🏆 Founding User Perks</h3>
            <ul className="text-sm text-blue-800 text-left space-y-1">
              <li>• 50% reduced fees for first 6 months</li>
              <li>• Priority customer support</li>
              <li>• Direct input on new features</li>
              <li>• "Founding Provider" badge</li>
              <li>• Early access to new tools</li>
            </ul>
          </div>

          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-shadow"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Join the Bookiji Beta
            </h1>
            <p className="text-gray-600 text-lg">
              Be among the first providers to experience zero no-shows and guaranteed bookings
            </p>
          </div>

          {/* Benefits Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white mb-8">
            <h3 className="text-lg font-semibold mb-3">🚀 Beta Program Benefits</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p>✅ No wasted leads guarantee</p>
                <p>✅ $1 customer commitment fees</p>
                <p>✅ Reduced provider fees (50% off)</p>
              </div>
              <div>
                <p>✅ Priority support & feedback</p>
                <p>✅ Early access to new features</p>
                <p>✅ Founding provider recognition</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.business_name}
                  onChange={(e) => handleInputChange('business_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your business name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contact_name}
                  onChange={(e) => handleInputChange('contact_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            {/* Service Details */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Category *
                </label>
                <select
                  required
                  value={formData.service_category}
                  onChange={(e) => handleInputChange('service_category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {serviceCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location (City, State) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Los Angeles, CA"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years in Business *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="50"
                  value={formData.experience_years}
                  onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Bookings *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.monthly_bookings}
                  onChange={(e) => handleInputChange('monthly_bookings', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Average per month"
                />
              </div>
            </div>

            {/* Current Booking Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How do you currently take bookings? *
              </label>
              <select
                required
                value={formData.current_booking_method}
                onChange={(e) => handleInputChange('current_booking_method', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select method</option>
                {bookingMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            {/* Pain Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What are your biggest booking challenges? (Select all that apply)
              </label>
              <div className="grid md:grid-cols-2 gap-3">
                {painPointOptions.map(painPoint => (
                  <label key={painPoint} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.pain_points.includes(painPoint)}
                      onChange={() => handlePainPointToggle(painPoint)}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{painPoint}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* How did you hear about us */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How did you hear about Bookiji?
              </label>
              <input
                type="text"
                value={formData.hear_about_us}
                onChange={(e) => handleInputChange('hear_about_us', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Social media, referral, search, etc."
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                rows={4}
                value={formData.additional_notes}
                onChange={(e) => handleInputChange('additional_notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us about your business, special requirements, or questions..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
            >
              {loading ? 'Submitting Application...' : 'Join Beta Program'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              By submitting this form, you agree to Bookiji's terms of service and privacy policy.
              We'll review your application within 48 hours.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
} 