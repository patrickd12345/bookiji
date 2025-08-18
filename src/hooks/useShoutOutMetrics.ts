import useSWR from 'swr'
import type { 
  ShoutOutMetrics, 
  UseShoutOutMetricsReturn,
  GetMetricsResponse 
} from '@/types/shout-out-metrics'

const fetcher = async (url: string): Promise<ShoutOutMetrics> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch metrics: ${response.status}`)
  }
  const data: GetMetricsResponse = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch metrics')
  }
  return data.metrics
}

export function useShoutOutMetrics(): UseShoutOutMetricsReturn {
  const { data, error, mutate, isLoading } = useSWR<ShoutOutMetrics>(
    '/api/shout-outs/metrics',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  )

  return {
    metrics: data,
    isLoading,
    isError: !!error,
    error,
    mutate
  }
}
