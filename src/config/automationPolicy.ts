export type AutomationMode = 'observe' | 'suggest' | 'auto'

export type AutomationArea =
  | 'rollback'
  | 'scaleUp'
  | 'scaleDown'
  | 'restartWorker'
  | 'replayWebhook'
  | 'toggleFeatureFlag'
  | 'clearQueue'

export const automationPolicy: Record<AutomationArea, AutomationMode> = {
  rollback: 'suggest',
  scaleUp: 'suggest',
  scaleDown: 'suggest',
  restartWorker: 'auto', // safe
  replayWebhook: 'auto', // safe
  toggleFeatureFlag: 'suggest',
  clearQueue: 'suggest'
}
