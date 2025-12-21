import { Badge } from '@/components/ui/badge'
import type { GovernanceVerdict } from '@/app/api/ops/controlplane/_lib/simcity-types'

interface VerdictBadgeProps {
  verdict: GovernanceVerdict
  size?: 'sm' | 'md' | 'lg'
}

export function VerdictBadge({ verdict, size = 'md' }: VerdictBadgeProps) {
  const config = {
    allow: {
      label: 'ALLOW',
      variant: 'default' as const,
      className: 'bg-green-500 hover:bg-green-600 text-white',
    },
    warn: {
      label: 'WARN',
      variant: 'default' as const,
      className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    },
    block: {
      label: 'BLOCK',
      variant: 'destructive' as const,
      className: 'bg-red-500 hover:bg-red-600 text-white',
    },
  }

  const { label, className } = config[verdict]
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-4 py-2' : 'text-sm px-3 py-1'

  return (
    <Badge variant="default" className={`${className} ${sizeClass} font-mono font-bold`}>
      {label}
    </Badge>
  )
}

