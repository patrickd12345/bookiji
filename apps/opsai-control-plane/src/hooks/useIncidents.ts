import { useMemo } from 'react'
import type { ControlPlaneOverview } from '../../../../src/app/api/ops/controlplane/_lib/types'
import type { Incident } from '../../../../src/types/incidents'

export function useIncidents(overview: ControlPlaneOverview | null): Incident[] {
  return useMemo(() => {
    if (!overview) return []
    const incidents = overview.incidents || []
    return Array.isArray(incidents) ? (incidents as Incident[]) : []
  }, [overview])
}
