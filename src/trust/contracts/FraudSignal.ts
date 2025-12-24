export interface FraudSignal {
  signal: string;
  weight: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}
