import type { FraudSignal } from "./FraudSignal";

export interface RiskScore {
  userId: string;
  score: number; // 0-100
  factors: FraudSignal[];
}
