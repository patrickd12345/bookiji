import { useCallback, useRef } from 'react';

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  return debouncedCallback;
}

// Specialized hook for button clicks
export function useDebouncedClick(
  onClick: () => void | Promise<void>,
  delay: number = 300
) {
  const isProcessing = useRef(false);

  const debouncedClick = useCallback(async () => {
    if (isProcessing.current) return;
    
    isProcessing.current = true;
    
    try {
      await onClick();
    } finally {
      // Ensure we don't block future clicks
      setTimeout(() => {
        isProcessing.current = false;
      }, delay);
    }
  }, [onClick, delay]);

  return debouncedClick;
}

// Hook for form submissions
export function useDebouncedSubmit<T extends Record<string, any>>(
  onSubmit: (data: T) => Promise<void>,
  delay: number = 500
) {
  const isSubmitting = useRef(false);

  const debouncedSubmit = useCallback(async (data: T) => {
    if (isSubmitting.current) return;
    
    isSubmitting.current = true;
    
    try {
      await onSubmit(data);
    } finally {
      setTimeout(() => {
        isSubmitting.current = false;
      }, delay);
    }
  }, [onSubmit, delay]);

  return {
    submit: debouncedSubmit,
    isSubmitting: isSubmitting.current
  };
}
