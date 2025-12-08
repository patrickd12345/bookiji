import { useMemo } from 'react'
import type { ControlPlaneOverview } from '../../../../src/app/api/ops/controlplane/_lib/types'

export function useL7(overview: ControlPlaneOverview | null) {
  return useMemo(() => {
    if (!overview) return null
    return overview.predictions || null
  }, [overview])
}
