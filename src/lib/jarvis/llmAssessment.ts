/**
 * LLM Assessment Layer
 * 
 * Jarvis reasons over the incident snapshot.
 * This is where LLM absolutely belongs - structured reasoning over system state.
 */

import type { IncidentSnapshot, JarvisAssessment, Severity } from './types'

/**
 * Assess incident using LLM
 * 
 * Input: Incident Snapshot (deterministic truth)
 * Output: Assessment, recommendations, confidence
 */
export async function assessIncident(
  snapshot: IncidentSnapshot
): Promise<JarvisAssessment> {
  // Use Groq for fast inference (or OpenAI if configured)
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'
  const baseUrl = process.env.GROQ_API_KEY 
    ? 'https://api.groq.com/openai/v1'
    : 'https://api.openai.com/v1'

  if (!apiKey) {
    // Fallback to deterministic assessment if no LLM
    return deterministicAssessment(snapshot)
  }

  const systemPrompt = `You are Jarvis, an on-call incident commander for Bookiji, a universal booking platform.

Your role:
- Assess incidents based on provided system state
- Recommend safe actions within pre-authorized limits
- Never invent facts - use only the provided snapshot
- Respect production environment (prod is sacred)
- Preserve sleep when possible

You may NOT:
- Recommend actions not in the allowed matrix
- Invent system state not in the snapshot
- Suggest bypassing safety mechanisms

Output JSON only.`

  const userPrompt = `Incident Snapshot:
${JSON.stringify(snapshot, null, 2)}

Provide:
1. Plain English assessment (what's broken, what's safe)
2. Severity confirmation (SEV-1/SEV-2/SEV-3) - confirm or downgrade from snapshot
3. Recommended actions (A/B/C/D) with risk levels
4. What happens if no reply (default action)
5. Confidence (0-1)

Format as JSON:
{
  "assessment": "string",
  "severity": "SEV-1" | "SEV-2" | "SEV-3",
  "recommended_actions": [
    {
      "id": "A",
      "label": "Monitor 15 min",
      "description": "Keep system paused, monitor",
      "risk_level": "low"
    }
  ],
  "what_happens_if_no_reply": "string",
  "confidence": 0.0-1.0
}`

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3 // Low temperature for deterministic reasoning
      })
    })

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content from LLM')
    }

    const parsed = JSON.parse(content) as Omit<JarvisAssessment, 'confidence'> & { confidence: number }

    // Validate and normalize
    return {
      assessment: parsed.assessment || 'Unable to assess incident',
      severity: validateSeverity(parsed.severity) || snapshot.severity_guess,
      recommended_actions: parsed.recommended_actions || [],
      what_happens_if_no_reply: parsed.what_happens_if_no_reply || 'Monitor and wait',
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5))
    }
  } catch (error) {
    console.error('LLM assessment failed, using deterministic fallback:', error)
    return deterministicAssessment(snapshot)
  }
}

/**
 * Deterministic assessment fallback (no LLM)
 */
function deterministicAssessment(snapshot: IncidentSnapshot): JarvisAssessment {
  const { severity_guess, signals, system_state, blast_radius } = snapshot

  let assessment = `Incident detected in ${snapshot.env}. `
  
  if (signals.error_rate_spike) {
    assessment += 'Error rate spike detected. '
  }
  if (signals.booking_failures) {
    assessment += 'Booking failures occurring. '
  }
  if (signals.stripe_webhook_backlog) {
    assessment += 'Stripe webhook backlog detected. '
  }
  if (signals.invariant_violations.length > 0) {
    assessment += `Invariant violations: ${signals.invariant_violations.join(', ')}. `
  }

  assessment += `Blast radius: ${blast_radius.join(', ') || 'none'}. `

  if (system_state.kill_switch_active) {
    assessment += 'Scheduling kill switch is active. '
  }

  const recommendations = generateDefaultRecommendations(snapshot)

  return {
    assessment,
    severity: severity_guess,
    recommended_actions: recommendations,
    what_happens_if_no_reply: 'Monitor for 15 minutes, then re-assess',
    confidence: 0.6
  }
}

/**
 * Generate default recommendations based on snapshot
 */
function generateDefaultRecommendations(snapshot: IncidentSnapshot): JarvisAssessment['recommended_actions'] {
  const recommendations: JarvisAssessment['recommended_actions'] = []

  if (snapshot.env === 'prod') {
    recommendations.push({
      id: 'A',
      label: 'Monitor 15 min',
      description: 'Keep system paused, monitor for improvement',
      risk_level: 'low'
    })

    if (snapshot.signals.deploy_recent) {
      recommendations.push({
        id: 'B',
        label: 'Roll back last deploy',
        description: 'Revert to previous stable version',
        risk_level: 'medium'
      })
    }

    recommendations.push({
      id: 'C',
      label: 'Disable payments only',
      description: 'Keep bookings but pause payment processing',
      risk_level: 'high'
    })

    recommendations.push({
      id: 'D',
      label: 'Wake me only if worse',
      description: 'Monitor silently unless severity increases',
      risk_level: 'low'
    })
  } else {
    // Staging/local - more aggressive options
    recommendations.push({
      id: 'A',
      label: 'Monitor',
      description: 'Watch and wait',
      risk_level: 'low'
    })

    recommendations.push({
      id: 'B',
      label: 'Reset staging',
      description: 'Reset staging environment',
      risk_level: 'low'
    })
  }

  return recommendations
}

function validateSeverity(severity: unknown): Severity | null {
  if (severity === 'SEV-1' || severity === 'SEV-2' || severity === 'SEV-3') {
    return severity
  }
  return null
}

