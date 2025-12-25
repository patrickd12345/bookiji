'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export type HealthStatus = 'certified' | 'running' | 'needs_attention' | 'unknown'

interface CertificationResult {
  status: 'pass' | 'fail'
  timestamp: string
  attacks_covered: string[]
  duration_seconds: number
}

interface SchedulingHealthBadgeProps {
  vendorId?: string
  className?: string
}

export default function SchedulingHealthBadge({ vendorId, className = '' }: SchedulingHealthBadgeProps) {
  const [status, setStatus] = useState<HealthStatus>('unknown')
  const [lastCertification, setLastCertification] = useState<CertificationResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!vendorId) return
    loadHealthStatus()
  }, [vendorId])

  const loadHealthStatus = async () => {
    try {
      const response = await fetch(`/api/vendor/scheduling-health?vendor_id=${vendorId}`)
      if (response.ok) {
        const data = await response.json()
        setStatus(data.status || 'unknown')
        setLastCertification(data.last_certification || null)
      }
    } catch (error) {
      console.error('Failed to load health status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'certified':
        return {
          label: 'Certified',
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: '✓'
        }
      case 'running':
        return {
          label: 'Running',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: '⟳'
        }
      case 'needs_attention':
        return {
          label: 'Needs Attention',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: '⚠'
        }
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: '?'
        }
    }
  }

  const config = getStatusConfig()

  if (isLoading) {
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full border text-sm ${className}`}>
        <span className="animate-pulse">Loading...</span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 ${className}`}>
      <div className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full border text-xs sm:text-sm font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        <span className="whitespace-nowrap">Status: {config.label}</span>
      </div>
      {lastCertification && (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          Last certified: {new Date(lastCertification.timestamp).toLocaleDateString()}
        </span>
      )}
      <Link
        href="/vendor/dashboard/certification"
        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 underline touch-manipulation"
      >
        Certify
      </Link>
    </div>
  )
}

