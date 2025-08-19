// Shim to align docs with implementation.
// TODO: wrap your actual query lib with retries/backoff and cache if desired.
export function useResilientQuery<T>(key: any, fn: () => Promise<T>) {
  return { data: undefined as T | undefined, isLoading: true, error: null as any, refetch: fn }
}