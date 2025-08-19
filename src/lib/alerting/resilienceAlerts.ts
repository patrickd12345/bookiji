// Resilience Alerting System
// Monitors threshold breaches and sends notifications

export interface AlertThreshold {
  metric: string
  threshold: number
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  severity: 'info' | 'warning' | 'critical'
  message: string
}

export interface Alert {
  id: string
  timestamp: Date
  metric: string
  currentValue: number
  threshold: number
  severity: 'info' | 'warning' | 'critical'
  message: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
}

// Default alert thresholds for Bookiji resilience metrics
export const DEFAULT_ALERT_THRESHOLDS: AlertThreshold[] = [
  {
    metric: 'rollback_rate',
    threshold: 10.0, // 10%
    operator: 'gt',
    severity: 'critical',
    message: 'Rollback rate exceeded 10% - API instability detected'
  },
  {
    metric: 'rollback_rate',
    threshold: 5.0, // 5%
    operator: 'gt',
    severity: 'warning',
    message: 'Rollback rate exceeded 5% - monitor closely'
  },
  {
    metric: 'retry_success_rate',
    threshold: 60.0, // 60%
    operator: 'lt',
    severity: 'critical',
    message: 'Retry success rate below 60% - API flakiness detected'
  },
  {
    metric: 'retry_success_rate',
    threshold: 80.0, // 80%
    operator: 'lt',
    severity: 'warning',
    message: 'Retry success rate below 80% - monitor closely'
  },
  {
    metric: 'error_recovery_rate',
    threshold: 90.0, // 90%
    operator: 'lt',
    severity: 'critical',
    message: 'Error recovery rate below 90% - UX degradation detected'
  },
  {
    metric: 'error_recovery_rate',
    threshold: 95.0, // 95%
    operator: 'lt',
    severity: 'warning',
    message: 'Error recovery rate below 95% - monitor closely'
  }
]

// Alert evaluation logic
export function evaluateAlert(
  metricName: string,
  currentValue: number,
  thresholds: AlertThreshold[] = DEFAULT_ALERT_THRESHOLDS
): Alert | null {
  const relevantThresholds = thresholds.filter(t => t.metric === metricName)
  
  for (const threshold of relevantThresholds) {
    let shouldAlert = false
    
    switch (threshold.operator) {
      case 'gt':
        shouldAlert = currentValue > threshold.threshold
        break
      case 'gte':
        shouldAlert = currentValue >= threshold.threshold
        break
      case 'lt':
        shouldAlert = currentValue < threshold.threshold
        break
      case 'lte':
        shouldAlert = currentValue <= threshold.threshold
        break
      case 'eq':
        shouldAlert = currentValue === threshold.threshold
        break
    }
    
    if (shouldAlert) {
      return {
        id: `${metricName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        metric: metricName,
        currentValue,
        threshold: threshold.threshold,
        severity: threshold.severity,
        message: threshold.message,
        acknowledged: false
      }
    }
  }
  
  return null
}

// Alert notification system
export interface AlertNotifier {
  sendAlert(alert: Alert): Promise<void>
}

// Slack notification implementation
export class SlackNotifier implements AlertNotifier {
  private webhookUrl: string
  
  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }
  
  async sendAlert(alert: Alert): Promise<void> {
    const message = {
      text: `🚨 *Resilience Alert: ${alert.severity.toUpperCase()}*`,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          fields: [
            {
              title: 'Metric',
              value: alert.metric.replace(/_/g, ' ').toUpperCase(),
              short: true
            },
            {
              title: 'Current Value',
              value: `${alert.currentValue.toFixed(2)}%`,
              short: true
            },
            {
              title: 'Threshold',
              value: `${alert.threshold.toFixed(2)}%`,
              short: true
            },
            {
              title: 'Time',
              value: alert.timestamp.toLocaleString(),
              short: true
            },
            {
              title: 'Message',
              value: alert.message,
              short: false
            }
          ]
        }
      ]
    }
    
    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })
    } catch (error) {
      console.error('Failed to send Slack alert:', error)
    }
  }
  
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#ff0000'
      case 'warning': return '#ffaa00'
      case 'info': return '#0000ff'
      default: return '#cccccc'
    }
  }
}

// Email notification implementation
export class EmailNotifier implements AlertNotifier {
  private adminEmails: string[]
  
  constructor(adminEmails: string[]) {
    this.adminEmails = adminEmails
  }
  
  async sendAlert(alert: Alert): Promise<void> {
    // This would integrate with your email service (SendGrid, etc.)
    console.log(`Email alert to ${this.adminEmails.join(', ')}:`, alert)
    
    // For now, just log the alert
    // In production, you'd send actual emails
  }
}

// Alert manager
export class AlertManager {
  private notifiers: AlertNotifier[] = []
  private activeAlerts: Map<string, Alert> = new Map()
  private thresholds: AlertThreshold[]
  
  constructor(thresholds: AlertThreshold[] = DEFAULT_ALERT_THRESHOLDS) {
    this.thresholds = thresholds
  }
  
  addNotifier(notifier: AlertNotifier): void {
    this.notifiers.push(notifier)
  }
  
  async evaluateMetrics(metrics: Array<{ metric_name: string; metric_value: number }>): Promise<Alert[]> {
    const newAlerts: Alert[] = []
    
    for (const metric of metrics) {
      const alert = evaluateAlert(metric.metric_name, metric.metric_value, this.thresholds)
      
      if (alert) {
        // Check if this is a new alert or an existing one
        const existingAlertKey = `${alert.metric}_${alert.severity}`
        const existingAlert = this.activeAlerts.get(existingAlertKey)
        
        if (!existingAlert || 
            Math.abs(existingAlert.currentValue - alert.currentValue) > 1.0 || // Significant change
            Date.now() - existingAlert.timestamp.getTime() > 5 * 60 * 1000) { // 5 minutes old
          
          this.activeAlerts.set(existingAlertKey, alert)
          newAlerts.push(alert)
          
          // Send notifications
          await this.sendNotifications(alert)
        }
      }
    }
    
    return newAlerts
  }
  
  private async sendNotifications(alert: Alert): Promise<void> {
    const promises = this.notifiers.map(notifier => notifier.sendAlert(alert))
    await Promise.allSettled(promises)
  }
  
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
  }
  
  acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    const alert = Array.from(this.activeAlerts.values()).find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      alert.acknowledgedBy = acknowledgedBy
      alert.acknowledgedAt = new Date()
    }
  }
  
  clearResolvedAlerts(): void {
    // Remove alerts that are no longer active
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.acknowledged) {
        this.activeAlerts.delete(key)
      }
    }
  }
}

// Global alert manager instance
export const resilienceAlertManager = new AlertManager()

// Initialize with default notifiers if environment variables are set
if (process.env.SLACK_WEBHOOK_URL) {
  resilienceAlertManager.addNotifier(new SlackNotifier(process.env.SLACK_WEBHOOK_URL))
}

if (process.env.ADMIN_EMAILS) {
  const adminEmails = process.env.ADMIN_EMAILS.split(',').map(email => email.trim())
  resilienceAlertManager.addNotifier(new EmailNotifier(adminEmails))
}

