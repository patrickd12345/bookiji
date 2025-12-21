'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import type { PromotionDecision } from '@/app/api/ops/controlplane/_lib/simcity-types'

interface CopyDecisionButtonProps {
  decision: PromotionDecision
}

export function CopyDecisionButton({ decision }: CopyDecisionButtonProps) {
  const [copied, setCopied] = useState(false)

  const copyDecisionSummary = () => {
    const summary = {
      proposalId: decision.proposalId,
      domain: decision.domain,
      action: decision.action,
      verdict: decision.verdict,
      decisionHash: decision.decisionHash,
      inputsHash: decision.inputsHash,
      evaluatedAtTick: decision.evaluatedAtTick,
      reasons: decision.reasons.map(r => ({
        ruleId: r.ruleId,
        severity: r.severity,
        message: r.message,
        evidence: r.evidence,
      })),
      requiredOverrides: decision.requiredOverrides,
    }
    return JSON.stringify(summary, null, 2)
  }

  const handleCopy = async () => {
    try {
      const summary = copyDecisionSummary()
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <Button variant="outline" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2 text-green-600" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          Copy Decision Summary
        </>
      )}
    </Button>
  )
}

