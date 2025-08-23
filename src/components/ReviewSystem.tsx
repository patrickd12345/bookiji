'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
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
  spam_score?: number
  helpful_count?: number
  reported_count?: number
  users: {
    name: string
    avatar_url?: string
  }
  bookings: {
    service_name: string
    service_date: string
  }
  responses?: ReviewResponse[]
}

interface ReviewResponse {
  id: string
  response_text: string
  is_public: boolean
  created_at: string
  provider: {
    name: string
    avatar_url?: string
  }
}

interface ReviewSystemProps {
  vendorId: string
  showSubmissionForm?: boolean
  bookingId?: string
  userId?: string
  showModerationTools?: boolean
}

export default function ReviewSystem({ 
  vendorId, 
  showSubmissionForm = false,
  bookingId,
  userId,
  showModerationTools = false
}: ReviewSystemProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [showForm, setShowForm] = useState(showSubmissionForm)
  
  // Form state
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [serviceQuality, setServiceQuality] = useState(0)
  const [communication, setCommunication] = useState(0)
  const [punctuality, setPunctuality] = useState(0)
  const [valueForMoney, setValueForMoney] = useState(0)
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null)
  const [photos, setPhotos] = useState<string[]>([])

  const loadReviews = useCallback(async (page = 0) => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/reviews/create?vendor_id=${vendorId}&limit=10&offset=${page * 10}`
      )
      const data = await response.json()
      
      if (data.reviews) {
        if (page === 0) {
          setReviews(data.reviews)
        } else {
          setReviews(prev => [...prev, ...data.reviews])
        }
        setHasMore(data.pagination.has_more)
      }
    } catch (error) {
      console.error('Failed to load reviews:', error)
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  // Load reviews on mount or when vendorId changes
  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  const submitReview = async () => {
    if (!rating || !bookingId || !userId) return

    try {
      setSubmitting(true)
      
      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          user_id: userId,
          vendor_id: vendorId,
          rating,
          review_text: reviewText || null,
          service_quality: serviceQuality || null,
          communication: communication || null,
          punctuality: punctuality || null,
          value_for_money: valueForMoney || null,
          would_recommend: wouldRecommend,
          photos: photos.length > 0 ? photos : null
        })
      })

      const result = await response.json()

      if (result.success) {
        // Reset form
        setRating(0)
        setReviewText('')
        setServiceQuality(0)
        setCommunication(0)
        setPunctuality(0)
        setValueForMoney(0)
        setWouldRecommend(null)
        setPhotos([])
        setShowForm(false)
        
        // Reload reviews
        loadReviews(0)
        
        alert('Review submitted successfully!')
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to submit review:', error)
      alert('Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      // In a real implementation, you'd upload these to a storage service
      // For now, we'll just create placeholder URLs
      const newPhotos = Array.from(files).map(file => URL.createObjectURL(file))
      setPhotos(prev => [...prev, ...newPhotos])
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0
    const publishedReviews = reviews.filter(r => r.status === 'published')
    if (publishedReviews.length === 0) return 0
    
    const sum = publishedReviews.reduce((acc, review) => acc + (review.overall_quality || review.rating), 0)
    return (sum / publishedReviews.length).toFixed(1)
  }

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    const publishedReviews = reviews.filter(r => r.status === 'published')
    
    publishedReviews.forEach(review => {
      const rating = Math.round(review.overall_quality || review.rating)
      if (rating >= 1 && rating <= 5) {
        distribution[rating as keyof typeof distribution]++
      }
    })
    return distribution
  }

  const getPublishedReviews = () => {
    return reviews.filter(review => review.status === 'published')
  }

  const getPendingReviews = () => {
    return reviews.filter(review => review.status === 'pending')
  }

  const getFlaggedReviews = () => {
    return reviews.filter(review => review.status === 'flagged')
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            Customer Reviews
          </h3>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <StarRating 
                value={Number(calculateAverageRating())} 
                readonly 
                size="large" 
                allowHalfStars={true}
              />
              <span className="text-2xl font-bold text-gray-900">
                {calculateAverageRating()}
              </span>
            </div>
            <span className="text-gray-600">
              ({getPublishedReviews().length} review{getPublishedReviews().length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
        
        {showSubmissionForm && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Write Review
          </button>
        )}
      </div>

      {/* Rating Distribution */}
      {getPublishedReviews().length > 0 && (
        <div className="mb-8">
          <h4 className="text-lg font-semibold mb-4">Rating Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(getRatingDistribution())
              .reverse()
              .map(([rating, count]) => (
                <div key={rating} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-8">{rating} ★</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${getPublishedReviews().length > 0 ? (count / getPublishedReviews().length) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Moderation Summary (if enabled) */}
      {showModerationTools && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-lg font-semibold text-yellow-800 mb-2">Moderation Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-yellow-700">Pending:</span>
              <span className="ml-2 font-semibold">{getPendingReviews().length}</span>
            </div>
            <div>
              <span className="text-yellow-700">Flagged:</span>
              <span className="ml-2 font-semibold">{getFlaggedReviews().length}</span>
            </div>
            <div>
              <span className="text-yellow-700">Published:</span>
              <span className="ml-2 font-semibold">{getPublishedReviews().length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Review Submission Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h4 className="text-lg font-semibold mb-4">Share Your Experience</h4>
          
          <div className="space-y-6">
            {/* Overall Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Rating *
              </label>
              <StarRating 
                value={rating} 
                onChange={setRating} 
                size="large" 
                allowHalfStars={true}
              />
            </div>

            {/* Detailed Ratings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Quality
                </label>
                <StarRating 
                  value={serviceQuality} 
                  onChange={setServiceQuality} 
                  allowHalfStars={true}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Communication
                </label>
                <StarRating 
                  value={communication} 
                  onChange={setCommunication} 
                  allowHalfStars={true}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Punctuality
                </label>
                <StarRating 
                  value={punctuality} 
                  onChange={setPunctuality} 
                  allowHalfStars={true}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Value for Money
                </label>
                <StarRating 
                  value={valueForMoney} 
                  onChange={setValueForMoney} 
                  allowHalfStars={true}
                />
              </div>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Share details about your experience..."
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Photos (Optional)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo}
                        alt={`Review photo ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Would you recommend this provider?
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setWouldRecommend(true)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    wouldRecommend === true
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  👍 Yes
                </button>
                <button
                  type="button"
                  onClick={() => setWouldRecommend(false)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    wouldRecommend === false
                      ? 'bg-red-100 border-red-500 text-red-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  👎 No
                </button>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <button
                onClick={submitReview}
                disabled={!rating || submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {loading && reviews.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reviews...</p>
          </div>
        ) : getPublishedReviews().length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          getPublishedReviews().map((review) => (
            <div key={review.id} className="border-b border-gray-200 pb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {review.users.avatar_url ? (
                    <Image
                      src={review.users.avatar_url}
                      alt={review.users.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <span className="text-blue-600 font-semibold">
                      {review.users.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h5 className="font-semibold text-gray-900">
                        {review.users.name}
                      </h5>
                      <p className="text-sm text-gray-600">
                        {review.bookings.service_name} • {formatDate(review.bookings.service_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-500">
                        {formatDate(review.created_at)}
                      </span>
                      {review.spam_score && review.spam_score > 0.7 && (
                        <div className="text-xs text-red-600 mt-1">
                          ⚠️ High spam score
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <StarRating 
                      value={review.overall_quality || review.rating} 
                      readonly 
                      allowHalfStars={true}
                    />
                  </div>
                  
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
                  
                  {review.would_recommend !== null && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Would recommend:</span>
                      <span className={review.would_recommend ? 'text-green-600' : 'text-red-600'}>
                        {review.would_recommend ? '👍 Yes' : '👎 No'}
                      </span>
                    </div>
                  )}

                  {/* Photos */}
                  {review.photos && review.photos.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      {review.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Review photo ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  {/* Provider Response */}
                  {review.responses && review.responses.length > 0 && (
                    <div className="mt-4 pl-4 border-l-2 border-blue-200">
                      {review.responses.map((response) => (
                        <div key={response.id} className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
                              {response.provider.avatar_url ? (
                                <Image
                                  src={response.provider.avatar_url}
                                  alt={response.provider.name}
                                  width={24}
                                  height={24}
                                  className="w-6 h-6 rounded-full"
                                />
                              ) : (
                                <span className="text-blue-600 text-xs font-semibold">
                                  {response.provider.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-blue-800">
                              {response.provider.name} (Provider)
                            </span>
                            <span className="text-xs text-blue-600">
                              {formatDate(response.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-blue-700">{response.response_text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <button className="text-gray-600 hover:text-blue-600 transition-colors">
                      👍 Helpful ({review.helpful_count || 0})
                    </button>
                    <button className="text-gray-600 hover:text-red-600 transition-colors">
                      ⚠️ Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Load More */}
        {hasMore && getPublishedReviews().length > 0 && (
          <div className="text-center">
            <button
              onClick={() => {
                const nextPage = currentPage + 1
                setCurrentPage(nextPage)
                loadReviews(nextPage)
              }}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Loading...' : 'Load More Reviews'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 