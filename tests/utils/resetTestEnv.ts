import { vi } from 'vitest'

export function resetTestEnv() {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.resetModules()
}
