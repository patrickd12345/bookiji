import { useMemo } from 'react'
import type { ControlPlaneOverview } from '../../../../src/app/api/ops/controlplane/_lib/types'

export function useMetrics(overview: ControlPlaneOverview | null) {
  return useMemo(() => {
    if (!overview) {
      return { bookings: null, system: null }
    }
    return {
      bookings: overview.metrics?.bookings ?? null,
      system: overview.metrics?.system ?? null
    }
  }, [overview])
}
