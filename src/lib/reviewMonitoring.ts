import { createClient } from '@supabase/supabase-js'
import { aiModeration, ModerationResult, ReviewData } from './aiModeration'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ModerationAuditLog {
  id: string
  review_id: string
  moderator_id?: string
  action: 'auto_flag' | 'manual_review' | 'approve' | 'reject' | 'flag' | 'remove'
  reason: string
  confidence_score: number
  ai_categories: string[]
  keyword_matches: string[]
  behavioral_flags: string[]
  processing_time_ms: number
  created_at: string
  metadata: Record<string, any>
}

export interface ModerationMetrics {
  total_reviews: number
  flagged_reviews: number
  auto_flagged: number
  manual_reviews: number
  false_positives: number
  false_negatives: number
  average_processing_time: number
  ai_accuracy: number
  category_distribution: Record<string, number>
}

export interface ReviewModerationEvent {
  type: 'review_submitted' | 'auto_flagged' | 'manual_review' | 'decision_made'
  review_id: string
  data: Record<string, any>
  timestamp: string
}

export class ReviewMonitoringService {
  private static instance: ReviewMonitoringService

  static getInstance(): ReviewMonitoringService {
    if (!ReviewMonitoringService.instance) {
      ReviewMonitoringService.instance = new ReviewMonitoringService()
    }
    return ReviewMonitoringService.instance
  }

