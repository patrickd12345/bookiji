import { useState, useCallback } from 'react'

interface ShoutOutRequest {
  service_type: string
  description?: string
  latitude: number
  longitude: number
  radius_km?: number
}

interface ShoutOut {
  id: string
  user_id: string
  service_type: string
  description?: string
  location: string
  radius_km: number
  status: string
  expires_at: string
  created_at: string
  updated_at: string
}

interface UseShoutOutState {
  shoutOut: ShoutOut | null
  loading: boolean
  error: string | null
}

interface UseShoutOutReturn extends UseShoutOutState {
  createShoutOut: (request: ShoutOutRequest) => Promise<ShoutOut | null>
  acceptOffer: (shoutOutId: string, offerId: string) => Promise<{ booking_id: string } | null>
  clearShoutOut: () => void
  reset: () => void
}

export function useShoutOut(): UseShoutOutReturn {
  const [state, setState] = useState<UseShoutOutState>({
    shoutOut: null,
    loading: false,
    error: null
  })

  const createShoutOut = useCallback(async (request: ShoutOutRequest): Promise<ShoutOut | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch('/api/shout-outs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success || !data.shout_out) {
        throw new Error(data.error || 'Failed to create shout-out')
      }

      const shoutOut = data.shout_out
      setState(prev => ({
        ...prev,
        shoutOut,
        loading: false,
        error: null
      }))

      return shoutOut
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create shout-out'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  const acceptOffer = useCallback(async (
    shoutOutId: string, 
    offerId: string
  ): Promise<{ booking_id: string } | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(`/api/shout-outs/${shoutOutId}/offers/${offerId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success || !data.booking_id) {
        throw new Error(data.error || 'Failed to accept offer')
      }

      // Update shout-out status to closed
      setState(prev => ({
        ...prev,
        shoutOut: prev.shoutOut ? {
          ...prev.shoutOut,
          status: 'closed'
        } : null,
        loading: false,
        error: null
      }))

      return { booking_id: data.booking_id }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept offer'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  const clearShoutOut = useCallback(() => {
    setState(prev => ({
      ...prev,
      shoutOut: null
    }))
  }, [])

  const reset = useCallback(() => {
    setState({
      shoutOut: null,
      loading: false,
      error: null
    })
  }, [])

  return {
    ...state,
    createShoutOut,
    acceptOffer,
    clearShoutOut,
    reset
  }
}
