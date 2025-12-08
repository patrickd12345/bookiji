export type TrendPrediction = {
    trend: 'up' | 'down' | 'steady';
    confidence: number;
    nextEstimate: number;
};
export declare function predictHealthTrend(series: number[]): TrendPrediction;
export declare function predictBookingThroughput(samples: Array<{
    timestamp: string;
    value: number;
}>): TrendPrediction;
export declare function detectMetricShift(current: number, baseline: number): {
    shift: number;
    severity: string;
};
