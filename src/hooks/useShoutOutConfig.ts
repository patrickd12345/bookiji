import useSWR from 'swr'
import type { 
  ShoutOutConfig, 
  UseShoutOutConfigReturn,
  GetConfigResponse,
  UpdateConfigRequest,
  UpdateConfigResponse
} from '@/types/shout-out-metrics'

const fetcher = async (url: string): Promise<ShoutOutConfig> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.status}`)
  }
  const data: GetConfigResponse = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch config')
  }
  return data.config
}

export function useShoutOutConfig(): UseShoutOutConfigReturn {
  const { data, error, mutate, isLoading } = useSWR<ShoutOutConfig>(
    '/api/shout-outs/config',
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  )

  const updateConfig = async (configUpdate: UpdateConfigRequest): Promise<ShoutOutConfig | undefined> => {
    try {
      const response = await fetch('/api/admin/shout-outs/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configUpdate)
      })

      if (!response.ok) {
        throw new Error(`Failed to update config: ${response.status}`)
      }

      const data: UpdateConfigResponse = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to update config')
      }

      // Revalidate the cache with the new data
      await mutate(data.config, false)
      return data.config
    } catch (error) {
      console.error('Error updating shout-out config:', error)
      throw error
    }
  }

  return {
    config: data,
    isLoading,
    isError: !!error,
    error,
    updateConfig,
    mutate
  }
}
