import { useCallback, useRef } from 'react'

interface UseDebouncedClickOptions {
  delay?: number
  onDuplicate?: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedClick<T extends (...args: any[]) => any>(
  callback: T,
  options: UseDebouncedClickOptions = {}
): T {
  const { delay = 300, onDuplicate } = options
  const lastClickTime = useRef<number>(0)
  const isProcessing = useRef<boolean>(false)

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      
      // Check if we're already processing
      if (isProcessing.current) {
        onDuplicate?.()
        return
      }

      // Check if click is too soon after last click
      if (now - lastClickTime.current < delay) {
        onDuplicate?.()
        return
      }

      // Update state and execute
      lastClickTime.current = now
      isProcessing.current = true

      // Execute callback
      const result = callback(...args)

      // Reset processing flag after delay
      setTimeout(() => {
        isProcessing.current = false
      }, delay)

      return result
    },
    [callback, delay, onDuplicate]
  ) as T

  return debouncedCallback
}


