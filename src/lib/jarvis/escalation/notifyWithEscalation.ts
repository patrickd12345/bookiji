/**
 * Escalation-Aware Notification
 * 
 * Sends SMS with escalation logic and tone profiles.
 * Integrates with escalation decision engine.
 */

import { decideNextAction } from './decideNextAction'
import { getEscalationContext, updateEscalationAfterNotification } from './state'
import { selectToneProfile, applyToneProfile } from './toneProfiles'
import { isInQuietHours } from './sleepPolicy'
import { getSleepPolicy } from './sleepPolicy'
import type { IncidentSnapshot, JarvisAssessment } from '../types'
import { sendFeedbackSMS } from '../feedback/sendFeedbackSMS'
import {
  storeEscalationDecision,
  storeNotificationSent,
  storeNotificationSuppressed
} from '../observability/events'

export interface EscalationNotificationResult {
  sent: boolean
  suppressed: boolean
  reason?: string
  escalation_level: number
}

/**
 * Send notification with escalation logic
 */
export async function notifyWithEscalation(
  incidentId: string,
  assessment: JarvisAssessment,
  snapshot: IncidentSnapshot,
  ownerPhone: string
): Promise<EscalationNotificationResult> {
  // Get escalation context
  const context = await getEscalationContext(incidentId)

  if (!context) {
    // New incident - create initial context
    const decision = await decideNextAction({
      severity: snapshot.severity_guess,
      firstNotifiedAt: null,
      lastNotifiedAt: null,
      escalationLevel: 0,
      acknowledgedAt: null,
      notificationCount: 0
    })

    // Store decision event
    await storeEscalationDecision(incidentId, decision.type, decision.trace)

    if (decision.type === 'DO_NOT_NOTIFY' || decision.type === 'WAIT') {
      await storeNotificationSuppressed(incidentId, decision.reason, decision.trace)
      return {
        sent: false,
        suppressed: true,
        reason: decision.reason,
        escalation_level: 0
      }
    }

    // Send first notification
    const smsResult = await sendEscalatedSMS(
      assessment,
      snapshot,
      ownerPhone,
      decision,
      true
    )

    if (smsResult.success) {
      await updateEscalationAfterNotification(incidentId, true)
      await storeNotificationSent(incidentId, 'sms', decision.trace)
    } else {
      await storeNotificationSuppressed(incidentId, 'SMS send failed', decision.trace)
    }

    return {
      sent: smsResult.success,
      suppressed: false,
      escalation_level: 0
    }
  }

  // Existing incident - check escalation
  const decision = await decideNextAction(context)

  // Store decision event
  await storeEscalationDecision(incidentId, decision.type, decision.trace)

  if (decision.type === 'DO_NOT_NOTIFY') {
    await storeNotificationSuppressed(incidentId, decision.reason, decision.trace)
    return {
      sent: false,
      suppressed: true,
      reason: decision.reason,
      escalation_level: context.escalationLevel
    }
  }

  if (decision.type === 'WAIT') {
    await storeNotificationSuppressed(incidentId, decision.reason, decision.trace)
    return {
      sent: false,
      suppressed: true,
      reason: decision.reason,
      escalation_level: context.escalationLevel
    }
  }

  // Send notification
  const isFirstNotification = context.firstNotifiedAt === null
  const smsResult = await sendEscalatedSMS(
    assessment,
    snapshot,
    ownerPhone,
    decision,
    isFirstNotification
  )

  if (smsResult.success) {
    await updateEscalationAfterNotification(incidentId, isFirstNotification)
    await storeNotificationSent(incidentId, 'sms', decision.trace)
  } else {
    await storeNotificationSuppressed(incidentId, 'SMS send failed', decision.trace)
  }

  return {
    sent: smsResult.success,
    suppressed: false,
    escalation_level: isFirstNotification ? 0 : context.escalationLevel + 1
  }
}

/**
 * Send SMS with escalation tone
 */
async function sendEscalatedSMS(
  assessment: JarvisAssessment,
  snapshot: IncidentSnapshot,
  ownerPhone: string,
  decision: { type: 'SEND_SILENT_SMS' | 'SEND_LOUD_SMS'; messageType: string },
  isFirst: boolean
): Promise<{ success: boolean; error?: string }> {
  // Format base message
  const baseMessage = formatEscalationMessage(assessment, snapshot, isFirst, decision.messageType)

  // Select tone profile
  const policy = await getSleepPolicy()
  const tone = selectToneProfile(
    decision.messageType as 'informational' | 'update' | 'wake' | 'escalation',
    {
      severity: snapshot.severity_guess,
      timeSinceStart: 0, // Will be calculated if needed
      escalationLevel: isFirst ? 0 : 1,
      inQuietHours: isInQuietHours(policy)
    }
  )

  // Apply tone (LLM-assisted, with fallback)
  const finalMessage = await applyToneProfile(baseMessage, tone)

  // Send SMS
  return await sendFeedbackSMS(ownerPhone, finalMessage)
}

/**
 * Format escalation message
 */
function formatEscalationMessage(
  assessment: JarvisAssessment,
  snapshot: IncidentSnapshot,
  isFirst: boolean,
  messageType: string
): string {
  if (isFirst) {
    // First notification
    let message = `🚨 Bookiji ${assessment.severity} (${snapshot.env.toUpperCase()})\n\n`
    message += `What: ${assessment.assessment.split('.')[0] || 'System incident'}\n`
    message += `Impact: ${snapshot.blast_radius.join(', ') || 'none'}\n\n`
    message += `Recommended:\n`
    assessment.recommended_actions.forEach(rec => {
      message += `${rec.id}) ${rec.label}\n`
    })
    message += `\nReply with STATUS, WHY, CHANGES, or HELP for more info.`
    return message
  } else {
    // Escalation/update
    if (messageType === 'escalation') {
      return `⚠️ Bookiji Update (${snapshot.env.toUpperCase()})\n\nIncident still active. No response received.\n\nReply with STATUS for current state or ACK to acknowledge.`
    } else {
      return `📋 Bookiji Update (${snapshot.env.toUpperCase()})\n\nIncident status unchanged.\n\nReply with STATUS for details.`
    }
  }
}

