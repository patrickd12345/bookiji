import OpenAI from 'openai'

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const MODERATION_ENABLED = process.env.AI_MODERATION_ENABLED === 'true'
const CONFIDENCE_THRESHOLD = 0.7

// Initialize OpenAI client
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null

export interface ModerationResult {
  isFlagged: boolean
  confidence: number
  categories: {
    spam: boolean
    inappropriate: boolean
    fake: boolean
    harassment: boolean
    other: boolean
  }
  reasons: string[]
  suggestedAction: 'approve' | 'flag' | 'reject' | 'review'
  score: number
}

export interface ReviewData {
  text: string
  rating: number
  reviewerId: string
  providerId: string
  reviewerHistory: {
    totalReviews: number
    avgRating: number
    recentReviews: number
    suspiciousPatterns: string[]
  }
}

// Keyword-based spam detection patterns
const SPAM_PATTERNS = {
  financial: [
    'free money', 'cash', 'earn', 'profit', 'investment', 'opportunity',
    'work from home', 'make money', 'get rich', 'financial freedom',
    'bitcoin', 'crypto', 'forex', 'trading', 'mlm', 'pyramid scheme'
  ],
  promotional: [
    'buy now', 'limited time', 'special offer', 'discount', 'sale',
    'click here', 'visit website', 'call now', 'text me', 'dm me'
  ],
  suspicious: [
    'urgent', 'act now', 'don\'t miss out', 'exclusive', 'secret',
    'guaranteed', '100%', 'instant', 'quick', 'easy money'
  ],
  inappropriate: [
    'hate', 'racist', 'sexist', 'discriminatory', 'violent',
    'threat', 'harassment', 'bullying', 'abuse'
  ]
}

// Behavioral pattern detection
const BEHAVIORAL_FLAGS = {
  excessiveReviews: 10, // More than 10 reviews in short time
  ratingExtremity: 0.8, // All 5-star or all 1-star reviews
  shortTextThreshold: 10, // Very short review text
  repetitivePatterns: 0.3, // High repetition in text
  suspiciousTiming: 24 * 60 * 60 * 1000 // Multiple reviews within 24 hours
}

export class AIModerationService {
  private static instance: AIModerationService

  static getInstance(): AIModerationService {
    if (!AIModerationService.instance) {
      AIModerationService.instance = new AIModerationService()
    }
    return AIModerationService.instance
  }

  /**
   * Comprehensive review moderation combining keyword detection and AI analysis
   */
  async moderateReview(reviewData: ReviewData): Promise<ModerationResult> {
    try {
      // Step 1: Basic keyword and pattern detection
      const keywordResult = this.detectKeywordPatterns(reviewData.text)
      
      // Step 2: Behavioral analysis
      const behavioralResult = this.analyzeBehavioralPatterns(reviewData)
      
      // Step 3: AI-powered content analysis (if enabled and available)
      let aiResult: Partial<ModerationResult> = {}
      if (MODERATION_ENABLED && openai) {
        try {
          aiResult = await this.analyzeWithAI(reviewData.text)
        } catch (error) {
          console.warn('AI moderation failed, falling back to keyword detection:', error)
        }
      }

      // Step 4: Combine all results for final decision
      return this.combineModerationResults(keywordResult, behavioralResult, aiResult)
    } catch (error) {
      console.error('Moderation failed:', error)
      // Fallback to basic keyword detection
      return this.detectKeywordPatterns(reviewData.text)
    }
  }

