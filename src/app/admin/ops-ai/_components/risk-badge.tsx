import type { FusedRisk } from '../lib/ops-summary'

const COLORS: Record<FusedRisk, string> = {
  GREEN: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  YELLOW: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  ORANGE: 'bg-orange-500/20 text-orange-200 border-orange-500/40',
  RED: 'bg-red-500/20 text-red-200 border-red-500/40'
}

export function RiskBadge({ risk }: { risk: FusedRisk }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${COLORS[risk]}`}>
      {risk}
    </span>
  )
}
