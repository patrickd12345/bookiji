function uid() {
    return `wh_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
export function buildWebhookPayload(type, data) {
    return {
        id: uid(),
        type,
        createdAt: new Date().toISOString(),
        source: 'opsai',
        data
    };
}
export function formatDeploymentFallback() {
    return {
        id: 'none',
        service: 'ops-fabric',
        version: 'n/a',
        startedAt: new Date().toISOString(),
        status: 'pending'
    };
}
