import { useEffect, useState, useCallback } from 'react'
import type { ControlPlaneOverview } from '../../../../src/app/api/ops/controlplane/_lib/types'
import { opsaiClient } from '../services/opsaiClient'

export function useOpsSummary() {
  const [data, setData] = useState<ControlPlaneOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const overview = await opsaiClient.overview()
      setData(overview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overview')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load }
}
