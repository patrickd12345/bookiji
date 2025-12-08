// Type declarations for @bookiji/opsai
// This allows TypeScript to resolve the module while Vite handles the actual import via alias
declare module '@bookiji/opsai' {
  export { OpsAI, type OpsAISummary, type OpsAIMetricsResponse, type OpsAIHealth, type OpsAIOptions } from '../../../../packages/opsai-sdk/src/client'
  export { OpsAICache } from '../../../../packages/opsai-sdk/src/cache'
  export type { OpsAIWebhookEventType, OpsAIWebhookRegistration, OpsAIWebhookPayload } from '../../../../packages/opsai-sdk/src/webhook'
  export { buildWebhookPayload, formatDeploymentFallback } from '../../../../packages/opsai-sdk/src/webhook'
}
