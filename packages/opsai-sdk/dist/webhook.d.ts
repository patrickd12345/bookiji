export type OpsAIWebhookEventType = 'health.degraded' | 'bookings.anomaly' | 'deployments.new' | 'ops.test';
export interface OpsAIWebhookRegistration {
    url: string;
    events?: OpsAIWebhookEventType[];
    createdAt: string;
}
export interface OpsAIWebhookPayload<T = unknown> {
    id: string;
    type: OpsAIWebhookEventType;
    createdAt: string;
    source: 'opsai';
    data: T;
}
export type HealthDegradedPayload = {
    previous: string | null;
    current: string;
    impactedServices: string[];
};
export type BookingAnomalyPayload = {
    baseline: number;
    current: number;
    windowMinutes: number;
    severity: 'low' | 'medium' | 'high';
};
export type DeploymentPayload = {
    id: string;
    service: string;
    version: string;
    startedAt: string;
    status: 'pending' | 'completed' | 'failed';
};
export declare function buildWebhookPayload<T>(type: OpsAIWebhookEventType, data: T): OpsAIWebhookPayload<T>;
export declare function formatDeploymentFallback(): DeploymentPayload;
//# sourceMappingURL=webhook.d.ts.map