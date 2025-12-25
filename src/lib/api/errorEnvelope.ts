/**
 * Consistent error envelope for API responses
 * Follows OpenAPI contract standards
 */

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
    timestamp: string
    path?: string
  }
}

export interface ApiSuccess<T = unknown> {
  data: T
  meta?: {
    timestamp: string
    requestId?: string
  }
}

/**
 * Create a consistent error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, unknown>,
  path?: string
): Response {
  const error: ApiError = {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path,
    },
  }

  return new Response(JSON.stringify(error), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Create a consistent success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  requestId?: string
): Response {
  const response: ApiSuccess<T> = {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Standard error codes
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
} as const
