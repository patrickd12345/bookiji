import { OpsAIWebhookEventType, OpsAIWebhookPayload, OpsAIWebhookRegistration } from './webhook.js';
export type DeploymentRecord = {
    id?: string;
    service?: string;
    version?: string;
    status?: string;
    startedAt?: string;
    completedAt?: string | null;
};
export type OpsAISummary = {
    timestamp?: string;
    health?: {
        overall?: string;
        services?: Array<{
            name: string;
            status: string;
        }>;
    };
    sloSummary?: unknown[];
    incidents?: unknown[];
    pendingActions?: unknown[];
    deployments?: DeploymentRecord[];
    message?: string;
    [key: string]: unknown;
};
export type MetricsKind = 'system' | 'bookings';
export type OpsAIMetricsResponse = {
    success?: boolean;
    analysis?: unknown;
    raw_metrics?: unknown;
    message?: string;
    [key: string]: unknown;
};
export type OpsAIHealth = {
    status?: string;
    services?: Array<{
        name: string;
        status: string;
        details?: unknown;
    }>;
    updatedAt?: string;
    message?: string;
    [key: string]: unknown;
};
export interface OpsAIOptions {
    baseUrl?: string;
    retries?: number;
    timeoutMs?: number;
    cacheTtlMs?: number;
    fetchImpl?: typeof fetch;
}
export declare class OpsAI {
    private cache;
    private baseUrl;
    private retries;
    private timeoutMs;
    private fetchImpl;
    constructor(options?: OpsAIOptions);
    private normalizeBase;
    private resolve;
    private ensureDeployments;
    private request;
    summary(): Promise<OpsAISummary>;
    metrics(kind: MetricsKind): Promise<OpsAIMetricsResponse>;
    deployments(): Promise<DeploymentRecord[]>;
    incidents(): Promise<unknown[]>;
    health(): Promise<OpsAIHealth>;
    registerWebhook(url: string, events?: OpsAIWebhookEventType[]): Promise<OpsAIWebhookRegistration>;
    triggerTestWebhook(url: string, type?: OpsAIWebhookEventType): Promise<OpsAIWebhookPayload>;
}
export declare const opsai: OpsAI;
export default OpsAI;
//# sourceMappingURL=client.d.ts.map