  /**
   * Keyword-based pattern detection
   */
  private detectKeywordPatterns(text: string): ModerationResult {
    const lowerText = text.toLowerCase()
    const reasons: string[] = []
    let score = 0
    const flaggedCategories = {
      spam: false,
      inappropriate: false,
      fake: false,
      harassment: false,
      other: false
    }

    // Check for spam patterns
    for (const category of Object.keys(SPAM_PATTERNS) as Array<keyof typeof SPAM_PATTERNS>) {
      for (const pattern of SPAM_PATTERNS[category]) {
        if (lowerText.includes(pattern)) {
          reasons.push(`Detected ${category} pattern: "${pattern}"`)
          score += 0.3
          
          if (category === 'financial' || category === 'promotional') {
            flaggedCategories.spam = true
          } else if (category === 'inappropriate') {
            flaggedCategories.inappropriate = true
          }
        }
      }
    }

    // Check for excessive capitalization
    if (text.length > 0) {
      const capsRatio = (text.length - text.toLowerCase().length) / text.length
      if (capsRatio > 0.3) {
        reasons.push('Excessive capitalization detected')
        score += 0.2
        flaggedCategories.spam = true
      }
    }

    // Check for repeated characters
    if (/([a-zA-Z])\1{2,}/.test(text)) {
      reasons.push('Repeated characters detected')
      score += 0.15
      flaggedCategories.spam = true
    }

    // Check for suspicious rating patterns
    if (text.length < BEHAVIORAL_FLAGS.shortTextThreshold) {
      reasons.push('Very short review text')
      score += 0.1
      flaggedCategories.fake = true
    }

    const confidence = Math.min(score, 1.0)
    const isFlagged = confidence > CONFIDENCE_THRESHOLD

    return {
      isFlagged,
      confidence,
      categories: flaggedCategories,
      reasons,
      suggestedAction: this.suggestAction(confidence, flaggedCategories),
      score: confidence
    }
  }

  /**
   * Analyze behavioral patterns of the reviewer
   */
  private analyzeBehavioralPatterns(reviewData: ReviewData): Partial<ModerationResult> {
    const reasons: string[] = []
    let score = 0
    const flaggedCategories = {
      spam: false,
      inappropriate: false,
      fake: false,
      harassment: false,
      other: false
    }

    const { totalReviews, avgRating, recentReviews, suspiciousPatterns } = reviewData.reviewerHistory

    // Multiple reviews in short time
    if (recentReviews > BEHAVIORAL_FLAGS.excessiveReviews) {
      reasons.push(`Excessive recent reviews: ${recentReviews}`)
      score += 0.25
      flaggedCategories.spam = true
    }

    // Suspicious rating patterns
    if (totalReviews > 5) {
      if (avgRating === 5.0) {
        reasons.push('All 5-star reviews from this user')
        score += 0.3
        flaggedCategories.fake = true
      } else if (avgRating === 1.0) {
        reasons.push('All 1-star reviews from this user')
        score += 0.2
        flaggedCategories.fake = true
      }
    }

    // Check for suspicious patterns in reviewer history
    if (suspiciousPatterns.length > 0) {
      reasons.push(`Suspicious patterns in user history: ${suspiciousPatterns.join(', ')}`)
      score += 0.2
      flaggedCategories.other = true
    }

    return {
      confidence: Math.min(score, 1.0),
      reasons,
      categories: flaggedCategories
    }
  }

