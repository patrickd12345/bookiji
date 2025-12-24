import { useCallback, useRef } from 'react'
import { telemetry } from '@/lib/telemetry/resilienceTelemetry'

interface UseDebouncedClickWithTelemetryOptions {
  delay?: number
  onDuplicate?: () => void
  component: string // Required for telemetry
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedClickWithTelemetry<T extends (...args: any[]) => any>(
  callback: T,
  options: UseDebouncedClickWithTelemetryOptions
): T {
  const { delay = 300, onDuplicate, component } = options
  const lastClickTime = useRef<number>(0)
  const isProcessing = useRef<boolean>(false)
  const suppressedClicks = useRef<number>(0)

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      
      // Check if we're already processing
      if (isProcessing.current) {
        suppressedClicks.current++
        telemetry.debouncedClickSuppressed(component, 'already_processing')
        onDuplicate?.()
        return
      }

      // Check if click is too soon after last click
      if (now - lastClickTime.current < delay) {
        suppressedClicks.current++
        telemetry.debouncedClickSuppressed(component, 'too_soon')
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
    [callback, delay, onDuplicate, component]
  ) as T

  return debouncedCallback
}


