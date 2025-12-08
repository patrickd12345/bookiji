import { OpsAICache } from './cache.js';
import { buildWebhookPayload, formatDeploymentFallback } from './webhook.js';
const DEFAULT_OFFLINE_SUMMARY = {
    deployments: [],
    incidents: [],
    pendingActions: [],
    sloSummary: [],
    health: { overall: 'unknown', services: [] },
    message: 'OpsAI offline fallback'
};
const DEFAULT_HEALTH = {
    status: 'unknown',
    services: [],
    message: 'Health unavailable'
};
export class OpsAI {
    constructor(options = {}) {
        this.baseUrl = this.normalizeBase(options.baseUrl ||
            process.env.OPS_API_BASE ||
            process.env.NEXT_PUBLIC_OPS_BASE ||
            process.env.NEXT_PUBLIC_SITE_URL ||
            'http://localhost:3000');
        this.retries = options.retries ?? 2;
        this.timeoutMs = options.timeoutMs ?? 5000;
        this.cache = new OpsAICache(options.cacheTtlMs ?? 30000);
        this.fetchImpl = options.fetchImpl || fetch;
    }
    normalizeBase(base) {
        return base.replace(/\/$/, '');
    }
    resolve(path) {
        const sanitized = path.replace(/^\//, '');
        if (sanitized.startsWith('api/ops')) {
            return `${this.baseUrl}/${sanitized}`;
        }
        if (sanitized.startsWith('ops/')) {
            return `${this.baseUrl}/${sanitized}`;
        }
        return `${this.baseUrl}/api/ops/${sanitized}`;
    }
    ensureDeployments(payload) {
        if (Array.isArray(payload))
            return payload;
        if (payload && Array.isArray(payload.deployments))
            return payload.deployments;
        if (!payload || payload === null)
            return [];
        return [];
    }
    async request(path, options = {}) {
        const cacheKey = options.cacheKey ?? path;
        const cached = this.cache.get(cacheKey);
        if (cached !== undefined) {
            return cached;
        }
        const url = this.resolve(path);
        let lastError;
        for (let attempt = 0; attempt <= this.retries; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeoutMs);
            try {
                const res = await this.fetchImpl(url, {
                    method: options.method || 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: options.body ? JSON.stringify(options.body) : undefined,
                    signal: controller.signal,
                    cache: 'no-store'
                });
                clearTimeout(timer);
                if (!res.ok) {
                    lastError = new Error(`HTTP ${res.status}`);
                    continue;
                }
                const text = await res.text();
                const data = text ? safelyParse(text) : {};
                // Normalize deployments to never throw on null/undefined
                if (path.includes('deployments')) {
                    const deployments = this.ensureDeployments(data);
                    const normalized = Array.isArray(data) || typeof data !== 'object'
                        ? deployments
                        : { ...(data || {}), deployments };
                    this.cache.set(cacheKey, normalized, options.cacheTtlMs);
                    return normalized;
                }
                this.cache.set(cacheKey, data, options.cacheTtlMs);
                return data;
            }
            catch (error) {
                clearTimeout(timer);
                lastError = error;
                // retry loop continues
            }
        }
        const fallback = this.cache.get(cacheKey) ??
            options.offlineFallback ??
            (path.includes('deployments') ? [] : undefined);
        if (fallback !== undefined) {
            this.cache.set(cacheKey, fallback, options.cacheTtlMs);
            return fallback;
        }
        throw lastError instanceof Error ? lastError : new Error('OpsAI request failed');
    }
    async summary() {
        const result = await this.request('summary', {
            offlineFallback: DEFAULT_OFFLINE_SUMMARY
        });
        return {
            ...DEFAULT_OFFLINE_SUMMARY,
            ...(result || {}),
            deployments: this.ensureDeployments(result)
        };
    }
    async metrics(kind) {
        return this.request(`metrics/${kind}`, {
            offlineFallback: {
                success: false,
                analysis: null,
                raw_metrics: [],
                message: `Offline fallback for ${kind} metrics`
            }
        });
    }
    async deployments() {
        const raw = await this.request('deployments', { offlineFallback: [] });
        return this.ensureDeployments(raw);
    }
    async incidents() {
        const data = await this.request('incidents', {
            offlineFallback: []
        });
        if (Array.isArray(data))
            return data;
        if (data && Array.isArray(data.incidents))
            return data.incidents;
        return [];
    }
    async health() {
        const res = await this.request('health', {
            offlineFallback: DEFAULT_HEALTH
        });
        return { ...DEFAULT_HEALTH, ...(res || {}) };
    }
    async registerWebhook(url, events = ['health.degraded', 'bookings.anomaly', 'deployments.new']) {
        return this.request('webhooks/register', {
            method: 'POST',
            body: { url, events },
            offlineFallback: {
                url,
                events,
                createdAt: new Date().toISOString()
            }
        });
    }
    async triggerTestWebhook(url, type = 'ops.test') {
        const payload = buildWebhookPayload(type, {
            health: DEFAULT_HEALTH,
            deployment: formatDeploymentFallback()
        });
        return this.request('webhooks/test', {
            method: 'POST',
            body: { url, type, payload },
            offlineFallback: payload
        });
    }
}
function safelyParse(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
export const opsai = new OpsAI();
export default OpsAI;
