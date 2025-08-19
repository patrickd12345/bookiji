// Minimal optimistic action shim. Replace with your real optimistic logic.
export function useOptimisticAction<T, R>(action: (input: T) => Promise<R>) {
  let pending = false
  async function run(input: T) {
    pending = true
    try { return await action(input) }
    finally { pending = false }
  }
  return { run, pending }
}