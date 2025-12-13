export interface RetryStrategy {
  maxAttempts: number;
  backoffMs: number;
  jitter?: boolean;
}
