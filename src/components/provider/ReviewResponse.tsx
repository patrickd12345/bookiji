'use client'

import React, { useState } from 'react'

interface ReviewResponseProps {
  reviewId: string
  providerId: string
  onResponseSubmitted?: () => void
  existingResponse?: {
    id: string
    response_text: string
    is_public: boolean
    created_at: string
  }
}

export default function ReviewResponse({ 
  reviewId, 
  providerId, 
  onResponseSubmitted,
  existingResponse 
}: ReviewResponseProps) {
  const [responseText, setResponseText] = useState(existingResponse?.response_text || '')
  const [isPublic, setIsPublic] = useState(existingResponse?.is_public ?? true)
  const [isEditing, setIsEditing] = useState(!existingResponse)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!responseText.trim()) {
      setError('Please enter a response')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const url = existingResponse ? `/api/reviews/response/${existingResponse.id}` : '/api/reviews/response'
      const method = existingResponse ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: reviewId,
          provider_id: providerId,
          response_text: responseText.trim(),
          is_public: isPublic
        })
      })

      if (response.ok) {
        if (onResponseSubmitted) {
          onResponseSubmitted()
        }
        setIsEditing(false)
        alert(existingResponse ? 'Response updated successfully!' : 'Response submitted successfully!')
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to submit response')
      }
    } catch (error) {
      console.error('Failed to submit response:', error)
      setError('Failed to submit response. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setError('')
  }

  const handleCancel = () => {
    if (existingResponse) {
      setResponseText(existingResponse.response_text)
      setIsPublic(existingResponse.is_public)
      setIsEditing(false)
    } else {
      setResponseText('')
      setIsPublic(true)
    }
    setError('')
  }

  const handleDelete = async () => {
    if (!existingResponse || !confirm('Are you sure you want to delete this response?')) {
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/reviews/response/${existingResponse.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        if (onResponseSubmitted) {
          onResponseSubmitted()
        }
        alert('Response deleted successfully!')
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to delete response')
      }
    } catch (error) {
      console.error('Failed to delete response:', error)
      setError('Failed to delete response. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isEditing && existingResponse) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-medium text-blue-800">Your Response</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
        
        <p className="text-blue-700 mb-2">{existingResponse.response_text}</p>
        
        <div className="flex items-center gap-4 text-xs text-blue-600">
          <span>
            {existingResponse.is_public ? 'Public response' : 'Private response'}
          </span>
          <span>
            {new Date(existingResponse.created_at).toLocaleDateString('en-US', {
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


