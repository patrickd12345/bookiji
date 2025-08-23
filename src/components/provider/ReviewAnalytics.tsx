'use client'

import React, { useState, useEffect, useCallback } from 'react'
import StarRating from '@/components/ui/StarRating'

interface ReviewAnalytics {
  provider_id: string
  provider_name: string
  total_reviews: number
  published_reviews: number
  pending_reviews: number
  flagged_reviews: number
  avg_overall_quality: number
  avg_service_quality: number
  avg_communication: number
  avg_punctuality: number
  avg_value_for_money: number
  recommendation_count: number
  recommendation_percentage: number
  positive_reviews: number
  negative_reviews: number
  neutral_reviews: number
  last_review_date: string
  first_review_date: string
}

interface RatingDistribution {
  rating: number
  count: number
  percentage: number
}

interface ReviewTrend {
  date: string
  count: number
  avg_rating: number
}

export default function ReviewAnalytics({ providerId }: { providerId: string }) {
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null)
  const [distribution, setDistribution] = useState<RatingDistribution[]>([])
  const [trends, setTrends] = useState<ReviewTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/provider/reviews/analytics?provider_id=${providerId}&time_range=${timeRange}`)
      const data = await response.json()
      
      if (data.analytics) {
        setAnalytics(data.analytics)
        setDistribution(data.distribution || [])
        setTrends(data.trends || [])
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [providerId, timeRange])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600'
    if (rating >= 4.0) return 'text-blue-600'
    if (rating >= 3.5) return 'text-yellow-600'
    if (rating >= 3.0) return 'text-orange-600'
    return 'text-red-600'
  }

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-blue-600'
    if (percentage >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Analytics</h2>
          <p className="text-gray-600">Comprehensive insights into your customer reviews and ratings</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Rating</p>
              <div className="flex items-center gap-2 mt-1">
                <StarRating 
                  value={analytics.avg_overall_quality} 
                  readonly 
                  allowHalfStars={true}
                  showValue={false}
                />
                <span className={`text-2xl font-bold ${getRatingColor(analytics.avg_overall_quality)}`}>
                  {analytics.avg_overall_quality.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{analytics.total_reviews}</div>
              <div className="text-sm text-gray-600">Total Reviews</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getPercentageColor(analytics.recommendation_percentage)}`}>
              {analytics.recommendation_percentage}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Recommendation Rate</div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.recommendation_count} of {analytics.published_reviews} customers
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{analytics.published_reviews}</div>
            <div className="text-sm text-gray-600 mt-1">Published Reviews</div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.pending_reviews} pending
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{analytics.positive_reviews}</div>
            <div className="text-sm text-gray-600 mt-1">Positive Reviews</div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.negative_reviews} negative
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Ratings */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Rating Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Service Quality</h4>
            <div className="flex items-center gap-3">
              <StarRating 
                value={analytics.avg_service_quality} 
                readonly 
                allowHalfStars={true}
                showValue={false}
              />
              <span className={`text-lg font-semibold ${getRatingColor(analytics.avg_service_quality)}`}>
                {analytics.avg_service_quality.toFixed(1)}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-3">Communication</h4>
            <div className="flex items-center gap-3">
              <StarRating 
                value={analytics.avg_communication} 
                readonly 
                allowHalfStars={true}
                showValue={false}
              />
              <span className={`text-lg font-semibold ${getRatingColor(analytics.avg_communication)}`}>
                {analytics.avg_communication.toFixed(1)}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-3">Punctuality</h4>
            <div className="flex items-center gap-3">
              <StarRating 
                value={analytics.avg_punctuality} 
                readonly 
                allowHalfStars={true}
                showValue={false}
              />
              <span className={`text-lg font-semibold ${getRatingColor(analytics.avg_punctuality)}`}>
                {analytics.avg_punctuality.toFixed(1)}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-3">Value for Money</h4>
            <div className="flex items-center gap-3">
              <StarRating 
                value={analytics.avg_value_for_money} 
                readonly 
                allowHalfStars={true}
                showValue={false}
              />
              <span className={`text-lg font-semibold ${getRatingColor(analytics.avg_value_for_money)}`}>
                {analytics.avg_value_for_money.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
        <div className="space-y-3">
          {distribution.map((item) => (
            <div key={item.rating} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-16">
                <span className="text-sm font-medium">{item.rating} ★</span>
                <span className="text-sm text-gray-500">({item.count})</span>
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className="bg-yellow-400 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 w-16 text-right">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Review Trends */}
      {trends.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Trends</h3>
          <div className="space-y-3">
            {trends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  {formatDate(trend.date)}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {trend.count} review{trend.count !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    <StarRating 
                      value={trend.avg_rating} 
                      readonly 
                      size="small"
                      allowHalfStars={true}
                      showValue={false}
                    />
                    <span className="text-sm text-gray-600">
                      {trend.avg_rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Timeline */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Timeline</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-700">First Review</span>
            <span className="text-sm text-blue-600">
              {formatDate(analytics.first_review_date)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="text-sm font-medium text-green-700">Latest Review</span>
            <span className="text-sm text-green-600">
              {formatDate(analytics.last_review_date)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <span className="text-sm font-medium text-purple-700">Reviewing for</span>
            <span className="text-sm text-purple-600">
              {Math.ceil((new Date().getTime() - new Date(analytics.first_review_date).getTime()) / (1000 * 60 * 60 * 24))} days
            </span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="space-y-3">
          {analytics.avg_overall_quality >= 4.5 && (
            <div className="flex items-center gap-2 text-green-600">
              <span>🎉</span>
              <span className="text-sm">Excellent! Your average rating is outstanding</span>
            </div>
          )}
          {analytics.recommendation_percentage >= 90 && (
            <div className="flex items-center gap-2 text-green-600">
              <span>👍</span>
              <span className="text-sm">Amazing recommendation rate! Customers love your service</span>
            </div>
          )}
          {analytics.avg_overall_quality < 4.0 && (
            <div className="flex items-center gap-2 text-yellow-600">
              <span>⚠️</span>
              <span className="text-sm">Consider focusing on areas with lower ratings</span>
            </div>
          )}
          {analytics.pending_reviews > 0 && (
            <div className="flex items-center gap-2 text-blue-600">
              <span>📝</span>
              <span className="text-sm">You have {analytics.pending_reviews} reviews pending moderation</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
