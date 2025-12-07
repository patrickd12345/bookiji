'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/admin/ops-ai', label: 'Overview' },
  { href: '/admin/ops-ai/agents/metrics', label: 'MetricsAI' },
  { href: '/admin/ops-ai/agents/health', label: 'HealthAI' },
  { href: '/admin/ops-ai/agents/slo', label: 'SLOAI' },
  { href: '/admin/ops-ai/agents/incidents', label: 'IncidentsAI' },
  { href: '/admin/ops-ai/agents/deploy', label: 'DeployAI' },
  { href: '/admin/ops-ai/agents/logs', label: 'LogsAI' },
  { href: '/admin/ops-ai/agents/regression', label: 'RegressionAI' },
  { href: '/admin/ops-ai/agents/anomaly', label: 'AnomalyAI' },
  { href: '/admin/ops-ai/events', label: 'Events' }
]

function Subnav() {
  const pathname = usePathname()
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              active
                ? 'bg-slate-900 border-slate-700 text-slate-50'
                : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-100'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}

export default function OpsAILayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">OpsAI Console</h1>
          <p className="text-slate-400">
            Real-time cockpit mirroring OpsAI Commander’s view of Bookiji.
          </p>
        </div>
        <Subnav />
      </header>
      {children}
    </div>
  )
}
