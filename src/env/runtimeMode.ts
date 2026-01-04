import { RuntimeMode } from './types'

export const getRuntimeMode = (): RuntimeMode => {
  if (process.env.RUNTIME_MODE) {
    return process.env.RUNTIME_MODE as RuntimeMode
  }
  // Fallback heuristics
  if (process.env.NODE_ENV === 'production') return 'prod'
  if (process.env.CI === 'true') return 'e2e'
  return 'dev'
}
