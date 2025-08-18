// Utility types to replace common 'any' usage patterns

/**
 * JSON-compatible value types
 */
export type Json = 
  | string 
  | number 
  | boolean 
  | null 
  | { [k: string]: Json } 
  | Json[];

/**
 * Generic JSON parser with type safety
 */
export function parseJson<T extends Json = Json>(s: string): T {
  return JSON.parse(s) as T;
}

/**
 * Safe event handler type for unknown events
 */
export function handleUnknownEvent(e: unknown): void {
  if (e && typeof e === 'object' && 'message' in e) {
    console.error((e as { message: string }).message);
  }
}

/**
 * Generic API response wrapper
 */
export type ApiResponse<T = unknown> = {
  data?: T;
  error?: string;
  success: boolean;
};

/**
 * Generic error handler that narrows unknown errors
 */
export function handleError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unknown error occurred';
}

/**
 * Type guard for checking if a value is a valid object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard for checking if a value is a valid array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard for checking if a value is a valid string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for checking if a value is a valid number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}
