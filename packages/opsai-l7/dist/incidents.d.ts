export type Incident = {
    id: string;
    severity: 'low' | 'medium' | 'high';
    title: string;
    status: 'open' | 'closed';
    createdAt: string;
    cause: string;
};
export type ReliabilityContext = {
    healthScores?: number[];
    bookingCurrent?: number;
    bookingBaseline?: number;
    anomalies?: string[];
};
export declare function autoGenerateIncidents(context: ReliabilityContext): Incident[];
