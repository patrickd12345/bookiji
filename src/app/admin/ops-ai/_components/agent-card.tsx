import Link from 'next/link'

type AgentCardProps = {
  agentName: string
  label: string
  status?: string
  summaryLines?: string[]
  href: string
  badge?: React.ReactNode
}

export function AgentCard({ agentName, label, status, summaryLines = [], href, badge }: AgentCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 transition-colors p-4 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{agentName}</p>
          <p className="text-base font-semibold text-slate-50">{label}</p>
        </div>
        {badge || (
          <span className="text-xs text-slate-400 px-2 py-1 rounded-md border border-slate-800">
            {status ?? 'View'}
          </span>
        )}
      </div>
      {summaryLines.length > 0 && (
        <ul className="text-sm text-slate-300 space-y-1">
          {summaryLines.map((line, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-600" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  )
}
