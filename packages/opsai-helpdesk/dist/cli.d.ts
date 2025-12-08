export declare function runHelpdeskCli(args: string[]): Promise<{
    code: number;
    output: import("./engine.js").DiagnosticResult;
} | {
    code: number;
    output: string[];
} | {
    code: number;
    output: {
        trend: any;
        anomalies: string[];
        recommendations: string[];
    };
} | {
    code: number;
    output?: undefined;
}>;
