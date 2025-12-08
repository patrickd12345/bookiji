export type DiagnosticContext = {
    summary?: {
        deployments?: Array<{
            id?: string;
            status?: string;
            startedAt?: string;
        }>;
        health?: {
            overall?: string;
        };
    };
    metrics?: {
        bookings?: {
            baseline?: number;
            current?: number;
        };
        health?: {
            trend?: string;
        };
    };
};
export type DiagnosticResult = {
    severity: 'low' | 'medium' | 'high';
    issues: string[];
    recommendations: string[];
    signals: string[];
};
export declare function diagnose(errorLog: string, context?: DiagnosticContext): DiagnosticResult;
export declare function detectAnomalies(metrics: DiagnosticContext['metrics']): {
    issues: string[];
    recommendations: string[];
    signals: string[];
};
export declare function recommendActions(context?: DiagnosticContext): string[];
export declare function analyzeMetrics(metrics: any): {
    trend: any;
    anomalies: string[];
    recommendations: string[];
};
