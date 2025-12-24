import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

interface ShoutOutData {
  date: string
  count: number
  revenue: number
}

interface UseShoutOutTimeseriesReturn {
  data: ShoutOutData[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useShoutOutTimeseries(timeRange: '7d' | '30d' | '90d' = '7d'): UseShoutOutTimeseriesReturn {
  const [data, setData] = useState<ShoutOutData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const config = getSupabaseConfig()
      if (!config?.url || !config?.publishableKey) {
        throw new Error('Invalid Supabase configuration')
      }

      const _supabase = createClient(config.url, config.publishableKey)
      
      // Calculate date range
      const now = new Date()
      const startDate = new Date()
      switch (timeRange) {
        case '7d':
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          break
        case '90d':
          startDate.setDate(now.getDate() - 90)
          break
      }

      // Mock data for now - replace with actual query when shout_out table exists
      const mockData: ShoutOutData[] = []
      const days = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        mockData.push({
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 10) + 1,
          revenue: Math.floor(Math.random() * 100) + 10,
        })
      }

      setData(mockData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shout out data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}





