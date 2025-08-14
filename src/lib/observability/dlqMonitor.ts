interface DLQPayload {
  size: number
  overThresholdSince: string | null
  now: string
}

interface AlertWebhookPayload {
  alert: 'DLQ_THRESHOLD_EXCEEDED'
  message: string
  details: DLQPayload
  timestamp: string
}

class DLQMonitor {
  private overThresholdStart: Date | null = null
  private readonly THRESHOLD_SIZE = 20
  private readonly THRESHOLD_DURATION_MS = 10 * 60 * 1000 // 10 minutes

  async checkDLQSize(): Promise<DLQPayload> {
    try {
      // Get current DLQ size from your queue system
      const size = await this.getCurrentDLQSize()
      const now = new Date()
      
      // Check if we're over threshold
      if (size > this.THRESHOLD_SIZE) {
        if (!this.overThresholdStart) {
          this.overThresholdStart = now
        }
        
        // Check if we've been over threshold for the required duration
        const overThresholdSince = this.overThresholdStart.toISOString()
        const timeOverThreshold = now.getTime() - this.overThresholdStart.getTime()
        
        if (timeOverThreshold > this.THRESHOLD_DURATION_MS) {
          await this.sendAlert({ size, overThresholdSince, now: now.toISOString() })
        }
        
        return { size, overThresholdSince, now: now.toISOString() }
      } else {
        // Reset threshold tracking if we're back under
        this.overThresholdStart = null
        return { size, overThresholdSince: null, now: now.toISOString() }
      }
    } catch (error) {
      console.error('Error checking DLQ size:', error)
      return { size: 0, overThresholdSince: null, now: new Date().toISOString() }
    }
  }

  private async getCurrentDLQSize(): Promise<number> {
    try {
      // This should be implemented based on your specific queue system
      // For example, if using Redis, SQS, or a database table
      
      // Example for a database-based DLQ:
      // const { count } = await supabase
      //   .from('dead_letter_queue')
      //   .select('*', { count: 'exact', head: true })
      // return count || 0
      
      // Placeholder implementation
      return 0
    } catch (error) {
      console.error('Error getting DLQ size:', error)
      return 0
    }
  }

  private async sendAlert(payload: DLQPayload): Promise<void> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL
    
    if (!webhookUrl) {
      console.warn('ALERT_WEBHOOK_URL not configured, skipping alert')
      return
    }

    try {
      const alertPayload: AlertWebhookPayload = {
        alert: 'DLQ_THRESHOLD_EXCEEDED',
        message: `DLQ size ${payload.size} has exceeded threshold ${this.THRESHOLD_SIZE} for more than ${this.THRESHOLD_DURATION_MS / 60000} minutes`,
        details: payload,
        timestamp: new Date().toISOString()
      }

      const webhookBody = {
        ...alertPayload,
        metadata: {
          environment: process.env.NODE_ENV || 'development',
          service: 'bookiji-booking-platform',
          component: 'dead-letter-queue-monitor',
          threshold: this.THRESHOLD_SIZE,
          duration_minutes: this.THRESHOLD_DURATION_MS / 60000,
          alert_id: `dlq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        },
        recommendations: [
          'Check queue processing workers',
          'Review error logs for failed message processing',
          'Verify downstream service availability',
          'Consider scaling up processing capacity'
        ]
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Bookiji-DLQMonitor/1.0',
          'X-Alert-Source': 'bookiji-dlq-monitor',
          'X-Alert-Version': '1.0.0'
        },
        body: JSON.stringify(webhookBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Webhook request failed with status ${response.status}: ${errorText}`)
      }

      console.log('DLQ alert sent successfully to webhook')
    } catch (error) {
      console.error('Failed to send DLQ alert:', error)
      // Log additional context for debugging
      console.error('Webhook URL:', webhookUrl)
    }
  }

  // Method to manually trigger a check
  async runCheck(): Promise<void> {
    const payload = await this.checkDLQSize()
    console.log('DLQ Monitor check completed:', payload)
  }

  // Method to get current status without triggering alerts
  async getStatus(): Promise<DLQPayload> {
    const size = await this.getCurrentDLQSize()
    const now = new Date()
    
    return {
      size,
      overThresholdSince: this.overThresholdStart?.toISOString() || null,
      now: now.toISOString()
    }
  }
}

// Export singleton instance
export const dlqMonitor = new DLQMonitor()

// Export types for external use
export type { DLQPayload, AlertWebhookPayload }
