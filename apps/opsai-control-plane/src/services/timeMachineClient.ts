import type { TimeMachineDiff, TimeMachineState } from '../../../../src/app/api/ops/controlplane/_lib/types'
import { opsaiClient } from './opsaiClient'

export const timeMachineClient = {
  fetchState: (at: string): Promise<TimeMachineState> => opsaiClient.timeMachineState(at),
  fetchDiff: (from: string, to: string): Promise<TimeMachineDiff> =>
    opsaiClient.timeMachineDiff(from, to)
}
