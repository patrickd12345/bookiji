export interface FraudSignal {
  signal: string;
  weight: number;
  metadata?: Record<string, any>;
}
