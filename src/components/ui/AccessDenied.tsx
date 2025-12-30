import { Button } from './button'
import { useRouter } from 'next/navigation'

interface AccessDeniedProps {
  title?: string
  message?: string
  showHomeButton?: boolean
  showLoginButton?: boolean
  customActions?: React.ReactNode
}

export function AccessDenied({ 
  title = "Access Denied",
  message = "You don't have permission to access this area.",
  showHomeButton = true,
  showLoginButton = true,
  customActions
}: AccessDeniedProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <span className="sr-only">Access Denied</span>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        
        {customActions || (
          <div className="space-y-3">
            {showHomeButton && (
              <Button 
                onClick={() => router.push('/')}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Return to Homepage
              </Button>
            )}
            {showLoginButton && (
              <Button 
                variant="outline"
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Sign In
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