  /**
   * Log moderation decision for audit trail
   */
  async logModerationDecision(
    reviewId: string,
    action: ModerationAuditLog['action'],
    reason: string,
    confidenceScore: number,
    aiCategories: string[],
    keywordMatches: string[],
    behavioralFlags: string[],
    processingTimeMs: number,
    moderatorId?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const auditLog: Omit<ModerationAuditLog, 'id' | 'created_at'> = {
        review_id: reviewId,
        moderator_id: moderatorId,
        action,
        reason,
        confidence_score: confidenceScore,
        ai_categories: aiCategories,
        keyword_matches: keywordMatches,
        behavioral_flags: behavioralFlags,
        processing_time_ms: processingTimeMs,
        metadata
      }

      const { error } = await supabase
        .from('review_moderation_log')
        .insert(auditLog)

      if (error) {
        console.error('Failed to log moderation decision:', error)
        // Fallback to console logging
        console.log('Moderation Audit Log:', auditLog)
      }
    } catch (error) {
      console.error('Error logging moderation decision:', error)
    }
  }

  /**
   * Process review with comprehensive monitoring
   */
  async processReviewWithMonitoring(
    reviewData: ReviewData,
    reviewId: string
  ): Promise<ModerationResult> {
    const startTime = Date.now()
    
    try {
      // Get reviewer history for behavioral analysis
      const reviewerHistory = await this.getReviewerHistory(reviewData.reviewerId)
      
      // Enhanced review data with history
      const enhancedReviewData: ReviewData = {
        ...reviewData,
        reviewerHistory
      }

      // Run AI moderation
      const moderationResult = await aiModeration.moderateReview(enhancedReviewData)
      
      const processingTime = Date.now() - startTime

      // Extract categories and flags for logging
      const aiCategories = Object.keys(moderationResult.categories).filter(
        key => moderationResult.categories[key as keyof typeof moderationResult.categories]
      )

      const keywordMatches = moderationResult.reasons.filter(
        reason => reason.includes('pattern:') || reason.includes('Detected')
      )

      const behavioralFlags = moderationResult.reasons.filter(
        reason => reason.includes('Excessive') || reason.includes('All') || reason.includes('Suspicious')
      )

      // Log the moderation decision
      await this.logModerationDecision(
        reviewId,
        moderationResult.isFlagged ? 'auto_flag' : 'approve',
        moderationResult.reasons.join('; '),
        moderationResult.confidence,
        aiCategories,
        keywordMatches,
        behavioralFlags,
        processingTime,
        undefined, // Auto-moderation
        {
          original_rating: reviewData.rating,
          text_length: reviewData.text.length,
          reviewer_total_reviews: reviewerHistory.totalReviews,
          reviewer_avg_rating: reviewerHistory.avgRating
        }
      )

      // Emit monitoring event
      this.emitModerationEvent({
        type: moderationResult.isFlagged ? 'auto_flagged' : 'review_submitted',
        review_id: reviewId,
        data: {
          confidence: moderationResult.confidence,
          categories: aiCategories,
          processing_time: processingTime,
          suggested_action: moderationResult.suggestedAction
        },
        timestamp: new Date().toISOString()
      })

      return moderationResult
    } catch (error) {
      const processingTime = Date.now() - startTime
      
      // Log error for monitoring
      await this.logModerationDecision(
        reviewId,
        'manual_review',
        `Moderation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        [],
        [],
        [],
        processingTime,
        undefined,
        { error: true, error_message: error instanceof Error ? error.message : 'Unknown error' }
      )

      // Emit error event
      this.emitModerationEvent({
        type: 'manual_review',
        review_id: reviewId,
        data: {
          error: true,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          processing_time: processingTime
        },
        timestamp: new Date().toISOString()
      })

      // Return fallback result
      return {
        isFlagged: false,
        confidence: 0,
        categories: {
          spam: false,
          inappropriate: false,
          fake: false,
          harassment: false,
          other: false
        },
        reasons: ['Moderation failed, manual review required'],
        suggestedAction: 'review',
        score: 0
      }
    }
  }

  /**
   * Get reviewer history for behavioral analysis
   */
  private async getReviewerHistory(reviewerId: string) {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating, created_at, comment')
        .eq('reviewer_id', reviewerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Failed to fetch reviewer history:', error)
        return {
          totalReviews: 0,
          avgRating: 0,
          recentReviews: 0,
          suspiciousPatterns: []
        }
      }

      const totalReviews = reviews?.length || 0
      const avgRating = reviews && reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length 
        : 0

      // Count recent reviews (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const recentReviews = reviews?.filter(r => new Date(r.created_at) > thirtyDaysAgo).length || 0

      // Detect suspicious patterns
      const suspiciousPatterns: string[] = []
      
      if (reviews && reviews.length > 0) {
        // All same rating
        const allSameRating = reviews.every(r => r.rating === reviews[0].rating)
        if (allSameRating && reviews.length > 3) {
          suspiciousPatterns.push(`All ${reviews[0].rating}-star reviews`)
        }

        // Very short reviews
        const shortReviews = reviews.filter(r => r.comment && r.comment.length < 10).length
        if (shortReviews > reviews.length * 0.5) {
          suspiciousPatterns.push('High percentage of very short reviews')
        }

        // Rapid posting
        if (recentReviews > 10) {
          suspiciousPatterns.push('Excessive recent review activity')
        }
      }

      return {
        totalReviews,
        avgRating,
        recentReviews,
        suspiciousPatterns
      }
    } catch (error) {
      console.warn('Error fetching reviewer history:', error)
      return {
        totalReviews: 0,
        avgRating: 0,
        recentReviews: 0,
        suspiciousPatterns: []
      }
    }
  }

  /**
   * Get moderation metrics for dashboard
   */
  async getModerationMetrics(timeRange: '24h' | '7d' | '30d' = '7d'): Promise<ModerationMetrics> {
    try {
      const startDate = new Date()
      switch (timeRange) {
        case '24h':
          startDate.setDate(startDate.getDate() - 1)
          break
        case '7d':
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(startDate.getDate() - 30)
          break
      }

      // Get review counts
      const { count: totalReviews } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())

      const { count: flaggedReviews } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .in('status', ['flagged', 'pending'])

      // Get moderation log data
      const { data: moderationLogs } = await supabase
        .from('review_moderation_log')
        .select('*')
        .gte('created_at', startDate.toISOString())

      // Calculate metrics
      const autoFlagged = moderationLogs?.filter(log => log.action === 'auto_flag').length || 0
      const manualReviews = moderationLogs?.filter(log => log.action === 'manual_review').length || 0
      
      const averageProcessingTime = moderationLogs && moderationLogs.length > 0
        ? moderationLogs.reduce((sum, log) => sum + log.processing_time_ms, 0) / moderationLogs.length
        : 0

      // Calculate category distribution
      const categoryDistribution: Record<string, number> = {}
      moderationLogs?.forEach(log => {
        log.ai_categories.forEach((category: string) => {
          categoryDistribution[category] = (categoryDistribution[category] || 0) + 1
        })
      })

      // Estimate AI accuracy (this would need manual review data for true accuracy)
      const aiAccuracy = totalReviews ? ((totalReviews - manualReviews) / totalReviews) * 100 : 0

      return {
        total_reviews: totalReviews || 0,
        flagged_reviews: flaggedReviews || 0,
        auto_flagged: autoFlagged,
        manual_reviews: manualReviews,
        false_positives: 0, // Would need manual review data
        false_negatives: 0, // Would need manual review data
        average_processing_time: averageProcessingTime,
        ai_accuracy: aiAccuracy,
        category_distribution: categoryDistribution
      }
    } catch (error) {
      console.error('Error fetching moderation metrics:', error)
      return {
        total_reviews: 0,
        flagged_reviews: 0,
        auto_flagged: 0,
        manual_reviews: 0,
        false_positives: 0,
        false_negatives: 0,
        average_processing_time: 0,
        ai_accuracy: 0,
        category_distribution: {}
      }
    }
  }

  /**
   * Get moderation audit trail
   */
  async getModerationAuditTrail(
    reviewId?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ModerationAuditLog[]> {
    try {
      let query = supabase
        .from('review_moderation_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (reviewId) {
        query = query.eq('review_id', reviewId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching moderation audit trail:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching moderation audit trail:', error)
      return []
    }
  }

  /**
   * Emit moderation event for real-time monitoring
   */
  private emitModerationEvent(event: ReviewModerationEvent): void {
    try {
      // In a real implementation, this would emit to a WebSocket or event system
      // For now, we'll log it and could integrate with your existing event system
      console.log('Moderation Event:', event)
      
      // You could integrate this with:
      // - WebSocket for real-time admin dashboard updates
      // - Event streaming for analytics
      // - Notification system for urgent flags
      // - Metrics aggregation service
    } catch (error) {
      console.error('Error emitting moderation event:', error)
    }
  }

  /**
   * Generate moderation report
   */
  async generateModerationReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: ModerationMetrics
    trends: Array<{ date: string; metrics: Partial<ModerationMetrics> }>
    topIssues: Array<{ category: string; count: number; examples: string[] }>
    recommendations: string[]
  }> {
    try {
      const summary = await this.getModerationMetrics('30d')
      
      // Generate daily trends (simplified - in production you'd want more sophisticated aggregation)
      const trends: Array<{ date: string; metrics: Partial<ModerationMetrics> }> = []
      const currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        const dayMetrics = await this.getModerationMetrics('24h')
        trends.push({
          date: currentDate.toISOString().split('T')[0],
          metrics: {
            total_reviews: dayMetrics.total_reviews,
            flagged_reviews: dayMetrics.flagged_reviews,
            auto_flagged: dayMetrics.auto_flagged
          }
        })
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Analyze top issues
      const { data: recentLogs } = await supabase
        .from('review_moderation_log')
        .select('ai_categories, keyword_matches, behavioral_flags')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      const issueCounts: Record<string, number> = {}
      const issueExamples: Record<string, string[]> = {}

      recentLogs?.forEach(log => {
        const allIssues = [
          ...log.ai_categories,
          ...log.keyword_matches,
          ...log.behavioral_flags
        ]

        allIssues.forEach((issue: string) => {
          issueCounts[issue] = (issueCounts[issue] || 0) + 1
          if (!issueExamples[issue]) {
            issueExamples[issue] = []
          }
          if (issueExamples[issue].length < 3) {
            issueExamples[issue].push(issue)
          }
        })
      })

      const topIssues = Object.entries(issueCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([category, count]) => ({
          category,
          count,
          examples: issueExamples[category] || []
        }))

      // Generate recommendations
      const recommendations: string[] = []
      
      if (summary.ai_accuracy < 80) {
        recommendations.push('Consider retraining AI models or adjusting confidence thresholds')
      }
      
      if (summary.average_processing_time > 5000) {
        recommendations.push('Review moderation pipeline performance and optimize processing')
      }
      
      if (summary.flagged_reviews > summary.total_reviews * 0.3) {
        recommendations.push('High flag rate detected - review moderation criteria and thresholds')
      }

      if (topIssues.some(issue => issue.category.includes('financial') || issue.category.includes('spam'))) {
        recommendations.push('Increase monitoring for financial spam and promotional content')
      }

      return {
        summary,
        trends,
        topIssues,
        recommendations
      }
    } catch (error) {
      console.error('Error generating moderation report:', error)
      throw error
    }
  }

  /**
   * Health check for monitoring system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Record<string, boolean>
    details: Record<string, any>
  }> {
    const checks: Record<string, boolean> = {}
    const details: Record<string, any> = {}

    try {
      // Check database connectivity
      const { data: dbCheck } = await supabase
        .from('review_moderation_log')
        .select('count', { count: 'exact', head: true })
        .limit(1)
      
      checks.database = !!dbCheck
      details.database = { connected: !!dbCheck }

      // Check AI moderation service
      const aiStats = aiModeration.getModerationStats()
      checks.aiService = aiStats.enabled
      details.aiService = aiStats

      // Check recent processing
      const { data: recentLogs } = await supabase
        .from('review_moderation_log')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1)

      checks.recentActivity = !!recentLogs && recentLogs.length > 0
      details.recentActivity = { 
        hasRecentLogs: !!recentLogs && recentLogs.length > 0,
        lastLogTime: recentLogs?.[0]?.created_at 
      }

      // Determine overall status
      const allChecksPassed = Object.values(checks).every(check => check)
      const status: 'healthy' | 'degraded' | 'unhealthy' = allChecksPassed 
        ? 'healthy' 
        : checks.database 
          ? 'degraded' 
          : 'unhealthy'

      return { status, checks, details }
    } catch (error) {
      console.error('Health check failed:', error)
      return {
        status: 'unhealthy',
        checks: { database: false, aiService: false, recentActivity: false },
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

// Export singleton instance
export const reviewMonitoring = ReviewMonitoringService.getInstance()