  /**
   * AI-powered content analysis using OpenAI
   */
  private async analyzeWithAI(text: string): Promise<Partial<ModerationResult>> {
    if (!openai) {
      throw new Error('OpenAI client not available')
    }

    try {
      // Use OpenAI's moderation API
      const moderation = await openai.moderations.create({
        input: text
      })

      const result = moderation.results[0]
      const categories = result.categories
      const categoryScores = result.category_scores

      const reasons: string[] = []
      let score = 0
      const flaggedCategories = {
        spam: false,
        inappropriate: false,
        fake: false,
        harassment: false,
        other: false
      }

      // Map OpenAI categories to our categories
      if (categories.harassment || categories.hate || categories['self-harm']) {
        flaggedCategories.harassment = true
        reasons.push('Content flagged as harassment or hate speech')
        score += Math.max(categoryScores.harassment || 0, categoryScores.hate || 0, categoryScores['self-harm'] || 0)
      }

      if (categories.sexual || categories.violence) {
        flaggedCategories.inappropriate = true
        reasons.push('Content flagged as inappropriate')
        score += Math.max(categoryScores.sexual || 0, categoryScores.violence || 0)
      }

      if (categories['self-harm']) {
        flaggedCategories.inappropriate = true
        reasons.push('Content flagged as concerning')
        score += categoryScores['self-harm'] || 0
      }

      // Check for potential spam indicators
      const spamIndicators = ['spam', 'fraud', 'deception']
      let spamScore = 0
      for (const indicator of spamIndicators) {
        if (categoryScores[indicator as keyof typeof categoryScores]) {
          spamScore = Math.max(spamScore, categoryScores[indicator as keyof typeof categoryScores] || 0)
        }
      }

      if (spamScore > 0.5) {
        flaggedCategories.spam = true
        reasons.push('AI detected potential spam content')
        score += spamScore
      }

      return {
        confidence: Math.min(score, 1.0),
        reasons,
        categories: flaggedCategories
      }
    } catch (error) {
      console.error('OpenAI moderation failed:', error)
      throw error
    }
  }

  /**
   * Combine all moderation results for final decision
   */
  private combineModerationResults(
    keywordResult: ModerationResult,
    behavioralResult: Partial<ModerationResult>,
    aiResult: Partial<ModerationResult>
  ): ModerationResult {
    // Combine scores with weights
    let finalScore = keywordResult.score * 0.4 // 40% weight to keyword detection
    
    if (behavioralResult.confidence) {
      finalScore += behavioralResult.confidence * 0.3 // 30% weight to behavioral analysis
    }
    
    if (aiResult.confidence) {
      finalScore += aiResult.confidence * 0.3 // 30% weight to AI analysis
    }

    // Combine all reasons
    const allReasons = [
      ...keywordResult.reasons,
      ...(behavioralResult.reasons || []),
      ...(aiResult.reasons || [])
    ]

    // Combine categories (if any category is flagged, mark it as flagged)
    const combinedCategories = {
      spam: keywordResult.categories.spam || behavioralResult.categories?.spam || aiResult.categories?.spam || false,
      inappropriate: keywordResult.categories.inappropriate || behavioralResult.categories?.inappropriate || aiResult.categories?.inappropriate || false,
      fake: keywordResult.categories.fake || behavioralResult.categories?.fake || aiResult.categories?.fake || false,
      harassment: keywordResult.categories.harassment || behavioralResult.categories?.harassment || aiResult.categories?.harassment || false,
      other: keywordResult.categories.other || behavioralResult.categories?.other || aiResult.categories?.other || false
    }

    const finalConfidence = Math.min(finalScore, 1.0)
    const isFlagged = finalConfidence > CONFIDENCE_THRESHOLD

    return {
      isFlagged,
      confidence: finalConfidence,
      categories: combinedCategories,
      reasons: allReasons,
      suggestedAction: this.suggestAction(finalConfidence, combinedCategories),
      score: finalConfidence
    }
  }

  /**
   * Suggest moderation action based on confidence and categories
   */
  private suggestAction(confidence: number, _categories: ModerationResult['categories']): ModerationResult['suggestedAction'] {
    if (confidence > 0.9) {
      return 'reject'
    } else if (confidence > 0.7) {
      return 'flag'
    } else if (confidence > 0.5) {
      return 'review'
    } else {
      return 'approve'
    }
  }

  /**
   * Get moderation statistics for monitoring
   */
  getModerationStats(): {
    enabled: boolean
    hasOpenAI: boolean
    confidenceThreshold: number
    patterns: Record<string, string[]>
  } {
    return {
      enabled: MODERATION_ENABLED,
      hasOpenAI: !!openai,
      confidenceThreshold: CONFIDENCE_THRESHOLD,
      patterns: SPAM_PATTERNS
    }
  }
}

// Export singleton instance
export const aiModeration = AIModerationService.getInstance()
