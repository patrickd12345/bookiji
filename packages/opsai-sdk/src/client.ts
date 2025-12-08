import { OpsAICache } from './cache'
import {
  OpsAIWebhookEventType,
  OpsAIWebhookPayload,
  OpsAIWebhookRegistration,
  buildWebhookPayload,
  formatDeploymentFallback
} from './webhook'

export type DeploymentRecord = {
  id?: string
  service?: string
  version?: string
  status?: string
  startedAt?: string
  completedAt?: string | null
}

export type OpsAISummary = {
  timestamp?: string
  health?: { overall?: string; services?: Array<{ name: string; status: string }> }
  sloSummary?: unknown[]
  incidents?: unknown[]
  pendingActions?: unknown[]
  deployments?: DeploymentRecord[]
  message?: string
  [key: string]: unknown
}

export type MetricsKind = 'system' | 'bookings'

export type OpsAIMetricsResponse = {
  success?: boolean
  analysis?: unknown
  raw_metrics?: unknown
  message?: string
  [key: string]: unknown
}

export type OpsAIHealth = {
  status?: string
  services?: Array<{ name: string; status: string; details?: unknown }>
  updatedAt?: string
  message?: string
  [key: string]: unknown
}

export interface OpsAIOptions {
  baseUrl?: string
  retries?: number
  timeoutMs?: number
  cacheTtlMs?: number
  fetchImpl?: typeof fetch
}

type RequestOptions<T> = {
  method?: 'GET' | 'POST'
  body?: any
  offlineFallback?: T
  cacheKey?: string
  cacheTtlMs?: number
}

const DEFAULT_OFFLINE_SUMMARY: OpsAISummary = {
  deployments: [],
  incidents: [],
  pendingActions: [],
  sloSummary: [],
  health: { overall: 'unknown', services: [] },
  message: 'OpsAI offline fallback'
}

const DEFAULT_HEALTH: OpsAIHealth = {
  status: 'unknown',
  services: [],
  message: 'Health unavailable'
}

export class OpsAI {
  private cache: OpsAICache
  private baseUrl: string
  private retries: number
  private timeoutMs: number
  private fetchImpl: typeof fetch

  constructor(options: OpsAIOptions = {}) {
    this.baseUrl = this.normalizeBase(
      options.baseUrl ||
        process.env.OPS_API_BASE ||
        process.env.NEXT_PUBLIC_OPS_BASE ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        'http://localhost:3000'
    )
    this.retries = options.retries ?? 2
    this.timeoutMs = options.timeoutMs ?? 5000
    this.cache = new OpsAICache(options.cacheTtlMs ?? 30_000)
    this.fetchImpl = options.fetchImpl || fetch
  }

  private normalizeBase(base: string) {
    return base.replace(/\/$/, '')
  }

  private resolve(path: string) {
    const sanitized = path.replace(/^\//, '')
    if (sanitized.startsWith('api/ops')) {
      return `${this.baseUrl}/${sanitized}`
    }
    if (sanitized.startsWith('ops/')) {
      return `${this.baseUrl}/${sanitized}`
    }
    return `${this.baseUrl}/api/ops/${sanitized}`
  }

  private ensureDeployments(
    payload: { deployments?: DeploymentRecord[] } | DeploymentRecord[] | null | undefined
  ): DeploymentRecord[] {
    if (Array.isArray(payload)) return payload
    if (payload && Array.isArray(payload.deployments)) return payload.deployments
    if (!payload || payload === null) return []
    return []
  }

  private async request<T>(path: string, options: RequestOptions<T> = {}): Promise<T> {
    const cacheKey = options.cacheKey ?? path
    const cached = this.cache.get<T>(cacheKey)
    if (cached !== undefined) {
      return cached
    }

    const url = this.resolve(path)
    let lastError: unknown

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeoutMs)
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
        })
        clearTimeout(timer)

        if (!res.ok) {
          lastError = new Error(`HTTP ${res.status}`)
          continue
        }

        const text = await res.text()
        const data: any = text ? safelyParse(text) : {}

        // Normalize deployments to never throw on null/undefined
        if (path.includes('deployments')) {
          const deployments = this.ensureDeployments(data)
          const normalized =
            Array.isArray(data) || typeof data !== 'object'
              ? deployments
              : { ...(data || {}), deployments }
          this.cache.set(cacheKey, normalized as T, options.cacheTtlMs)
          return normalized as T
        }

        this.cache.set(cacheKey, data as T, options.cacheTtlMs)
        return data as T
      } catch (error) {
        clearTimeout(timer)
        lastError = error
        // retry loop continues
      }
    }

    const fallback =
      this.cache.get<T>(cacheKey) ??
      options.offlineFallback ??
      (path.includes('deployments') ? ([] as unknown as T) : undefined)

    if (fallback !== undefined) {
      this.cache.set(cacheKey, fallback, options.cacheTtlMs)
      return fallback
    }

    throw lastError instanceof Error ? lastError : new Error('OpsAI request failed')
  }

  async summary(): Promise<OpsAISummary> {
    const result = await this.request<OpsAISummary>('summary', {
      offlineFallback: DEFAULT_OFFLINE_SUMMARY
    })
    return {
      ...DEFAULT_OFFLINE_SUMMARY,
      ...(result || {}),
      deployments: this.ensureDeployments(result)
    }
  }

  async metrics(kind: MetricsKind): Promise<OpsAIMetricsResponse> {
    return this.request<OpsAIMetricsResponse>(`metrics/${kind}`, {
      offlineFallback: {
        success: false,
        analysis: null,
        raw_metrics: [],
        message: `Offline fallback for ${kind} metrics`
      }
    })
  }

  async deployments(): Promise<DeploymentRecord[]> {
    const raw = await this.request<DeploymentRecord[] | { deployments?: DeploymentRecord[] }>(
      'deployments',
      { offlineFallback: [] }
    )
    return this.ensureDeployments(raw)
  }

  async incidents(): Promise<unknown[]> {
    const data = await this.request<{ incidents?: unknown[] } | unknown[]>('incidents', {
      offlineFallback: []
    })
    if (Array.isArray(data)) return data
    if (data && Array.isArray((data as any).incidents)) return (data as any).incidents
    return []
  }

  async health(): Promise<OpsAIHealth> {
    const res = await this.request<OpsAIHealth>('health', {
      offlineFallback: DEFAULT_HEALTH
    })
    return { ...DEFAULT_HEALTH, ...(res || {}) }
  }

  async registerWebhook(
    url: string,
    events: OpsAIWebhookEventType[] = ['health.degraded', 'bookings.anomaly', 'deployments.new']
  ): Promise<OpsAIWebhookRegistration> {
    return this.request<OpsAIWebhookRegistration>('webhooks/register', {
      method: 'POST',
      body: { url, events },
      offlineFallback: {
        url,
        events,
        createdAt: new Date().toISOString()
      }
    })
  }

  async triggerTestWebhook(
    url: string,
    type: OpsAIWebhookEventType = 'ops.test'
  ): Promise<OpsAIWebhookPayload> {
    const payload = buildWebhookPayload(type, {
      health: DEFAULT_HEALTH,
      deployment: formatDeploymentFallback()
    })
    return this.request<OpsAIWebhookPayload>('webhooks/test', {
      method: 'POST',
      body: { url, type, payload },
      offlineFallback: payload
    })
  }
}

function safelyParse(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export const opsai = new OpsAI()

export default OpsAI
