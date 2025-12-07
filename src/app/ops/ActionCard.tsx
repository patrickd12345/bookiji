'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import type { OpsAction } from '@/types/opsActions'

type ActionCardProps = {
  action: OpsAction
}

export function ActionCard({ action }: ActionCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isActionable = action.status === 'pending'

  async function handleAction(actionType: 'approve' | 'reject' | 'snooze') {
    const endpoint =
      actionType === 'snooze'
        ? `/api/ops/actions/${action.id}/snooze`
        : `/api/ops/actions/${action.id}/${actionType}`

    const body =
      actionType === 'snooze'
        ? JSON.stringify({
            snoozeUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          })
        : undefined

    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    })

    startTransition(() => router.refresh())
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3 shadow-sm shadow-slate-900/40">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium">{action.title}</p>
          <p className="text-xs text-slate-400">
            {action.source} • {action.severity} • {action.status}
          </p>
          {action.snoozeUntil && (
            <p className="text-[11px] text-slate-500">
              Snoozed until {action.snoozeUntil}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            disabled={!isActionable || isPending}
            onClick={() => handleAction('approve')}
            className="rounded-md px-2 py-1 text-xs border border-emerald-500/60 text-emerald-300 disabled:opacity-40"
          >
            Approve
          </button>
          <button
            disabled={!isActionable || isPending}
            onClick={() => handleAction('reject')}
            className="rounded-md px-2 py-1 text-xs border border-red-500/60 text-red-300 disabled:opacity-40"
          >
            Reject
          </button>
          <button
            disabled={!isActionable || isPending}
            onClick={() => handleAction('snooze')}
            className="rounded-md px-2 py-1 text-xs border border-slate-500/60 text-slate-300 disabled:opacity-40"
          >
            Snooze 1h
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">{action.description}</p>

      {action.recommendedCommand && (
        <pre className="mt-1 text-[10px] bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-slate-400 overflow-x-auto">
          {action.recommendedCommand}
        </pre>
      )}
    </div>
  )
}
