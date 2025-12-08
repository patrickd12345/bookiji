import { useState } from 'react'
import type { TimeMachineDiff, TimeMachineState } from '../../../../src/app/api/ops/controlplane/_lib/types'
import { timeMachineClient } from '../services/timeMachineClient'

export function useTimeMachine() {
  const [state, setState] = useState<TimeMachineState | null>(null)
  const [diff, setDiff] = useState<TimeMachineDiff | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const viewAt = async (at: string) => {
    setLoading(true)
    setError(null)
    try {
      const snapshot = await timeMachineClient.fetchState(at)
      setState(snapshot)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch state')
    } finally {
      setLoading(false)
    }
  }

  const compare = async (from: string, to: string) => {
    setLoading(true)
    setError(null)
    try {
      const delta = await timeMachineClient.fetchDiff(from, to)
      setDiff(delta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to diff state')
    } finally {
      setLoading(false)
    }
  }

  return { state, diff, loading, error, viewAt, compare }
}
