import { useMemo } from 'react'
import type { ControlPlaneOverview, DeploymentRecord } from '../../../../src/app/api/ops/controlplane/_lib/types'

export function useDeployments(overview: ControlPlaneOverview | null): DeploymentRecord[] {
  return useMemo(() => {
    if (!overview) return []
    const deployments = overview.deployments || []
    return Array.isArray(deployments) ? deployments : []
  }, [overview])
}
