'use client'

import { useState, useEffect } from 'react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { motion } from 'framer-motion'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MessageSquare, Edit, CheckCircle, AlertCircle } from 'lucide-react'

interface Review {
  id: string
  customer_name: string
  rating: number
  comment: string
  created_at: string
  service_name: string
}

interface ReviewResponse {
  id?: string
  review_id: string
  provider_id: string
  response_text: string
  is_public: boolean
  created_at?: string
  updated_at?: string
}

interface ReviewResponseProps {
  review: Review
  providerId: string
  onResponseSubmitted?: (response: ReviewResponse) => void
}

export default function ReviewResponse({ review, providerId, onResponseSubmitted }: ReviewResponseProps) {
  const [responseText, setResponseText] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingResponse, setExistingResponse] = useState<ReviewResponse | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    // Check if there's an existing response
    checkExistingResponse()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review.id, providerId])

  const checkExistingResponse = async () => {
    try {
      const response = await fetch(`/api/reviews/${review.id}/response?provider_id=${providerId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.response) {
          setExistingResponse(data.response)
          setResponseText(data.response.response_text)
          setIsPublic(data.response.is_public)
        }
      }
    } catch (error) {
      console.error('Error checking existing response:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const endpoint = existingResponse 
        ? `/api/reviews/${review.id}/response/${existingResponse.id}`
        : `/api/reviews/${review.id}/response`

      const method = existingResponse ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          review_id: review.id,
          provider_id: providerId,
          response_text: responseText.trim(),
          is_public: isPublic,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit response')
      }

      const data = await response.json()
      
      if (existingResponse) {
        setExistingResponse({ ...existingResponse, ...data.response })
      } else {
        setExistingResponse(data.response)
      }

      setShowForm(false)
      onResponseSubmitted?.(data.response)
      
      // Show success message
      setError(null)
    } catch (error) {
      setError('Failed to submit response. Please try again.')
      console.error('Error submitting response:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    if (existingResponse) {
      setResponseText(existingResponse.response_text)
      setIsPublic(existingResponse.is_public)
    } else {
      setResponseText('')
      setIsPublic(true)
    }
    setError(null)
  }

  const handleEdit = () => {
    setShowForm(true)
  }

  // If there's an existing response and we're not editing, show it
  if (existingResponse && !showForm) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-blue-800 flex items-center gap-2">
            <CheckCircle size={16} />
            Your Response
          </h4>
          <button
            onClick={handleEdit}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            <Edit size={14} />
            Edit
          </button>
        </div>
        
        <p className="text-blue-700 mb-2">{existingResponse.response_text}</p>
        
        <div className="flex items-center gap-4 text-xs text-blue-600">
          <span>
            {existingResponse.is_public ? 'Public response' : 'Private response'}
          </span>
          <span>
            {existingResponse.created_at && new Date(existingResponse.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h4 className="font-medium text-gray-800 mb-3">
        {existingResponse ? 'Edit Response' : 'Respond to Review'}
      </h4>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Response *
          </label>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Share your perspective on this review..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Keep your response professional and constructive
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isPublic" className="text-sm text-gray-700">
            Make this response public (customers can see it)
          </label>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !responseText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : (existingResponse ? 'Update Response' : 'Submit Response')}
          </button>
          
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h5 className="text-sm font-medium text-blue-800 mb-2">Response Guidelines</h5>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Be professional and courteous</li>
          <li>• Address specific concerns mentioned in the review</li>
          <li>• Thank customers for positive feedback</li>
          <li>• Offer solutions for any issues raised</li>
          <li>• Keep responses concise and helpful</li>
        </ul>
      </div>
    </div>
  )
}
