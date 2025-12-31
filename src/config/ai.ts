/**
 * AI Service Configuration
 * Centralized configuration for AI service timeouts, retries, and fallbacks
 * 
 * ⚠️ IMPORTANT: Production uses Gemini 1.5 Flash as the in-house model.
 * Ollama configuration is for local development/testing only.
 */

export interface AIConfig {
  ollama: {
    // ⚠️ LOCAL DEVELOPMENT ONLY - Production uses Gemini
    timeout: number
    maxRetries: number
    retryDelay: number
    healthCheckTimeout: number
    modelCheckTimeout: number
  }
  fallbacks: {
    enabled: boolean
    responseTypes: string[]
  }
  monitoring: {
    logResponseTimes: boolean
    logFallbacks: boolean
    logErrors: boolean
  }
}

/**
 * Default AI configuration
 */
export const defaultAIConfig: AIConfig = {
  ollama: {
    timeout: 60000, // 60 seconds (increased for slower AI operations)
    maxRetries: 2,
    retryDelay: 1000, // 1 second
    healthCheckTimeout: 5000, // 5 seconds
    modelCheckTimeout: 10000 // 10 seconds
  },
  fallbacks: {
    enabled: true,
    responseTypes: ['booking', 'general']
  },
  monitoring: {
    logResponseTimes: true,
    logFallbacks: true,
    logErrors: true
  }
}

/**
 * Get AI configuration with environment variable overrides
 */
export function getAIConfig(): AIConfig {
  return {
    ollama: {
      timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000', 10),
      maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES || '2', 10),
      retryDelay: parseInt(process.env.OLLAMA_RETRY_DELAY || '1000', 10),
      healthCheckTimeout: parseInt(process.env.OLLAMA_HEALTH_CHECK_TIMEOUT || '5000', 10),
      modelCheckTimeout: parseInt(process.env.OLLAMA_MODEL_CHECK_TIMEOUT || '10000', 10)
    },
    fallbacks: {
      enabled: process.env.AI_FALLBACKS_ENABLED !== 'false',
      responseTypes: (process.env.AI_FALLBACK_RESPONSE_TYPES || 'booking,general').split(',')
    },
    monitoring: {
      logResponseTimes: process.env.AI_LOG_RESPONSE_TIMES !== 'false',
      logFallbacks: process.env.AI_LOG_FALLBACKS !== 'false',
      logErrors: process.env.AI_LOG_ERRORS !== 'false'
    }
  }
}

/**
 * Environment variable documentation
 */
export const AI_ENV_VARS = {
  OLLAMA_TIMEOUT: 'Timeout for Ollama requests in milliseconds (default: 60000)',
  OLLAMA_MAX_RETRIES: 'Maximum number of retry attempts (default: 2)',
  OLLAMA_RETRY_DELAY: 'Base delay between retries in milliseconds (default: 1000)',
  OLLAMA_HEALTH_CHECK_TIMEOUT: 'Timeout for health check requests (default: 5000)',
  OLLAMA_MODEL_CHECK_TIMEOUT: 'Timeout for model list requests (default: 10000)',
  AI_FALLBACKS_ENABLED: 'Enable fallback responses when AI is unavailable (default: true)',
  AI_FALLBACK_RESPONSE_TYPES: 'Comma-separated list of fallback response types (default: booking,general)',
  AI_LOG_RESPONSE_TIMES: 'Log response times for monitoring (default: true)',
  AI_LOG_FALLBACKS: 'Log when fallback responses are used (default: true)',
  AI_LOG_ERRORS: 'Log AI service errors (default: true)'
}
