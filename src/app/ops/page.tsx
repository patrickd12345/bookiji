import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import { loadActions } from '@/scripts/ops-actions-store'
import type { OpsAction } from '@/types/opsActions'
import { ActionCard } from './ActionCard'

type HealthCardProps = {
  title: string
  description: string
  status: 'ok' | 'degraded' | 'down' | 'unknown' | string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any
}

function readJsonFile<T>(relativePath: string): T | null {
  const filePath = path.join(process.cwd(), relativePath)
  if (!fs.existsSync(filePath)) return null

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
  } catch {
    return null
  }
}

function HealthCard({ title, description, status, details }: HealthCardProps) {
  const color =
    status === 'ok'
      ? 'bg-emerald-500'
      : status === 'degraded'
      ? 'bg-amber-500'
      : status === 'down'
      ? 'bg-red-500'
      : 'bg-slate-500'

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm shadow-slate-900/30 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
      </div>
      <p className="text-xs text-slate-400">{description}</p>
      {details && (
        <pre className="mt-2 text-[10px] whitespace-pre-wrap text-slate-400 bg-slate-950/50 rounded-md p-2 border border-slate-800/60">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default async function OpsDashboardPage() {
  const actions: OpsAction[] = loadActions().sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt)
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slo = readJsonFile<Record<string, any>>('slo/slo-summary.json') ?? {}
  const regression =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readJsonFile<Record<string, any>>('regressions/regression-report.json') ?? {
      status: 'ok'
    }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 p-6 space-y-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bookiji Ops Console</h1>
          <p className="text-sm text-slate-400">
            You are the human boss. AI is the 20-engineer team.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          Live sync between automation policy, AI actions, and your approvals.
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <HealthCard
          title="Booking SLO"
          description="End-to-end booking latency and error rate."
          status={slo?.booking?.status ?? 'unknown'}
          details={slo?.booking}
        />
        <HealthCard
          title="Webhooks"
          description="Stripe + vendor webhooks."
          status={slo?.webhooks?.status ?? 'unknown'}
          details={slo?.webhooks}
        />
        <HealthCard
          title="Overall regression status"
          description="Trend analysis from last runs."
          status={regression?.status ?? 'ok'}
          details={regression?.metrics ?? {}}
        />
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">AI Action Queue</h2>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 border border-slate-800/80">
            {actions.length} open
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Approve, reject, or snooze what the autonomous system wants to do.
        </p>

        <div className="space-y-2">
          {actions.length === 0 && (
            <p className="text-sm text-slate-500">
              No pending actions. The robots are calm. 🧘
            </p>
          )}

          {actions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      </section>
    </main>
  )
}
