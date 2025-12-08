import { OpsAI } from '../../../../../../packages/opsai-sdk/src/client'

export function createOpsClient(baseUrl?: string) {
  const normalizedBase =
    baseUrl ||
    process.env.OPS_API_BASE ||
    process.env.NEXT_PUBLIC_OPS_BASE ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'

  return new OpsAI({
    baseUrl: normalizedBase,
    fetchImpl: fetch,
    timeoutMs: 5000,
    cacheTtlMs: 5000
  })
}
