'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

interface HashCopyProps {
  hash: string
  label?: string
  truncateLength?: number
}

export function HashCopy({ hash, label, truncateLength = 16 }: HashCopyProps) {
  const [copied, setCopied] = useState(false)

  const displayHash = truncateLength > 0 && hash.length > truncateLength
    ? `${hash.slice(0, truncateLength)}...`
    : hash

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm font-medium text-gray-600">{label}:</span>}
      <code className="flex-1 font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
        {displayHash}
      </code>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="h-8 w-8 p-0"
        title="Copier le hash complet"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}

