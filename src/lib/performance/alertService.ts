/**
 * Performance Alert Service
 * 
 * Handles sending performance alerts to various channels including
 * Slack, Teams, PagerDuty, and email.
 */

import { AlertChannelConfig, AlertSeverity, formatAlertMessage, getAlertConfig } from '@/config/performance'

export interface AlertPayload {
  violations: string[]
  severity: AlertSeverity
  environment: string
  timestamp: string
  metrics?: Record<string, number>
}

export class AlertService {
  private config: AlertChannelConfig
  
  constructor() {
    this.config = getAlertConfig()
  }

  /**
   * Send alert to all configured channels
   */
  async sendAlert(payload: AlertPayload): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('Alerts disabled for this environment')
      return true
    }

    const results = await Promise.allSettled([
      this.sendSlackAlert(payload),
      this.sendTeamsAlert(payload),
      this.sendEmailAlert(payload),
      this.sendPagerDutyAlert(payload)
    ])

    // Return true if at least one alert was sent successfully
    return results.some(result => result.status === 'fulfilled')
  }

  /**
   * Send alert to Slack
   */
  private async sendSlackAlert(payload: AlertPayload): Promise<boolean> {
    if (!this.config.slack?.webhookUrl) {
      return false
    }

    try {
      const { title, message, color } = formatAlertMessage(
        payload.violations,
        payload.severity,
        payload.environment
      )

      const slackPayload = {
        channel: this.config.slack.channel,
        username: this.config.slack.username || 'Bookiji Monitor',
        icon_emoji: ':warning:',
        attachments: [{
          color: color,
          title: title,
          text: message,
          footer: 'Bookiji Performance Monitor',
          ts: Math.floor(Date.parse(payload.timestamp) / 1000),
          fields: payload.metrics ? Object.entries(payload.metrics).map(([key, value]) => ({
            title: key,
            value: value.toString(),
            short: true
          })) : []
        }]
      }

      const response = await fetch(this.config.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload)
      })

      return response.ok
    } catch (error) {
      console.error('Failed to send Slack alert:', error)
      return false
    }
  }

  /**
   * Send alert to Microsoft Teams
   */
  private async sendTeamsAlert(payload: AlertPayload): Promise<boolean> {
    if (!this.config.teams?.webhookUrl) {
      return false
    }

    try {
      const { title, message } = formatAlertMessage(
        payload.violations,
        payload.severity,
        payload.environment
      )

      const teamsPayload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        summary: title,
        themeColor: payload.severity === AlertSeverity.CRITICAL ? 'FF0000' : 
                   payload.severity === AlertSeverity.ERROR ? 'FF4444' : 'FFA500',
        sections: [{
          activityTitle: title,
          activitySubtitle: `Environment: ${payload.environment}`,
          text: message,
          facts: payload.metrics ? Object.entries(payload.metrics).map(([key, value]) => ({
            name: key,
            value: value.toString()
          })) : []
        }]
      }

      const response = await fetch(this.config.teams.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamsPayload)
      })

      return response.ok
    } catch (error) {
      console.error('Failed to send Teams alert:', error)
      return false
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(payload: AlertPayload): Promise<boolean> {
    if (!this.config.email) {
      return false
    }

    try {
      const { title, message } = formatAlertMessage(
        payload.violations,
        payload.severity,
        payload.environment
      )

      // In a real implementation, you would integrate with your email service
      // For now, we'll log it and potentially integrate with a service like SendGrid
      console.log('EMAIL ALERT:', { to: this.config.email, subject: title, body: message })
      
      // TODO: Integrate with actual email service
      // Example with SendGrid:
      // const sgMail = require('@sendgrid/mail')
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      // await sgMail.send({
      //   to: this.config.email,
      //   from: 'noreply@bookiji.com',
      //   subject: title,
      //   text: message
      // })

      return true
    } catch (error) {
      console.error('Failed to send email alert:', error)
      return false
    }
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(payload: AlertPayload): Promise<boolean> {
    if (!this.config.pagerduty?.integrationKey || payload.severity !== AlertSeverity.CRITICAL) {
      return false
    }

    try {
      const { title, message } = formatAlertMessage(
        payload.violations,
        payload.severity,
        payload.environment
      )

      const pdPayload = {
        routing_key: this.config.pagerduty.integrationKey,
        event_action: 'trigger',
        payload: {
          summary: title,
          severity: this.config.pagerduty.severity,
          source: 'Bookiji Performance Monitor',
          component: 'Performance Guardrails',
          group: payload.environment,
          class: 'performance',
          custom_details: {
            violations: payload.violations,
            metrics: payload.metrics || {},
            environment: payload.environment,
            timestamp: payload.timestamp
          }
        }
      }

      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdPayload)
      })

      return response.ok
    } catch (error) {
      console.error('Failed to send PagerDuty alert:', error)
      return false
    }
  }

  /**
   * Test alert configuration
   */
  async testAlerts(): Promise<{ channel: string; success: boolean; error?: string }[]> {
    const testPayload: AlertPayload = {
      violations: ['Test alert - all systems normal'],
      severity: AlertSeverity.INFO,
      environment: process.env.DEPLOY_ENV || 'development',
      timestamp: new Date().toISOString(),
      metrics: { testMetric: 123 }
    }

    const results = []

    if (this.config.slack?.webhookUrl) {
      try {
        const success = await this.sendSlackAlert(testPayload)
        results.push({ channel: 'Slack', success })
      } catch (error) {
        results.push({ channel: 'Slack', success: false, error: String(error) })
      }
    }

    if (this.config.teams?.webhookUrl) {
      try {
        const success = await this.sendTeamsAlert(testPayload)
        results.push({ channel: 'Teams', success })
      } catch (error) {
        results.push({ channel: 'Teams', success: false, error: String(error) })
      }
    }

    if (this.config.email) {
      try {
        const success = await this.sendEmailAlert(testPayload)
        results.push({ channel: 'Email', success })
      } catch (error) {
        results.push({ channel: 'Email', success: false, error: String(error) })
      }
    }

    return results
  }
}

// Global instance
export const alertService = new AlertService()

// Helper function to send alerts from the performance guardrails
export async function sendPerformanceAlert(
  violations: string[],
  metrics?: Record<string, number>
): Promise<void> {
  try {
    const environment = process.env.DEPLOY_ENV || process.env.NODE_ENV || 'development'
    
    // Determine severity based on violations
    const severity = violations.some(v => v.includes('exceeds limit')) 
      ? AlertSeverity.ERROR 
      : AlertSeverity.WARNING

    await alertService.sendAlert({
      violations,
      severity,
      environment,
      timestamp: new Date().toISOString(),
      metrics
    })
  } catch (error) {
    console.error('Failed to send performance alert:', error)
  }
}

