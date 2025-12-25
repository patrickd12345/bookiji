/**
 * Get the base URL from the request, supporting subdomains
 * Falls back to environment variable if request is not available
 */
export function getBaseUrl(request?: Request | { headers: Headers }): string {
  // If we have a request, use the host header
  if (request) {
    const headers = request.headers instanceof Headers ? request.headers : new Headers()
    const host = headers.get('host')
    const protocol = headers.get('x-forwarded-proto') || 
                     (headers.get('x-forwarded-ssl') === 'on' ? 'https' : 'http') ||
                     (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    
    if (host) {
      return `${protocol}://${host}`
    }
  }
  
  // Fallback to environment variable
  return process.env.NEXT_PUBLIC_APP_URL || 
         process.env.NEXT_PUBLIC_BASE_URL || 
         'http://localhost:3000'
}

