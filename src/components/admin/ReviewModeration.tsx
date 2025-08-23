'use client'

import React, { useState, useEffect, useCallback } from 'react'
import StarRating from '@/components/ui/StarRating'

interface Review {
  id: string
  rating: number
  overall_quality?: number
  review_text?: string
  service_quality?: number
  communication?: number
  punctuality?: number
  value_for_money?: number
  would_recommend?: boolean
  photos?: string[]
  created_at: string
  status: string
  moderation_status: string
  spam_score: number
  helpful_count: number
  reported_count: number
  flagged_reason?: string
  reviewer: {
    name: string
    email: string
  }
  provider: {
    name: string
    email: string
  }
  booking: {
    service_name: string
    service_date: string
  }
}

interface ModerationAction {
  reviewId: string
  action: 'approve' | 'reject' | 'flag' | 'remove' | 'restore'
  reason?: string
  details?: Record<string, any>
}

export default function ReviewModeration() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'flagged' | 'needs_review'>('pending')
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'flag' | 'remove'>('approve')
  const [bulkReason, setBulkReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/reviews/moderation')
      const data = await response.json()
      
      if (data.reviews) {
        setReviews(data.reviews)
      }
    } catch (error) {
      console.error('Failed to load reviews:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  const handleBulkAction = async () => {
    if (selectedReviews.size === 0) return

    try {
      setProcessing(true)
      const response = await fetch('/api/admin/reviews/bulk-moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewIds: Array.from(selectedReviews),
          action: bulkAction,
          reason: bulkReason || undefined
        })
      })

      if (response.ok) {
        setSelectedReviews(new Set())
        setBulkReason('')
        loadReviews()
        alert(`Successfully processed ${selectedReviews.size} reviews`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error('Bulk action failed:', error)
      alert('Failed to process bulk action')
    } finally {
      setProcessing(false)
    }
  }

  const handleSingleAction = async (reviewId: string, action: string, reason?: string) => {
    try {
      const response = await fetch('/api/admin/reviews/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          action,
          reason
        })
      })

      if (response.ok) {
        loadReviews()
        alert(`Review ${action}d successfully`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error('Action failed:', error)
      alert('Failed to process action')
    }
  }

  const toggleReviewSelection = (reviewId: string) => {
    const newSelection = new Set(selectedReviews)
    if (newSelection.has(reviewId)) {
      newSelection.delete(reviewId)
    } else {
      newSelection.add(reviewId)
    }
    setSelectedReviews(newSelection)
  }

  const getFilteredReviews = () => {
    switch (filter) {
      case 'pending':
        return reviews.filter(r => r.moderation_status === 'pending')
      case 'flagged':
        return reviews.filter(r => r.status === 'flagged')
      case 'needs_review':
        return reviews.filter(r => r.spam_score > 0.7 || r.reported_count > 0)
      default:
        return reviews
    }
  }

  const getSpamScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600 bg-red-100'
    if (score >= 0.6) return 'text-orange-600 bg-orange-100'
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'flagged': return 'text-red-600 bg-red-100'
      case 'removed': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredReviews = getFilteredReviews()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Moderation</h1>
          <p className="text-gray-600">Manage and moderate customer reviews with AI-powered spam detection</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {filteredReviews.length} reviews to moderate
          </span>
        </div>
      </div>

      {/* Filters and Bulk Actions */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pending">Pending Review</option>
              <option value="flagged">Flagged Reviews</option>
              <option value="needs_review">Needs Attention</option>
              <option value="all">All Reviews</option>
            </select>
          </div>

          {selectedReviews.size > 0 && (
            <div className="flex items-center gap-3">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
                <option value="flag">Flag</option>
                <option value="remove">Remove</option>
              </select>
              <input
                type="text"
                placeholder="Reason (optional)"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
              />
              <button
                onClick={handleBulkAction}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {processing ? 'Processing...' : `Apply to ${selectedReviews.size} reviews`}
              </button>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {reviews.filter(r => r.moderation_status === 'pending').length}
            </div>
            <div className="text-blue-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {reviews.filter(r => r.status === 'flagged').length}
            </div>
            <div className="text-yellow-600">Flagged</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {reviews.filter(r => r.spam_score > 0.7).length}
            </div>
            <div className="text-red-600">High Spam Risk</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {reviews.filter(r => r.moderation_status === 'approved').length}
            </div>
            <div className="text-green-600">Approved</div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reviews...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No reviews to moderate</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review.id} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-start gap-4">
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedReviews.has(review.id)}
                  onChange={() => toggleReviewSelection(review.id)}
                  className="mt-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />

                {/* Review Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Review by {review.reviewer.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {review.booking.service_name} • {formatDate(review.booking.service_date)}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                        {review.status}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSpamScoreColor(review.spam_score)}`}>
                        Spam: {(review.spam_score * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(review.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="mb-3">
                    <StarRating 
                      value={review.overall_quality || review.rating} 
                      readonly 
                      allowHalfStars={true}
                      showValue={false}
                    />
                  </div>

                  {/* Review Text */}
                  {review.review_text && (
                    <p className="text-gray-700 mb-3">{review.review_text}</p>
                  )}

                  {/* Detailed Ratings */}
                  {(review.service_quality || review.communication || review.punctuality || review.value_for_money) && (
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      {review.service_quality && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Service Quality:</span>
                          <StarRating 
                            value={review.service_quality} 
                            readonly 
                            size="small" 
                            allowHalfStars={true}
                            showValue={false}
                          />
                        </div>
                      )}
                      {review.communication && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Communication:</span>
                          <StarRating 
                            value={review.communication} 
                            readonly 
                            size="small" 
                            allowHalfStars={true}
                            showValue={false}
                          />
                        </div>
                      )}
                      {review.punctuality && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Punctuality:</span>
                          <StarRating 
                            value={review.punctuality} 
                            readonly 
                            size="small" 
                            allowHalfStars={true}
                            showValue={false}
                          />
                        </div>
                      )}
                      {review.value_for_money && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Value for Money:</span>
                          <StarRating 
                            value={review.value_for_money} 
                            readonly 
                            size="small" 
                            allowHalfStars={true}
                            showValue={false}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">Helpful:</span> {review.helpful_count}
                    </div>
                    <div>
                      <span className="font-medium">Reported:</span> {review.reported_count}
                    </div>
                    <div>
                      <span className="font-medium">Would Recommend:</span> {review.would_recommend ? 'Yes' : 'No'}
                    </div>
                  </div>

                  {/* Photos */}
                  {review.photos && review.photos.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Photos:</p>
                      <div className="flex gap-2">
                        {review.photos.map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Review photo ${index + 1}`}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSingleAction(review.id, 'approve')}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleSingleAction(review.id, 'reject')}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      ✗ Reject
                    </button>
                    <button
                      onClick={() => handleSingleAction(review.id, 'flag')}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                    >
                      ⚠️ Flag
                    </button>
                    <button
                      onClick={() => handleSingleAction(review.id, 'remove')}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
